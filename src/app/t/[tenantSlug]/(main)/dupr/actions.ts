"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROUTES } from "@/lib/constants";
import {
  cancelUserDuprRegistration,
  checkInAllPlayers,
  DuprEventError,
  generateEventSchedule,
  matchPlayerSeqs,
  registerUserForDuprEvent,
  revertCheckInToDraft,
  saveMatchScore,
  setMatchConfirmation,
  setPlayerCheckInStatus,
  startEventCheckIn,
} from "@/lib/dupr-event";
import { canScoreEvent, grantScoringAccess, isTenantStaffUser } from "@/lib/dupr-scoring-access";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";

export type ScoringResult = { ok: true } | { ok: false; error: string };

function withQuery(path: string, key: "error" | "saved", message: string) {
  return `${path}?${key}=${encodeURIComponent(message)}`;
}

async function loadEvent(tenantSlug: string, eventId: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return null;
  return prisma.duprEvent.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    select: { id: true, tenantId: true, scoringPin: true, status: true },
  });
}

function revalidateDuprPaths(tenantSlug: string, eventId: string) {
  revalidatePath(ROUTES.tenant(tenantSlug));
  revalidatePath(ROUTES.tenantDuprEvents(tenantSlug));
  revalidatePath(ROUTES.tenantDuprEvent(tenantSlug, eventId));
  revalidatePath(ROUTES.tenantAdminDuprEvents(tenantSlug));
  revalidatePath(ROUTES.tenantAdminDuprEvent(tenantSlug, eventId));
}

async function runFrontEventAction(
  tenantSlug: string,
  eventId: string,
  fn: (ctx: { tenantId: string }) => Promise<string>,
) {
  const pagePath = ROUTES.tenantDuprEvent(tenantSlug, eventId);
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) redirect(withQuery(pagePath, "error", "找不到此俱樂部"));
  let msg = "已更新";
  try {
    msg = await fn({ tenantId: tenant.id });
  } catch (e) {
    if (e instanceof DuprEventError) redirect(withQuery(pagePath, "error", e.message));
    throw e;
  }
  revalidateDuprPaths(tenantSlug, eventId);
  redirect(withQuery(pagePath, "saved", msg));
}

/** 球友登入後報名 DUPR 活動 */
export async function registerDuprAction(
  tenantSlug: string,
  eventId: string,
  formData: FormData,
) {
  const pagePath = ROUTES.tenantDuprEvent(tenantSlug, eventId);
  const session = await auth();
  if (!session?.user?.id) {
    redirect(ROUTES.loginWithCallback(pagePath));
  }
  await runFrontEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    const name = String(formData.get("name") ?? "").trim();
    const duprId = String(formData.get("duprId") ?? "").trim() || null;
    await registerUserForDuprEvent(tenantId, eventId, session.user.id, { name, duprId });
    return "已完成報名！活動開始時請於現場掃描 QR Code 報到";
  });
}

/** 球友取消報名 */
export async function cancelDuprRegistrationAction(tenantSlug: string, eventId: string) {
  const pagePath = ROUTES.tenantDuprEvent(tenantSlug, eventId);
  const session = await auth();
  if (!session?.user?.id) {
    redirect(ROUTES.loginWithCallback(pagePath));
  }
  await runFrontEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    await cancelUserDuprRegistration(tenantId, eventId, session.user.id);
    return "已取消你的報名";
  });
}

/** 有權限員工按下「開始活動」→ 進入報到程序 */
export async function staffStartDuprCheckInAction(tenantSlug: string, eventId: string) {
  await runFrontEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    if (!(await isTenantStaffUser(tenantId))) throw new DuprEventError("僅限俱樂部授權人員操作");
    await startEventCheckIn(tenantId, eventId);
    return "活動已開始！請讓參賽球友掃描現場 QR Code 進行報到";
  });
}

/** 有權限員工退回開放報名階段 */
export async function staffRevertCheckInAction(tenantSlug: string, eventId: string) {
  await runFrontEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    if (!(await isTenantStaffUser(tenantId))) throw new DuprEventError("僅限俱樂部授權人員操作");
    await revertCheckInToDraft(tenantId, eventId);
    return "已退回開放報名階段";
  });
}

/** 有權限員工切換單一球員報到狀態 */
export async function staffTogglePlayerCheckInAction(
  tenantSlug: string,
  eventId: string,
  playerId: string,
  checkedIn: boolean,
) {
  await runFrontEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    if (!(await isTenantStaffUser(tenantId))) throw new DuprEventError("僅限俱樂部授權人員操作");
    const p = await setPlayerCheckInStatus(tenantId, eventId, playerId, checkedIn);
    return checkedIn ? `已為 #${p.seq} ${p.name} 完成報到` : `已取消 #${p.seq} ${p.name} 的報到狀態`;
  });
}

/** 有權限員工將全體報名者一鍵標記為已報到 */
export async function staffCheckInAllAction(tenantSlug: string, eventId: string) {
  await runFrontEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    if (!(await isTenantStaffUser(tenantId))) throw new DuprEventError("僅限俱樂部授權人員操作");
    await checkInAllPlayers(tenantId, eventId);
    return "已將全部報名球員標記為已報到";
  });
}

