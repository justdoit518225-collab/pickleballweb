import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

  const staff = await prisma.tenantStaffRole.findFirst({
    where: {
      tenantId: tenant.id,
      userId: session.user.id,
      ...(roles?.length ? { role: { in: roles } } : {}),
    },
  });

  const isSuper = session.user.platformRole === "SUPER_ADMIN";
  if (!staff && !isSuper) redirect("/");

  return { session, tenant, staff };
}
