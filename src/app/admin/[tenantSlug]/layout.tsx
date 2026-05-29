import { AdminNav } from "@/components/layout/admin-nav";
import { requireTenantStaff } from "@/lib/authz";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantStaff(tenantSlug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-bold text-slate-800">{tenant.displayName}</h1>
      <p className="text-sm text-slate-500">管理後台</p>
      <div className="mt-4">
        <AdminNav tenantSlug={tenantSlug} />
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
