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
  const { tenant, isTenantAdmin } = await requireTenantStaff(tenantSlug);

  return (
    <div data-ui className="min-h-[100svh] bg-[var(--bg)]">
      <section className="bg-brand-navy text-white">
        <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 lg:px-11">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-[28px] font-black tracking-tight text-white">
              {tenant.displayName}
            </h1>
            <p className="text-[14px] font-bold text-[#C8D8E4]">
              場館管理後台 · 活動、球場、會員與 DUPR 對戰
            </p>
          </div>
          <div className="mt-6">
            <AdminNav tenantSlug={tenantSlug} isTenantAdmin={isTenantAdmin} />
          </div>
        </div>
      </section>

      <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 lg:px-11">
        {children}
      </div>
    </div>
  );
}
