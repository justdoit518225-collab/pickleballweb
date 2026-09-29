import { addStaffByEmail, removeStaff, updateStaffRole } from "@/app/admin/[tenantSlug]/manage-actions";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { requireTenantAdmin } from "@/lib/authz";
import { TENANT_ROLE_LABELS, type TenantRoleKey } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const ROLE_OPTIONS = Object.entries(TENANT_ROLE_LABELS) as [TenantRoleKey, string][];

const SAVED_MESSAGES: Record<string, string> = {
  added: "已新增",
  updated: "已更新權限",
  removed: "已移除",
};

export default async function AdminStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const { saved, error } = await searchParams;
  const { tenant, session } = await requireTenantAdmin(tenantSlug);

  const roles = await prisma.tenantStaffRole.findMany({
    where: { tenantId: tenant.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const staff = [...new Map(roles.map((r) => [r.userId, r])).values()];

  return (
    <div className="space-y-6">
      {saved && <p className="text-sm text-emerald-600">{SAVED_MESSAGES[saved] ?? "已儲存"}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <form
        action={addStaffByEmail.bind(null, tenantSlug)}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="font-semibold">新增管理員/員工</h2>
        <input
          name="email"
          type="email"
          placeholder="對方 Email（須已登入過）"
          required
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <select name="role" defaultValue="STAFF" className="w-full rounded-lg border px-3 py-2 text-sm">
          {ROLE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          新增
        </button>
      </form>

      <section>
        <h2 className="font-semibold text-slate-800">員工列表</h2>
        <p className="mt-1 text-xs text-slate-500">員工無法進入「設定」與「員工權限」；俱樂部至少需保留一位場館管理員。</p>
        <ul className="mt-3 space-y-2">
          {staff.map((s) => {
            const isSelf = s.userId === session.user!.id;
            const label = s.user.name ?? s.user.email ?? "會員";
            return (
              <li
                key={s.userId}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">
                    {label}
                    {isSelf && <span className="ml-1 text-xs text-slate-400">（你）</span>}
                  </p>
                  <p className="truncate text-xs text-slate-500">{s.user.email}</p>
                </div>
                <form action={updateStaffRole.bind(null, tenantSlug, s.userId)} className="flex items-center gap-2">
                  <select
                    name="role"
                    defaultValue={s.role}
                    aria-label={`${label} 的權限`}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    {ROLE_OPTIONS.map(([value, optionLabel]) => (
                      <option key={value} value={value}>
                        {optionLabel}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    儲存
                  </button>
                </form>
                <ConfirmForm
                  action={removeStaff.bind(null, tenantSlug, s.userId)}
                  message={`確定將「${label}」從員工列表移除？`}
                >
                  <button type="submit" className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                    移除
                  </button>
                </ConfirmForm>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
