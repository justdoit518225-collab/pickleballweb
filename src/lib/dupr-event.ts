import { randomInt } from "node:crypto";
import type { DuprEventSource, DuprEventStatus } from "@/generated/prisma/client";
import {
  DuprUploadUnavailableError,
  submitDuprMatchBatch,
  type DuprMatchPayload,
} from "@/lib/dupr-api";
import { generateDuprSchedule, MAX_PLAYERS, MIN_PLAYERS } from "@/lib/dupr-schedule";
import { prisma } from "@/lib/prisma";
import { getTaipeiYmd } from "@/lib/venue-timezone";

export const DUPR_EVENT_STATUS_LABELS: Record<DuprEventStatus, string> = {
  DRAFT: "名單編輯中",
  SCHEDULED: "比賽進行中",
  FINALIZED: "已最終確認",
  SUBMITTED: "已匯入 DUPR",
};

export const DUPR_EVENT_SOURCE_LABELS: Record<DuprEventSource, string> = {
  MANUAL: "手動名單",
  FITBOOK: "FitBook",
  FITBOOK_MOCK: "FitBook（模擬名單）",
};

export class DuprEventError extends Error {}

export type RosterInput = { name: string; duprId?: string | null };

export function normalizeDuprId(value: string | null | undefined): string | null {
  const v = value?.trim().toUpperCase().replace(/\s+/g, "");
  return v ? v : null;
}

/** 每行一位：「名字」或「名字, DUPR ID」；行首編號（1. / 1、/ 01）會被忽略 */
export function parseRosterText(text: string): RosterInput[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d{1,3}\s*[.、)）:：\-]?\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const [name, dupr] = line.split(/\s*[,，\t｜|]\s*/);
      return { name: name.trim(), duprId: normalizeDuprId(dupr) };
    })
    .filter((r) => r.name);
}

function generatePin(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

/** 依俱樂部會員的暱稱／名稱比對已連結 DUPR 的帳號，自動帶入 DUPR ID */
async function lookupMemberDupr(tenantId: string, names: string[]) {
  const wanted = new Set(names.map((n) => n.trim().toLowerCase()));
  if (wanted.size === 0) return new Map<string, { userId: string; duprId: string }>();
  const members = await prisma.tenantMembership.findMany({
    where: { tenantId, isBanned: false, user: { duprProfile: { duprId: { not: null } } } },
    select: {
      nickname: true,
      user: { select: { id: true, name: true, duprProfile: { select: { duprId: true } } } },
    },
  });
  const map = new Map<string, { userId: string; duprId: string }>();
  for (const m of members) {
    const duprId = m.user.duprProfile?.duprId;
    if (!duprId) continue;
    for (const label of [m.nickname, m.user.name]) {
      const key = label?.trim().toLowerCase();
      if (key && wanted.has(key) && !map.has(key)) {
        map.set(key, { userId: m.user.id, duprId });
      }
    }
  }
  return map;
}

export async function createDuprEvent(input: {
  tenantId: string;
  createdById: string;
  title: string;
  startAt: Date;
  endAt?: Date | null;
  location?: string | null;
  source: DuprEventSource;
  fitbookCourseId?: string | null;
  fitbookUrl?: string | null;
  courtCount: number;
  roster: RosterInput[];
}) {
  if (input.roster.length > MAX_PLAYERS) {
    throw new DuprEventError(`名單最多 ${MAX_PLAYERS} 人`);
  }
  const memberDupr = await lookupMemberDupr(
    input.tenantId,
    input.roster.map((r) => r.name),
  );

  return prisma.duprEvent.create({
    data: {
      tenantId: input.tenantId,
      createdById: input.createdById,
      title: input.title,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      location: input.location ?? null,
      source: input.source,
      fitbookCourseId: input.fitbookCourseId ?? null,
      fitbookUrl: input.fitbookUrl ?? null,
      courtCount: Math.max(1, input.courtCount),
      scoringPin: generatePin(),
      players: {
        create: input.roster.map((r, i) => {
          const linked = memberDupr.get(r.name.trim().toLowerCase());
          return {
            seq: i + 1,
            name: r.name.trim(),
            fitbookName: input.source === "MANUAL" ? null : r.name.trim(),
            duprId: normalizeDuprId(r.duprId) ?? linked?.duprId ?? null,
            userId: linked?.userId ?? null,
          };
        }),
      },
    },
  });
}

export async function getTenantDuprEvent(tenantId: string, eventId: string) {
  return prisma.duprEvent.findFirst({
    where: { id: eventId, tenantId },
    include: {
      players: { orderBy: { seq: "asc" } },
      matches: {
        orderBy: { seq: "asc" },
        include: { confirmations: { select: { playerSeq: true, confirmedAt: true } } },
      },
    },
  });
}

export type DuprEventDetail = NonNullable<Awaited<ReturnType<typeof getTenantDuprEvent>>>;

/** 平板入口：進行中的活動，以及近幾天已確認的活動 */
export async function listLiveDuprEvents(tenantId: string, recentDays = 3) {
  const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);
  return prisma.duprEvent.findMany({
    where: {
      tenantId,
      OR: [
        { status: "SCHEDULED" },
        { status: { in: ["FINALIZED", "SUBMITTED"] }, startAt: { gte: since } },
      ],
    },
    orderBy: { startAt: "asc" },
    include: {
      _count: { select: { players: true, matches: true } },
      matches: { select: { confirmedAt: true } },
    },
  });
}

