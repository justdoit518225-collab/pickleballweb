import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { TenantRole } from "@/generated/prisma/client";

export async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.platformRole !== "SUPER_ADMIN") {
    redirect("/");
  }
  return session;
}

export async function requireTenantStaff(tenantSlug: string, roles?: TenantRole[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) redirect("/");

  const staffRoles = await prisma.tenantStaffRole.findMany({
    where: { tenantId: tenant.id, userId: session.user.id },
  });
  const staff = staffRoles.find((r) => !roles?.length || roles.includes(r.role)) ?? null;

  const isSuper = session.user.platformRole === "SUPER_ADMIN";
  if (!staff && !isSuper) redirect("/");

  const isTenantAdmin = isSuper || staffRoles.some((r) => r.role === "TENANT_ADMIN");
  return { session, tenant, staff, isTenantAdmin };
}

/** 設定、員工權限等僅限場館管理員（與超級管理員）；一般員工導回後台總覽 */
export async function requireTenantAdmin(tenantSlug: string) {
  const ctx = await requireTenantStaff(tenantSlug);
  if (!ctx.isTenantAdmin) redirect(ROUTES.tenantAdmin(tenantSlug));
  return ctx;
}
