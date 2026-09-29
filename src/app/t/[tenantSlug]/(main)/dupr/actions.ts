"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";
import { DuprEventError, saveMatchScore, setMatchConfirmation } from "@/lib/dupr-event";
import { canScoreEvent, grantScoringAccess } from "@/lib/dupr-scoring-access";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";

export type ScoringResult = { ok: true } | { ok: false; error: string };

async function loadEvent(tenantSlug: string, eventId: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return null;
  return prisma.duprEvent.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    select: { id: true, tenantId: true, scoringPin: true, status: true },
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

async function runScoring(
  tenantSlug: string,
  eventId: string,
  fn: () => Promise<void>,
): Promise<ScoringResult> {
  const event = await loadEvent(tenantSlug, eventId);
  if (!event) return { ok: false, error: "找不到此活動" };
  if (!(await canScoreEvent(event))) return { ok: false, error: "請先輸入現場碼" };
  try {
    await fn();
  } catch (e) {
    if (e instanceof DuprEventError) return { ok: false, error: e.message };
    throw e;
  }
  revalidatePath(ROUTES.tenantDuprEvent(tenantSlug, eventId));
  return { ok: true };
}

export async function submitMatchScore(
  tenantSlug: string,
  eventId: string,
  matchId: string,
  scoreA: number,
  scoreB: number,
): Promise<ScoringResult> {
  return runScoring(tenantSlug, eventId, () => saveMatchScore(eventId, matchId, scoreA, scoreB));
}

export async function setPlayerConfirmation(
  tenantSlug: string,
  eventId: string,
  matchId: string,
  playerSeq: number,
  confirmed: boolean,
): Promise<ScoringResult> {
  return runScoring(tenantSlug, eventId, () =>
    setMatchConfirmation(eventId, matchId, playerSeq, confirmed),
  );
}
