import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const COOKIE_PREFIX = "dupr_scoring_";
const COOKIE_MAX_AGE = 24 * 60 * 60;

function cookieName(eventId: string) {
  return `${COOKIE_PREFIX}${eventId}`;
}

/** 更換現場碼後舊平板的 cookie 自動失效 */
function sign(eventId: string, pin: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", secret).update(`${eventId}:${pin}`).digest("base64url");
}

export async function isTenantStaffUser(tenantId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  if (session.user.platformRole === "SUPER_ADMIN") return true;
  const staff = await prisma.tenantStaffRole.findFirst({
    where: { tenantId, userId: session.user.id },
    select: { id: true },
  });
  return Boolean(staff);
}

export async function hasScoringCookie(eventId: string, pin: string): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(cookieName(eventId))?.value;
  if (!raw) return false;
  const a = Buffer.from(raw);
  const b = Buffer.from(sign(eventId, pin));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function grantScoringAccess(eventId: string, pin: string) {
  const jar = await cookies();
  jar.set(cookieName(eventId), sign(eventId, pin), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function canScoreEvent(event: { id: string; tenantId: string; scoringPin: string }) {
  if (await hasScoringCookie(event.id, event.scoringPin)) return true;
  return isTenantStaffUser(event.tenantId);
}
