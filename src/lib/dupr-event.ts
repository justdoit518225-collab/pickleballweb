import { randomInt } from "node:crypto";
import type { DuprEventSource, DuprEventStatus, Prisma } from "@/generated/prisma/client";
import {
  DuprUploadUnavailableError,
  submitDuprMatchBatch,
  type DuprMatchPayload,
} from "@/lib/dupr-api";
import { generateDuprSchedule, MAX_PLAYERS, MIN_PLAYERS } from "@/lib/dupr-schedule";
import { prisma } from "@/lib/prisma";
import { getTaipeiYmd } from "@/lib/venue-timezone";

export const DUPR_EVENT_STATUS_LABELS: Record<DuprEventStatus, string> = {
  DRAFT: "開放報名中",
  CHECK_IN: "報到進行中",
  SCHEDULED: "賽程進行中",
  FINALIZED: "已最終確認",
  SUBMITTED: "已匯入 DUPR",
};

export const DUPR_EVENT_SOURCE_LABELS: Record<DuprEventSource, string> = {
  MANUAL: "站內報名",
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
  capacity?: number;
  source: DuprEventSource;
  fitbookCourseId?: string | null;
  fitbookUrl?: string | null;
  courtCount: number;
  roster: RosterInput[];
}) {
  const capacity = Math.min(
    MAX_PLAYERS,
    Math.max(MIN_PLAYERS, input.capacity ?? Math.max(16, input.roster.length)),
  );
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
      capacity,
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

/** 前台顯示：開放報名／報到中／進行中的活動，以及近幾天已確認的活動 */
const DAY_MS = 24 * 60 * 60 * 1000;
const LIVE_OPEN_PAST_DAYS = 1;
const LIVE_SCHEDULED_DAYS = 7;
const LIVE_FINISHED_DAYS = 3;

function liveDuprEventWhere(tenantId: string): Prisma.DuprEventWhereInput {
  const now = Date.now();
  return {
    tenantId,
    OR: [
      {
        status: { in: ["DRAFT", "CHECK_IN"] },
        startAt: { gte: new Date(now - LIVE_OPEN_PAST_DAYS * DAY_MS) },
      },
      {
        status: "SCHEDULED",
        startAt: { gte: new Date(now - LIVE_SCHEDULED_DAYS * DAY_MS) },
      },
      {
        status: { in: ["FINALIZED", "SUBMITTED"] },
        startAt: { gte: new Date(now - LIVE_FINISHED_DAYS * DAY_MS) },
      },
    ],
  };
}

export async function countLiveDuprEvents(tenantId: string) {
  return prisma.duprEvent.count({ where: liveDuprEventWhere(tenantId) });
}

export async function listLiveDuprEvents(tenantId: string) {
  return prisma.duprEvent.findMany({
    where: liveDuprEventWhere(tenantId),
    orderBy: { startAt: "asc" },
    include: {
      _count: { select: { players: true, matches: true } },
      players: { select: { id: true, userId: true, checkedInAt: true } },
      matches: { select: { confirmedAt: true } },
    },
  });
}

/** 依台北日期分組：今天 → 之後（由近到遠）→ 之前（由近到遠） */
export async function listLiveDuprEventDays(tenantId: string) {
  const events = await listLiveDuprEvents(tenantId);
  const today = getTaipeiYmd(new Date());
  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const ymd = getTaipeiYmd(e.startAt);
    byDay.set(ymd, [...(byDay.get(ymd) ?? []), e]);
  }
  const rank = (ymd: string) => (ymd === today ? 0 : ymd > today ? 1 : 2);
  return [...byDay]
    .map(([ymd, dayEvents]) => ({ ymd, isToday: ymd === today, events: dayEvents }))
    .sort((a, b) => {
      const r = rank(a.ymd) - rank(b.ymd);
      if (r !== 0) return r;
      return rank(a.ymd) === 2 ? b.ymd.localeCompare(a.ymd) : a.ymd.localeCompare(b.ymd);
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

function canModifyRoster(status: DuprEventStatus) {
  return status === "DRAFT" || status === "CHECK_IN";
}

/** 球友登入後自行報名 DUPR 活動 */
export async function registerUserForDuprEvent(
  tenantId: string,
  eventId: string,
  userId: string,
  input?: { name?: string; duprId?: string | null },
) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (event.status !== "DRAFT") {
    throw new DuprEventError("此活動已開始報到或進行中，不再開放線上報名，請洽現場工作人員");
  }
  const existing = event.players.find((p) => p.userId === userId);
  if (existing) {
    throw new DuprEventError("你已經報名過此場 DUPR 活動");
  }
  if (event.players.length >= event.capacity) {
    throw new DuprEventError("本場活動報名名額已滿");
  }

  const [user, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, duprProfile: { select: { duprId: true } } },
    }),
    prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { nickname: true, isBanned: true },
    }),
  ]);
  if (!user) throw new DuprEventError("請先登入帳號");
  if (membership?.isBanned) throw new DuprEventError("你的俱樂部會員資格已被停權");

  if (!membership) {
    await prisma.tenantMembership.create({
      data: { tenantId, userId },
    });
  }

  const displayName =
    input?.name?.trim() ||
    membership?.nickname?.trim() ||
    user.name?.trim() ||
    user.email?.split("@")[0] ||
    "參賽球友";
  const duprId = normalizeDuprId(input?.duprId) ?? user.duprProfile?.duprId ?? null;
  const nextSeq = event.players.reduce((max, p) => Math.max(max, p.seq), 0) + 1;

  return prisma.duprEventPlayer.create({
    data: {
      eventId,
      seq: nextSeq,
      name: displayName,
      duprId,
      userId,
    },
  });
}

