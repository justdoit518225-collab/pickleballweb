import { setMemberBanned } from "@/app/admin/[tenantSlug]/manage-actions";
import { MembersListToolbar } from "@/components/admin/members-list-toolbar";
import { Avatar } from "@/components/ui/avatar";
import { requireTenantStaff } from "@/lib/authz";
import {
  buildMemberWhere,
  memberListSkip,
  parseAdminMembersListParams,
  resolveMemberLineUserId,
} from "@/lib/admin-members-list";
import { resolveMemberDisplay } from "@/lib/member-display";
import { prisma } from "@/lib/prisma";

export default async function AdminMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string; view?: string; q?: string }>;
}) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const listParams = parseAdminMembersListParams(sp);
  const { tenant } = await requireTenantStaff(tenantSlug);

  const where = buildMemberWhere(tenant.id, listParams.q);
  const take = listParams.pageSize;

  const total = await prisma.tenantMembership.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / listParams.pageSize));
  const page =
    listParams.view === "paginate"
      ? Math.min(Math.max(1, listParams.page), totalPages)
      : 1;
  const skip = memberListSkip(page, listParams.pageSize, listParams.view);

  const members = await prisma.tenantMembership.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          accounts: {
            where: { provider: "line" },
            select: { providerAccountId: true },
          },
          notificationPreferences: {
            where: { tenantId: tenant.id },
            select: { lineUserId: true, lineLinked: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
    skip,
    take,
  });

  const tableWrapperClass =
    listParams.view === "scroll"
      ? "max-h-[min(70vh,640px)] overflow-y-auto overflow-x-auto"
      : "overflow-x-auto";

  return (
    <div className="space-y-4">
      <MembersListToolbar
        tenantSlug={tenantSlug}
        total={total}
        totalPages={totalPages}
        params={{ ...listParams, page }}
      />

      <section className="overflow-hidden bg-white">
        {members.length === 0 ? (
          <p className="px-6 py-8 text-center text-[14px] text-[var(--muted)]">
            {listParams.q ? "沒有符合搜尋條件的會員" : "尚無會員"}
          </p>
        ) : (
          <div className={tableWrapperClass}>
            <table className="w-full min-w-[64rem] text-[14px]">
              <thead className="sticky top-0 z-10 bg-brand-navy text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-black">會員</th>
                  <th className="px-4 py-3 text-left font-black">Email</th>
                  <th className="px-4 py-3 text-left font-black">暱稱</th>
                  <th className="px-4 py-3 text-left font-black">LINE 帳號 ID</th>
                  <th className="px-4 py-3 text-left font-black">加入日期</th>
                  <th className="px-4 py-3 text-left font-black">狀態</th>
                  <th className="px-4 py-3 text-left font-black">操作</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const display = resolveMemberDisplay(m.user, m);
                  const lineUserId = resolveMemberLineUserId(m.user);
                  return (
                    <tr
                      key={m.id}
                      className={`border-t border-[var(--line)] ${m.isBanned ? "bg-[#FCECE9]/60" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={display.avatarUrl} name={display.displayName} size="sm" />
                          <span className="font-bold text-brand-navy">
                            {m.user.name?.trim() || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{m.user.email?.trim() || "—"}</td>
                      <td className="px-4 py-3 font-bold text-brand-navy">{m.nickname?.trim() || "—"}</td>
                      <td className="px-4 py-3">
                        {lineUserId ? (
                          <code className="break-all font-mono text-[14px] text-brand-navy" title={lineUserId}>
                            {lineUserId}
                          </code>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-[var(--muted)]">
                        {m.joinedAt.toLocaleString("zh-TW", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {m.isBanned ? (
                          <span className="inline-flex bg-[#FCECE9] px-2.5 py-0.5 text-[14px] font-black text-[#B42318]">
                            已停權
                          </span>
                        ) : (
                          <span className="inline-flex bg-brand-lime px-2.5 py-0.5 text-[14px] font-black text-brand-navy">
                            正常
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <form
                          action={setMemberBanned.bind(null, tenantSlug, m.userId, !m.isBanned)}
                        >
                          <button
                            type="submit"
                            className={`text-[14px] font-black ${
                              m.isBanned ? "text-[#1B6B73]" : "text-[#B42318]"
                            }`}
                          >
                            {m.isBanned ? "解除停權" : "停權"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
