import { notFound, redirect } from "next/navigation";
import { canAccessTenant } from "@/lib/tenant-access";
import { getTenantBySlug } from "@/lib/tenant";
import { ROUTES } from "@/lib/constants";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const allowed = await canAccessTenant(tenant);
  if (!allowed) {
    redirect(ROUTES.tenantAccess(tenantSlug));
  }

  return children;
}