/** 球友於活動開始前取消自己的報名 */
export async function cancelUserDuprRegistration(
  tenantId: string,
  eventId: string,
  userId: string,
) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (event.status !== "DRAFT") {
    throw new DuprEventError("活動已開始報到或開賽，無法線上取消報名，請聯絡現場工作人員");
  }
  const player = event.players.find((p) => p.userId === userId);
  if (!player) throw new DuprEventError("找不到你的報名紀錄");
  await removeEventPlayer(tenantId, eventId, player.id);
}

/** 員工按下「開始活動」→ 進入報到程序（CHECK_IN） */
export async function startEventCheckIn(tenantId: string, eventId: string) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (event.status !== "DRAFT") {
    throw new DuprEventError("只有開放報名中的活動可以啟動報到程序");
  }
  await prisma.duprEvent.update({
    where: { id: eventId },
    data: { status: "CHECK_IN" },
  });
}

/** 員工退回「開放報名中（DRAFT）」 */
export async function revertCheckInToDraft(tenantId: string, eventId: string) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (event.status !== "CHECK_IN") {
    throw new DuprEventError("目前不在報到階段");
  }
  await prisma.duprEvent.update({
    where: { id: eventId },
    data: { status: "DRAFT" },
  });
}

/** 球友本人掃描現場 QR Code 或點擊自助報到 */
export async function checkInPlayerByUser(
  tenantId: string,
  eventId: string,
  userId: string,
) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (event.status !== "CHECK_IN") {
    throw new DuprEventError(
      event.status === "DRAFT"
        ? "工作人員尚未開始報到程序，請稍候"
        : "報到階段已結束",
    );
  }
  const player = event.players.find((p) => p.userId === userId);
  if (!player) {
    throw new DuprEventError("你尚未報名本場 DUPR 活動，請洽現場工作人員");
  }
  if (!player.checkedInAt) {
    await prisma.duprEventPlayer.update({
      where: { id: player.id },
      data: { checkedInAt: new Date() },
    });
  }
  return player;
}

/** 員工手動切換或掃描球友 QR Code 設定報到狀態 */
export async function setPlayerCheckInStatus(
  tenantId: string,
  eventId: string,
  playerId: string,
  checkedIn: boolean,
) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (!canModifyRoster(event.status)) {
    throw new DuprEventError("賽程已展開，無法變更報到狀態");
  }
  const player = event.players.find((p) => p.id === playerId);
  if (!player) throw new DuprEventError("找不到該名參賽球員");
  await prisma.duprEventPlayer.update({
    where: { id: player.id },
    data: { checkedInAt: checkedIn ? new Date() : null },
  });
  return player;
}

/** 員工一鍵將所有報名球員標記為已報到 */
export async function checkInAllPlayers(tenantId: string, eventId: string) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (!canModifyRoster(event.status)) {
    throw new DuprEventError("賽程已展開，無法變更報到狀態");
  }
  await prisma.duprEventPlayer.updateMany({
    where: { eventId, checkedInAt: null },
    data: { checkedInAt: new Date() },
  });
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
  if (!canModifyRoster(event.status)) throw new DuprEventError("已產生對戰表，請先退回報到／名單階段");
  if (event.players.length + roster.length > MAX_PLAYERS) {
    throw new DuprEventError(`名單最多 ${MAX_PLAYERS} 人`);
  }
  const memberDupr = await lookupMemberDupr(tenantId, roster.map((r) => r.name));
  const start = event.players.reduce((max, p) => Math.max(max, p.seq), 0);
  const autoCheckIn = event.status === "CHECK_IN" ? new Date() : null;
  await prisma.duprEventPlayer.createMany({
    data: roster.map((r, i) => {
      const linked = memberDupr.get(r.name.trim().toLowerCase());
      return {
        eventId,
        seq: start + i + 1,
        name: r.name.trim(),
        duprId: normalizeDuprId(r.duprId) ?? linked?.duprId ?? null,
        userId: linked?.userId ?? null,
        checkedInAt: autoCheckIn,
      };
    }),
  });
}