async function loadEventOrThrow(tenantId: string, eventId: string) {
  const event = await getTenantDuprEvent(tenantId, eventId);
  if (!event) throw new DuprEventError("找不到此 DUPR 活動");
  return event;
}

function assertEditable(status: DuprEventStatus) {
  if (status === "FINALIZED" || status === "SUBMITTED") {
    throw new DuprEventError("活動已最終確認，請先退回再修改");
  }
}

export async function updateEventRoster(
  tenantId: string,
  eventId: string,
  updates: { id: string; name: string; duprId: string | null }[],
) {
  const event = await loadEventOrThrow(tenantId, eventId);
  assertEditable(event.status);
  const ids = new Set(event.players.map((p) => p.id));
  for (const u of updates) {
    if (!ids.has(u.id)) continue;
    if (!u.name.trim()) throw new DuprEventError("球員名稱不可空白");
  }
  await prisma.$transaction(async (tx) => {
    for (const u of updates) {
      if (!ids.has(u.id)) continue;
      await tx.duprEventPlayer.update({
        where: { id: u.id },
        data: { name: u.name.trim(), duprId: normalizeDuprId(u.duprId) },
      });
    }
  });
}

export async function addEventPlayers(tenantId: string, eventId: string, roster: RosterInput[]) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (event.status !== "DRAFT") throw new DuprEventError("已產生對戰表，請先退回名單編輯");
  if (event.players.length + roster.length > MAX_PLAYERS) {
    throw new DuprEventError(`名單最多 ${MAX_PLAYERS} 人`);
  }
  const memberDupr = await lookupMemberDupr(tenantId, roster.map((r) => r.name));
  const start = event.players.reduce((max, p) => Math.max(max, p.seq), 0);
  await prisma.duprEventPlayer.createMany({
    data: roster.map((r, i) => {
      const linked = memberDupr.get(r.name.trim().toLowerCase());
      return {
        eventId,
        seq: start + i + 1,
        name: r.name.trim(),
        duprId: normalizeDuprId(r.duprId) ?? linked?.duprId ?? null,
        userId: linked?.userId ?? null,
      };
    }),
  });
}