/** 有權限員工按下「開始賽程」→ 展開當日 DUPR 賽程 */
export async function staffStartDuprScheduleAction(
  tenantSlug: string,
  eventId: string,
  formData: FormData,
) {
  await runFrontEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    if (!(await isTenantStaffUser(tenantId))) throw new DuprEventError("僅限俱樂部授權人員操作");
    const courtCountRaw = Number(String(formData.get("courtCount") ?? "1").trim());
    const courtCount = Number.isFinite(courtCountRaw) && courtCountRaw > 0 ? Math.floor(courtCountRaw) : 1;
    const roundsRaw = String(formData.get("rounds") ?? "").trim();
    const roundsNum = Number(roundsRaw);
    const rounds = roundsRaw && Number.isFinite(roundsNum) && roundsNum > 0 ? Math.floor(roundsNum) : undefined;
    const rosterScope = String(formData.get("rosterScope") ?? "checkedIn");
    const onlyCheckedIn = rosterScope !== "all";

    await generateEventSchedule(tenantId, eventId, {
      courtCount,
      rounds,
      onlyCheckedIn,
    });
    return "今日 DUPR 賽程已展開！參賽人員可查看自己的場次並於賽後輸入比分";
  });
}

export async function enterScoringPin(
  tenantSlug: string,
  eventId: string,
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const pin = String(formData.get("pin") ?? "").trim();
  const event = await loadEvent(tenantSlug, eventId);
  if (!event) return "找不到此活動";
  if (pin !== event.scoringPin) {
    await new Promise((r) => setTimeout(r, 800));
    return "現場碼錯誤，請向負責人確認";
  }
  await grantScoringAccess(event.id, event.scoringPin);
  revalidatePath(ROUTES.tenantDuprEvent(tenantSlug, eventId));
  return null;
}

/** 檢查當前使用者是否為該場次參賽球員或俱樂部授權人員 */
async function resolveMatchScoringActor(
  event: { id: string; tenantId: string; scoringPin: string },
  matchId: string,
): Promise<{ allowed: boolean; myPlayerSeq: number | null; isStaffOrPin: boolean }> {
  const isStaffOrPin = await canScoreEvent(event);
  const session = await auth();
  const userId = session?.user?.id;

  let myPlayerSeq: number | null = null;
  if (userId) {
    const player = await prisma.duprEventPlayer.findFirst({
      where: { eventId: event.id, userId },
      select: { seq: true },
    });
    myPlayerSeq = player?.seq ?? null;
  }

  if (isStaffOrPin) {
    return { allowed: true, myPlayerSeq, isStaffOrPin: true };
  }

  if (myPlayerSeq == null) {
    return { allowed: false, myPlayerSeq: null, isStaffOrPin: false };
  }

  const match = await prisma.duprEventMatch.findFirst({
    where: { id: matchId, eventId: event.id },
    select: { teamA1: true, teamA2: true, teamB1: true, teamB2: true },
  });
  if (!match) {
    return { allowed: false, myPlayerSeq, isStaffOrPin: false };
  }

  const inMatch = matchPlayerSeqs(match).includes(myPlayerSeq);
  return { allowed: inMatch, myPlayerSeq, isStaffOrPin: false };
}

export async function submitMatchScore(
  tenantSlug: string,
  eventId: string,
  matchId: string,
  scoreA: number,
  scoreB: number,
): Promise<ScoringResult> {
  const event = await loadEvent(tenantSlug, eventId);
  if (!event) return { ok: false, error: "找不到此活動" };
  const actor = await resolveMatchScoringActor(event, matchId);
  if (!actor.allowed) {
    return { ok: false, error: "僅限本場次的參賽球員或工作人員可輸入比分" };
  }
  try {
    await saveMatchScore(eventId, matchId, scoreA, scoreB, {
      autoConfirmSeq: actor.myPlayerSeq,
    });
  } catch (e) {
    if (e instanceof DuprEventError) return { ok: false, error: e.message };
    throw e;
  }
  revalidateDuprPaths(tenantSlug, eventId);
  return { ok: true };
}

export async function setPlayerConfirmation(
  tenantSlug: string,
  eventId: string,
  matchId: string,
  playerSeq: number,
  confirmed: boolean,
): Promise<ScoringResult> {
  const event = await loadEvent(tenantSlug, eventId);
  if (!event) return { ok: false, error: "找不到此活動" };
  const actor = await resolveMatchScoringActor(event, matchId);
  if (!actor.allowed) {
    return { ok: false, error: "僅限本場次的參賽球員或工作人員可確認比分" };
  }
  try {
    await setMatchConfirmation(eventId, matchId, playerSeq, confirmed);
  } catch (e) {
    if (e instanceof DuprEventError) return { ok: false, error: e.message };
    throw e;
  }
  revalidateDuprPaths(tenantSlug, eventId);
  return { ok: true };
}
