"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantStaff } from "@/lib/authz";
import { ROUTES } from "@/lib/constants";
import {
  addEventPlayers,
  clearMatchScore,
  createDuprEvent,
  DuprEventError,
  finalizeEvent,
  generateEventSchedule,
  parseRosterText,
  regenerateScoringPin,
  removeEventPlayer,
  reopenEvent,
  reopenMatch,
  resetEventToDraft,
  saveMatchScore,
  submitEventToDupr,
  updateEventRoster,
} from "@/lib/dupr-event";
import {
  findFitbookCourse,
  fitbookScheduleUrl,
  getFitbookStore,
  isValidYmd,
  mockFitbookRoster,
} from "@/lib/fitbook";
import { prisma } from "@/lib/prisma";

function withQuery(path: string, key: "error" | "saved", message: string) {
  return `${path}?${key}=${encodeURIComponent(message)}`;
}

function intField(formData: FormData, name: string, fallback: number) {
  const n = Number(String(formData.get(name) ?? "").trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

async function runEventAction(
  tenantSlug: string,
  eventId: string,
  fn: (ctx: { tenantId: string; userId: string }) => Promise<string | void>,
) {
  const { tenant, session } = await requireTenantStaff(tenantSlug);
  const back = ROUTES.tenantAdminDuprEvent(tenantSlug, eventId);
  let message: string | void;
  try {
    message = await fn({ tenantId: tenant.id, userId: session.user.id });
  } catch (e) {
    if (e instanceof DuprEventError) redirect(withQuery(back, "error", e.message));
    throw e;
  }
  revalidatePath(back);
  revalidatePath(ROUTES.tenantDuprEvent(tenantSlug, eventId));
  redirect(withQuery(back, "saved", message || "已儲存"));
}

export async function createDuprEventFromFitbook(tenantSlug: string, formData: FormData) {
  const { tenant, session } = await requireTenantStaff(tenantSlug);
  const date = String(formData.get("date") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const listPath = ROUTES.tenantAdminDuprEvents(tenantSlug, date);
  const store = getFitbookStore(tenantSlug);
  if (!store) redirect(withQuery(ROUTES.tenantAdminDuprEvents(tenantSlug), "error", "此俱樂部尚未設定 FitBook"));
  if (!isValidYmd(date) || !courseId) redirect(withQuery(listPath, "error", "請選擇 FitBook 場次"));

  let course: Awaited<ReturnType<typeof findFitbookCourse>> = null;
  try {
    course = await findFitbookCourse(store, date, courseId);
  } catch {
    redirect(withQuery(listPath, "error", "無法連線 FitBook，請稍後再試"));
  }
  if (!course) redirect(withQuery(listPath, "error", "FitBook 找不到此場次"));

  const roster = mockFitbookRoster(course.courseId, course.reservationCount);
  const event = await createDuprEvent({
    tenantId: tenant.id,
    createdById: session.user.id,
    title: `DUPR｜${course.name}`,
    startAt: course.startAt,
    endAt: course.endAt,
    location: course.location,
    source: "FITBOOK_MOCK",
    fitbookCourseId: course.courseId,
    fitbookUrl: fitbookScheduleUrl(store, date),
    courtCount: intField(formData, "courtCount", Math.max(1, Math.floor(roster.length / 6))),
    roster,
  });

  revalidatePath(ROUTES.tenantAdminDuprEvents(tenantSlug));
  redirect(
    withQuery(
      ROUTES.tenantAdminDuprEvent(tenantSlug, event.id),
      "saved",
      `已從 FitBook 匯入 ${roster.length} 位報名者（模擬名單）`,
    ),
  );
}

export async function createDuprEventManual(tenantSlug: string, formData: FormData) {
  const { tenant, session } = await requireTenantStaff(tenantSlug);
  const listPath = ROUTES.tenantAdminDuprEvents(tenantSlug);
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "") || "19:00";
  const endTime = String(formData.get("endTime") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;
  const roster = parseRosterText(String(formData.get("roster") ?? ""));

  if (!title) redirect(withQuery(listPath, "error", "請填寫活動名稱"));
  if (!isValidYmd(date)) redirect(withQuery(listPath, "error", "請選擇日期"));

  const startAt = new Date(`${date}T${startTime}:00+08:00`);
  const endAt = endTime ? new Date(`${date}T${endTime}:00+08:00`) : null;
  if (Number.isNaN(startAt.getTime())) redirect(withQuery(listPath, "error", "開始時間格式錯誤"));

  let eventId: string;
  try {
    const event = await createDuprEvent({
      tenantId: tenant.id,
      createdById: session.user.id,
      title,
      startAt,
      endAt: endAt && !Number.isNaN(endAt.getTime()) ? endAt : null,
      location,
      source: "MANUAL",
      courtCount: intField(formData, "courtCount", 1),
      roster,
    });
    eventId = event.id;
  } catch (e) {
    if (e instanceof DuprEventError) redirect(withQuery(listPath, "error", e.message));
    throw e;
  }

  revalidatePath(listPath);
  redirect(withQuery(ROUTES.tenantAdminDuprEvent(tenantSlug, eventId), "saved", "已建立活動"));
}

export async function updateDuprEventInfo(tenantSlug: string, eventId: string, formData: FormData) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    const title = String(formData.get("title") ?? "").trim();
    const location = String(formData.get("location") ?? "").trim() || null;
    if (!title) throw new DuprEventError("請填寫活動名稱");
    const { count } = await prisma.duprEvent.updateMany({
      where: { id: eventId, tenantId },
      data: { title, location },
    });
    if (count === 0) throw new DuprEventError("找不到此 DUPR 活動");
    return "已更新活動資訊";
  });
}

