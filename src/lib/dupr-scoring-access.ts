import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const COOKIE_PREFIX = "dupr_scoring_";
const COOKIE_MAX_AGE = 24 * 60 * 60;

function cookieName(eventId: string) {
  return `${COOKIE_PREFIX}${eventId}`;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

/** 更換現場碼後舊平板的 cookie 自動失效 */
function sign(eventId: string, pin: string): string {
  return createHmac("sha256", getSecret()).update(`${eventId}:${pin}`).digest("base64url");
}

function safeEqual(aStr: string, bStr: string): boolean {
  const a = Buffer.from(aStr);
  const b = Buffer.from(bStr);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 產生「活動現場報到 QR Code」簽章 token（球友掃描員工出示的 QR Code 即完成本人報到） */
export function signEventCheckInToken(eventId: string): string {
  return createHmac("sha256", getSecret())
    .update(`checkin-event:${eventId}`)
    .digest("base64url")
    .slice(0, 24);
}

export function verifyEventCheckInToken(eventId: string, token: string): boolean {
  if (!token) return false;
  return safeEqual(token, signEventCheckInToken(eventId));
}

/** 產生「球友個人報到 QR Code」簽章 token（員工掃描球友出示的 QR Code 即幫該球友完成報到） */
export function signPlayerCheckInToken(eventId: string, playerId: string): string {
  return createHmac("sha256", getSecret())
    .update(`checkin-player:${eventId}:${playerId}`)
    .digest("base64url")
    .slice(0, 24);
}

export function verifyPlayerCheckInToken(
  eventId: string,
  playerId: string,
  token: string,
): boolean {
  if (!token || !playerId) return false;
  return safeEqual(token, signPlayerCheckInToken(eventId, playerId));
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
  return safeEqual(raw, sign(eventId, pin));
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

/** 是否具備全場計分權限（俱樂部管理員／員工／已輸入現場碼的公用平板） */
export async function canScoreEvent(event: {
  id: string;
  tenantId: string;
  scoringPin: string;
}) {
  if (await hasScoringCookie(event.id, event.scoringPin)) return true;
  return isTenantStaffUser(event.tenantId);
}
