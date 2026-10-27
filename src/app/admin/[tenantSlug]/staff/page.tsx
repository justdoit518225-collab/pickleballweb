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
      {saved && <p className="bg-[var(--surface-tint)] px-4 py-2 text-[14px] font-bold text-[#1B6B73]">{SAVED_MESSAGES[saved] ?? "已儲存"}</p>}
      {error && <p className="bg-[#FCECE9] px-4 py-2 text-[14px] font-bold text-[#B42318]">{error}</p>}

      <form
        action={addStaffByEmail.bind(null, tenantSlug)}
        className="max-w-xl space-y-3 bg-white p-6"
      >
        <h2 className="text-[20px] font-black text-brand-navy">新增管理員／員工</h2>
        <input
          name="email"
          type="email"
          placeholder="對方 Email（須已登入過）"
          required
          className="w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
        />
        <select name="role" defaultValue="STAFF" className="w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] font-bold text-brand-navy">
          {ROLE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-brand">
          新增
        </button>
      </form>

      <section className="bg-white p-6">
        <h2 className="text-[20px] font-black text-brand-navy">員工列表</h2>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          員工無法進入「設定」與「員工權限」；俱樂部至少需保留一位場館管理員。
        </p>
        <ul className="mt-4 space-y-2">
          {staff.map((s) => {
            const isSelf = s.userId === session.user!.id;
            const label = s.user.name ?? s.user.email ?? "會員";
            return (
              <li
                key={s.userId}
                className="flex flex-wrap items-center gap-3 bg-[var(--bg)] px-5 py-4 text-[14px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-black text-brand-navy">
                    {label}
                    {isSelf && <span className="ml-1 text-[14px] text-[var(--muted)]">（你）</span>}
                  </p>
                  <p className="truncate text-[14px] text-[var(--muted)]">{s.user.email}</p>
                </div>
                <form action={updateStaffRole.bind(null, tenantSlug, s.userId)} className="flex items-center gap-2">
                  <select
                    name="role"
                    defaultValue={s.role}
                    aria-label={`${label} 的權限`}
                    className="bg-white px-3 py-1.5 text-[14px] font-bold text-brand-navy"
                  >
                    {ROLE_OPTIONS.map(([value, optionLabel]) => (
                      <option key={value} value={value}>
                        {optionLabel}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="bg-brand-navy px-4 py-1.5 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy"
                  >
                    儲存
                  </button>
                </form>
                <ConfirmForm
                  action={removeStaff.bind(null, tenantSlug, s.userId)}
                  message={`確定將「${label}」從員工列表移除？`}
                >
                  <button type="submit" className="bg-[#FCECE9] px-3 py-1.5 text-[14px] font-black text-[#B42318]">
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
