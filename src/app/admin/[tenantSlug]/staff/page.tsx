import { addStaffByEmail } from "@/app/admin/[tenantSlug]/manage-actions";
import { requireTenantStaff } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function AdminStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const { saved, error } = await searchParams;
  const { tenant } = await requireTenantStaff(tenantSlug);

  const staff = await prisma.tenantStaffRole.findMany({
    where: { tenantId: tenant.id },
    include: { user: true },
  });

  return (
    <div className="space-y-6">
      {saved && <p className="text-sm text-emerald-600">已新增</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <form action={addStaffByEmail.bind(null, tenantSlug)} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold">新增管理員/員工</h2>
        <input name="email" type="email" placeholder="對方 Email（須已登入過）" required className="w-full rounded-lg border px-3 py-2 text-sm" />
        <select name="role" className="w-full rounded-lg border px-3 py-2 text-sm">
          <option value="TENANT_ADMIN">場館管理員</option>
          <option value="VENUE_MANAGER">館別經理</option>
          <option value="STAFF">員工</option>
        </select>
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">新增</button>
      </form>

      <ul className="space-y-2">
        {staff.map((s) => (
          <li key={s.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
            {s.user.email} — <span className="text-slate-500">{s.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