/** 移除球員後重新編號，維持 1..N 連續（對戰表以編號表示） */
export async function removeEventPlayer(tenantId: string, eventId: string, playerId: string) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (event.status !== "DRAFT") throw new DuprEventError("已產生對戰表，請先退回名單編輯");
  const remaining = event.players.filter((p) => p.id !== playerId);
  if (remaining.length === event.players.length) return;
  await prisma.$transaction(async (tx) => {
    await tx.duprEventPlayer.delete({ where: { id: playerId } });
    for (const p of remaining) {
      await tx.duprEventPlayer.update({ where: { id: p.id }, data: { seq: -p.seq } });
    }
    for (const [i, p] of remaining.entries()) {
      await tx.duprEventPlayer.update({ where: { id: p.id }, data: { seq: i + 1 } });
    }
  });
}

export async function generateEventSchedule(
  tenantId: string,
  eventId: string,
  options: { courtCount: number; rounds?: number },
) {
  const event = await loadEventOrThrow(tenantId, eventId);
  assertEditable(event.status);
  if (event.matches.some((m) => m.scoreA != null || m.scoreB != null)) {
    throw new DuprEventError("已有比賽填入分數，無法重新產生對戰表");
  }
  const n = event.players.length;
  if (n < MIN_PLAYERS) throw new DuprEventError(`至少需要 ${MIN_PLAYERS} 位球員`);

  const schedule = generateDuprSchedule({
    playerCount: n,
    courtCount: options.courtCount,
    rounds: options.rounds,
  });

  await prisma.$transaction(async (tx) => {
    await tx.duprEventMatch.deleteMany({ where: { eventId } });
    await tx.duprEventMatch.createMany({
      data: schedule.map((m, i) => ({
        eventId,
        seq: i + 1,
        round: m.round,
        court: m.court,
        teamA1: m.teamA[0] + 1,
        teamA2: m.teamA[1] + 1,
        teamB1: m.teamB[0] + 1,
        teamB2: m.teamB[1] + 1,
        resting: m.resting.map((r) => r + 1),
      })),
    });
    await tx.duprEvent.update({
      where: { id: eventId },
      data: { status: "SCHEDULED", courtCount: Math.max(1, options.courtCount) },
    });
  });
}

export async function resetEventToDraft(tenantId: string, eventId: string) {
  const event = await loadEventOrThrow(tenantId, eventId);
  assertEditable(event.status);
  if (event.matches.some((m) => m.scoreA != null || m.scoreB != null)) {
    throw new DuprEventError("已有比賽填入分數，請先清除分數再退回名單編輯");
  }
  await prisma.$transaction(async (tx) => {
    await tx.duprEventMatch.deleteMany({ where: { eventId } });
    await tx.duprEvent.update({ where: { id: eventId }, data: { status: "DRAFT" } });
  });
}

export function matchPlayerSeqs(m: { teamA1: number; teamA2: number; teamB1: number; teamB2: number }) {
  return [m.teamA1, m.teamA2, m.teamB1, m.teamB2];
}

export function validateScore(scoreA: number, scoreB: number) {
  for (const s of [scoreA, scoreB]) {
    if (!Number.isInteger(s) || s < 0 || s > 99) throw new DuprEventError("分數需為 0～99 的整數");
  }
  if (scoreA === scoreB) throw new DuprEventError("DUPR 比賽不可平手");
}

async function loadMatchForScoring(eventId: string, matchId: string) {
  const match = await prisma.duprEventMatch.findFirst({
    where: { id: matchId, eventId },
    include: { event: { select: { status: true } }, confirmations: true },
  });
  if (!match) throw new DuprEventError("找不到此場比賽");
  if (match.event.status !== "SCHEDULED") throw new DuprEventError("活動目前不開放計分");
  return match;
}