/** 移除球員後重新編號，維持 1..N 連續（對戰表以編號表示） */
export async function removeEventPlayer(tenantId: string, eventId: string, playerId: string) {
  const event = await loadEventOrThrow(tenantId, eventId);
  if (!canModifyRoster(event.status)) throw new DuprEventError("已產生對戰表，請先退回報到／名單階段");
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
  options: { courtCount: number; rounds?: number; onlyCheckedIn?: boolean },
) {
  const event = await loadEventOrThrow(tenantId, eventId);
  assertEditable(event.status);
  if (event.matches.some((m) => m.scoreA != null || m.scoreB != null)) {
    throw new DuprEventError("已有比賽填入分數，無法重新產生對戰表");
  }

  const checkedInPlayers = event.players.filter((p) => p.checkedInAt != null);
  const useOnlyCheckedIn =
    options.onlyCheckedIn ?? (event.status === "CHECK_IN" && checkedInPlayers.length > 0);

  const activePlayers = useOnlyCheckedIn ? checkedInPlayers : event.players;
  const n = activePlayers.length;
  if (n < MIN_PLAYERS) {
    throw new DuprEventError(
      useOnlyCheckedIn
        ? `已報到人數至少需要 ${MIN_PLAYERS} 位球員（目前 ${n} 人已報到）`
        : `至少需要 ${MIN_PLAYERS} 位球員（目前 ${n} 人）`,
    );
  }

  const schedule = generateDuprSchedule({
    playerCount: n,
    courtCount: options.courtCount,
    rounds: options.rounds,
  });

  await prisma.$transaction(async (tx) => {
    if (useOnlyCheckedIn && activePlayers.length < event.players.length) {
      const keepIds = new Set(activePlayers.map((p) => p.id));
      const dropIds = event.players.filter((p) => !keepIds.has(p.id)).map((p) => p.id);
      if (dropIds.length > 0) {
        await tx.duprEventPlayer.deleteMany({ where: { id: { in: dropIds } } });
      }
      for (const p of activePlayers) {
        await tx.duprEventPlayer.update({ where: { id: p.id }, data: { seq: -p.seq } });
      }
      for (const [i, p] of activePlayers.entries()) {
        await tx.duprEventPlayer.update({ where: { id: p.id }, data: { seq: i + 1 } });
      }
    } else if (!useOnlyCheckedIn) {
      await tx.duprEventPlayer.updateMany({
        where: { eventId, checkedInAt: null },
        data: { checkedInAt: new Date() },
      });
    }

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
    throw new DuprEventError("已有比賽填入分數，請先清除分數再退回報到階段");
  }
  await prisma.$transaction(async (tx) => {
    await tx.duprEventMatch.deleteMany({ where: { eventId } });
    await tx.duprEvent.update({ where: { id: eventId }, data: { status: "CHECK_IN" } });
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

/** 分數變更會清除既有確認，四人需重新確認；若由該場參賽球員本人送出，自動勾選本人確認 */
export async function saveMatchScore(
  eventId: string,
  matchId: string,
  scoreA: number,
  scoreB: number,
  options: { allowConfirmed?: boolean; autoConfirmSeq?: number | null } = {},
) {
  validateScore(scoreA, scoreB);
  const match = await loadMatchForScoring(eventId, matchId);
  if (match.confirmedAt && !options.allowConfirmed) {
    throw new DuprEventError("此場四人皆已確認，如需修改請聯絡負責人");
  }
  const seqs = matchPlayerSeqs(match);
  const autoSeq =
    options.autoConfirmSeq && seqs.includes(options.autoConfirmSeq)
      ? options.autoConfirmSeq
      : null;

  await prisma.$transaction(async (tx) => {
    if (match.scoreA !== scoreA || match.scoreB !== scoreB) {
      await tx.duprMatchConfirmation.deleteMany({ where: { matchId } });
      await tx.duprEventMatch.update({
        where: { id: matchId },
        data: { scoreA, scoreB, scoredAt: new Date(), confirmedAt: null },
      });
    }
    if (autoSeq != null) {
      await tx.duprMatchConfirmation.upsert({
        where: { matchId_playerSeq: { matchId, playerSeq: autoSeq } },
        create: { matchId, playerSeq: autoSeq },
        update: {},
      });
      const count = await tx.duprMatchConfirmation.count({
        where: { matchId, playerSeq: { in: seqs } },
      });
      if (count >= 4) {
        await tx.duprEventMatch.update({
          where: { id: matchId },
          data: { confirmedAt: new Date() },
        });
      }
    }
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