export async function saveDuprEventRoster(tenantSlug: string, eventId: string, formData: FormData) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    const ids = formData.getAll("playerId").map(String);
    const names = formData.getAll("name").map(String);
    const duprIds = formData.getAll("duprId").map(String);
    await updateEventRoster(
      tenantId,
      eventId,
      ids.map((id, i) => ({ id, name: names[i] ?? "", duprId: duprIds[i] ?? null })),
    );
    return "已儲存名單";
  });
}

export async function addDuprEventPlayers(tenantSlug: string, eventId: string, formData: FormData) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    const roster = parseRosterText(String(formData.get("roster") ?? ""));
    if (roster.length === 0) throw new DuprEventError("請輸入至少一位球員");
    await addEventPlayers(tenantId, eventId, roster);
    return `已新增 ${roster.length} 位球員`;
  });
}

export async function removeDuprEventPlayer(tenantSlug: string, eventId: string, playerId: string) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    await removeEventPlayer(tenantId, eventId, playerId);
    return "已移除球員";
  });
}

export async function generateDuprEventSchedule(
  tenantSlug: string,
  eventId: string,
  formData: FormData,
) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    const roundsRaw = String(formData.get("rounds") ?? "").trim();
    await generateEventSchedule(tenantId, eventId, {
      courtCount: intField(formData, "courtCount", 1),
      rounds: roundsRaw ? intField(formData, "rounds", 1) : undefined,
    });
    return "已產生對戰表，可開始比賽";
  });
}

export async function resetDuprEventToDraft(tenantSlug: string, eventId: string) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    await resetEventToDraft(tenantId, eventId);
    return "已退回名單編輯，對戰表已清除";
  });
}

export async function regenerateDuprScoringPin(tenantSlug: string, eventId: string) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    await regenerateScoringPin(tenantId, eventId);
    return "已更換現場碼，平板需重新輸入";
  });
}

async function assertEventInTenant(tenantId: string, eventId: string) {
  const event = await prisma.duprEvent.findFirst({ where: { id: eventId, tenantId }, select: { id: true } });
  if (!event) throw new DuprEventError("找不到此 DUPR 活動");
}

export async function adminSaveMatchScore(tenantSlug: string, eventId: string, formData: FormData) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    await assertEventInTenant(tenantId, eventId);
    const matchId = String(formData.get("matchId") ?? "");
    const scoreA = Number(String(formData.get("scoreA") ?? "").trim());
    const scoreB = Number(String(formData.get("scoreB") ?? "").trim());
    await saveMatchScore(eventId, matchId, scoreA, scoreB, { allowConfirmed: true });
    return "已更新分數，四人需重新確認";
  });
}

export async function adminClearMatchScore(tenantSlug: string, eventId: string, matchId: string) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    await assertEventInTenant(tenantId, eventId);
    await clearMatchScore(eventId, matchId);
    return "已清除分數";
  });
}

export async function adminReopenMatch(tenantSlug: string, eventId: string, matchId: string) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    await assertEventInTenant(tenantId, eventId);
    await reopenMatch(eventId, matchId);
    return "已解除確認，四人需重新確認";
  });
}

export async function finalizeDuprEvent(tenantSlug: string, eventId: string) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId, userId }) => {
    const result = await finalizeEvent(tenantId, eventId, userId);
    if (result.submitted) return `已最終確認並匯入 DUPR（${result.count} 場）`;
    return `已最終確認。${result.message}`;
  });
}

export async function retrySubmitDuprEvent(tenantSlug: string, eventId: string) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    const result = await submitEventToDupr(tenantId, eventId);
    if (result.submitted) return `已匯入 DUPR（${result.count} 場）`;
    throw new DuprEventError(result.message);
  });
}

export async function reopenDuprEvent(tenantSlug: string, eventId: string) {
  await runEventAction(tenantSlug, eventId, async ({ tenantId }) => {
    await reopenEvent(tenantId, eventId);
    return "已退回比賽進行中，可再修改分數";
  });
}

export async function deleteDuprEvent(tenantSlug: string, eventId: string) {
  const { tenant } = await requireTenantStaff(tenantSlug);
  const event = await prisma.duprEvent.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    select: { status: true },
  });
  if (event?.status === "SUBMITTED") {
    redirect(withQuery(ROUTES.tenantAdminDuprEvent(tenantSlug, eventId), "error", "已匯入 DUPR 的活動不可刪除"));
  }
  if (event) await prisma.duprEvent.delete({ where: { id: eventId } });
  revalidatePath(ROUTES.tenantAdminDuprEvents(tenantSlug));
  redirect(withQuery(ROUTES.tenantAdminDuprEvents(tenantSlug), "saved", "已刪除活動"));
}
