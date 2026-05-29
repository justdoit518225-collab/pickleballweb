import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import type { Tenant, TenantVisibility } from "@/generated/prisma/client";
import { ensureTenantMembership } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "tenant_access_grants";
const GRANT_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function hashAccessCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  return createHash("sha256").update(normalized).digest("hex");
}

export function verifyAccessCode(code: string, hash: string | null | undefined): boolean {
  if (!hash) return false;
  const a = Buffer.from(hashAccessCode(code));
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type GrantPayload = { slugs: string[]; exp: number };

function signPayload(payload: GrantPayload): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function parseSignedCookie(value: string): GrantPayload | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as GrantPayload;
    if (!Array.isArray(payload.slugs) || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getGrantedTenantSlugs(): Promise<string[]> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return [];
  const payload = parseSignedCookie(raw);
  return payload?.slugs ?? [];
}

export async function grantTenantAccess(slug: string): Promise<void> {
  const jar = await cookies();
  const existing = await getGrantedTenantSlugs();
  const slugs = [...new Set([...existing, slug])];
  const payload: GrantPayload = { slugs, exp: Date.now() + GRANT_TTL_MS };
  jar.set(COOKIE_NAME, signPayload(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GRANT_TTL_MS / 1000,
  });
}

async function hasStaffOrMembership(tenantId: string, userId: string): Promise<boolean> {
  const [staff, member] = await Promise.all([
    prisma.tenantStaffRole.findFirst({ where: { tenantId, userId } }),
    prisma.tenantMembership.findFirst({
      where: { tenantId, userId, isBanned: false },
    }),
  ]);
  return Boolean(staff || member);
}

export async function canAccessTenant(
  tenant: Pick<Tenant, "id" | "slug" | "visibility">,
): Promise<boolean> {
  if (!tenant.visibility || tenant.visibility === "PUBLIC") return true;

  const session = await auth();
  if (session?.user?.id) {
    if (session.user.platformRole === "SUPER_ADMIN") return true;
    if (await hasStaffOrMembership(tenant.id, session.user.id)) return true;
  }

  const grants = await getGrantedTenantSlugs();
  return grants.includes(tenant.slug);
}

export async function ensureTenantMembershipOnAccess(tenantId: string, userId: string) {
  await ensureTenantMembership(tenantId, userId);
  await prisma.tenantMembership.updateMany({
    where: { tenantId, userId },
    data: { isBanned: false },
  });
}

export function visibilityLabel(visibility: TenantVisibility): string {
  return visibility === "PUBLIC" ? "公開" : "私人";
}