/** 分數變更會清除既有確認，四人需重新確認 */
export async function saveMatchScore(
  eventId: string,
  matchId: string,
  scoreA: number,
  scoreB: number,
  options: { allowConfirmed?: boolean } = {},
) {
  validateScore(scoreA, scoreB);
  const match = await loadMatchForScoring(eventId, matchId);
  if (match.confirmedAt && !options.allowConfirmed) {
    throw new DuprEventError("此場四人皆已確認，如需修改請聯絡負責人");
  }
  if (match.scoreA === scoreA && match.scoreB === scoreB) return;
  await prisma.$transaction(async (tx) => {
    await tx.duprMatchConfirmation.deleteMany({ where: { matchId } });
    await tx.duprEventMatch.update({
      where: { id: matchId },
      data: { scoreA, scoreB, scoredAt: new Date(), confirmedAt: null },
    });
  });
}

export async function clearMatchScore(eventId: string, matchId: string) {
  await loadMatchForScoring(eventId, matchId);
  await prisma.$transaction(async (tx) => {
    await tx.duprMatchConfirmation.deleteMany({ where: { matchId } });
    await tx.duprEventMatch.update({
      where: { id: matchId },
      data: { scoreA: null, scoreB: null, scoredAt: null, confirmedAt: null },
    });
  });
}

export async function setMatchConfirmation(
  eventId: string,
  matchId: string,
  playerSeq: number,
  confirmed: boolean,
) {
  const match = await loadMatchForScoring(eventId, matchId);
  if (match.scoreA == null || match.scoreB == null) throw new DuprEventError("請先填入分數");
  const seqs = matchPlayerSeqs(match);
  if (!seqs.includes(playerSeq)) throw new DuprEventError("此球員不在這場比賽");

  if (!confirmed) {
    if (match.confirmedAt) throw new DuprEventError("此場四人皆已確認，如需修改請聯絡負責人");
    await prisma.duprMatchConfirmation.deleteMany({ where: { matchId, playerSeq } });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.duprMatchConfirmation.upsert({
      where: { matchId_playerSeq: { matchId, playerSeq } },
      create: { matchId, playerSeq },
      update: {},
    });
    const count = await tx.duprMatchConfirmation.count({
      where: { matchId, playerSeq: { in: seqs } },
    });
    if (count >= 4) {
      await tx.duprEventMatch.update({ where: { id: matchId }, data: { confirmedAt: new Date() } });
    }
  });
}

export async function reopenMatch(eventId: string, matchId: string) {
  await loadMatchForScoring(eventId, matchId);
  await prisma.$transaction(async (tx) => {
    await tx.duprMatchConfirmation.deleteMany({ where: { matchId } });
    await tx.duprEventMatch.update({ where: { id: matchId }, data: { confirmedAt: null } });
  });
}

export type FinalizeCheck = {
  scored: number;
  confirmed: number;
  unscored: number;
  pendingConfirmation: number[];
  missingDupr: { seq: number; name: string }[];
};

export function checkFinalizeReadiness(event: DuprEventDetail): FinalizeCheck {
  const scored = event.matches.filter((m) => m.scoreA != null && m.scoreB != null);
  const pendingConfirmation = scored.filter((m) => !m.confirmedAt).map((m) => m.seq);
  const involved = new Set(scored.flatMap(matchPlayerSeqs));
  const missingDupr = event.players
    .filter((p) => involved.has(p.seq) && !p.duprId)
    .map((p) => ({ seq: p.seq, name: p.name }));
  return {
    scored: scored.length,
    confirmed: scored.length - pendingConfirmation.length,
    unscored: event.matches.length - scored.length,
    pendingConfirmation,
    missingDupr,
  };
}

export function buildDuprPayload(event: DuprEventDetail): DuprMatchPayload[] {
  const bySeq = new Map(event.players.map((p) => [p.seq, p]));
  const dupr = (seq: number) => bySeq.get(seq)?.duprId ?? "";
  const matchDate = getTaipeiYmd(event.startAt);
  return event.matches
    .filter((m) => m.scoreA != null && m.scoreB != null && m.confirmedAt)
    .map((m) => ({
      identifier: `ppp-${event.id}-${m.seq}`,
      matchSource: "CLUB" as const,
      format: "DOUBLES" as const,
      event: event.title,
      location: event.location,
      matchDate,
      teamA: { player1: dupr(m.teamA1), player2: dupr(m.teamA2), game1: m.scoreA! },
      teamB: { player1: dupr(m.teamB1), player2: dupr(m.teamB2), game1: m.scoreB! },
    }));
}

export async function submitEventToDupr(tenantId: string, eventId: string) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (event.status !== "FINALIZED") throw new DuprEventError("請先由負責人最終確認");
  const payload = buildDuprPayload(event);
  try {
    await submitDuprMatchBatch(payload);
    await prisma.duprEvent.update({
      where: { id: eventId },
      data: { status: "SUBMITTED", submittedAt: new Date(), submitError: null, submitPayload: payload },
    });
    return { submitted: true as const, count: payload.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : "DUPR 上傳失敗";
    await prisma.duprEvent.update({
      where: { id: eventId },
      data: { submitError: message, submitPayload: payload },
    });
    return {
      submitted: false as const,
      pendingApi: e instanceof DuprUploadUnavailableError,
      message,
    };
  }
}

export async function finalizeEvent(tenantId: string, eventId: string, userId: string) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (event.status !== "SCHEDULED") throw new DuprEventError("只有比賽進行中的活動可以最終確認");
  const check = checkFinalizeReadiness(event);
  if (check.scored === 0) throw new DuprEventError("尚無任何已填分的比賽");
  if (check.pendingConfirmation.length > 0) {
    throw new DuprEventError(
      `第 ${check.pendingConfirmation.join("、")} 場尚未四人確認`,
    );
  }
  if (check.missingDupr.length > 0) {
    throw new DuprEventError(
      `以下球員缺少 DUPR ID：${check.missingDupr.map((p) => `#${p.seq} ${p.name}`).join("、")}`,
    );
  }
  await prisma.duprEvent.update({
    where: { id: eventId },
    data: { status: "FINALIZED", finalizedAt: new Date(), finalizedById: userId },
  });
  return submitEventToDupr(tenantId, eventId);
}

export async function reopenEvent(tenantId: string, eventId: string) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (event.status !== "FINALIZED") throw new DuprEventError("只有已最終確認、尚未匯入 DUPR 的活動可以退回");
  await prisma.duprEvent.update({
    where: { id: eventId },
    data: { status: "SCHEDULED", finalizedAt: null, finalizedById: null },
  });
}

export async function regenerateScoringPin(tenantId: string, eventId: string) {
  await loadEventOrThrow(tenantId, eventId);
  await prisma.duprEvent.update({ where: { id: eventId }, data: { scoringPin: generatePin() } });
}

function csvCell(value: string | number | null | undefined) {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** DUPR 批次匯入用 CSV（每列一場雙打，只含四人確認的比賽） */
export function buildDuprCsv(event: DuprEventDetail): string {
  const bySeq = new Map(event.players.map((p) => [p.seq, p]));
  const header = [
    "matchType", "event", "date", "location",
    "teamA_player1", "teamA_player1_duprId", "teamA_player2", "teamA_player2_duprId",
    "teamB_player1", "teamB_player1_duprId", "teamB_player2", "teamB_player2_duprId",
    "teamA_game1", "teamB_game1",
  ];
  const date = getTaipeiYmd(event.startAt);
  const rows = event.matches
    .filter((m) => m.scoreA != null && m.scoreB != null && m.confirmedAt)
    .map((m) => {
      const p = (seq: number) => [bySeq.get(seq)?.name ?? "", bySeq.get(seq)?.duprId ?? ""];
      return [
        "DOUBLES", event.title, date, event.location ?? "",
        ...p(m.teamA1), ...p(m.teamA2), ...p(m.teamB1), ...p(m.teamB2),
        m.scoreA, m.scoreB,
      ];
    });
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}
