import { setMemberBanned } from "@/app/admin/[tenantSlug]/manage-actions";
import { MembersListToolbar } from "@/components/admin/members-list-toolbar";
import { requireTenantStaff } from "@/lib/authz";
import {
  buildMemberWhere,
  memberListSkip,
  parseAdminMembersListParams,
} from "@/lib/admin-members-list";
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
    include: { user: true },
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

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {members.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            {listParams.q ? "沒有符合搜尋條件的會員" : "尚無會員"}
          </p>
        ) : (
          <div className={tableWrapperClass}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)]">
                <tr>
                  <th className="px-4 py-2 text-left">會員</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">暱稱</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{m.user.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{m.user.email}</td>
                    <td className="px-4 py-3">{m.nickname ?? "—"}</td>
                    <td className="px-4 py-3">
                      <form
                        action={setMemberBanned.bind(null, tenantSlug, m.userId, !m.isBanned)}
                      >
                        <button
                          type="submit"
                          className={`text-sm ${m.isBanned ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {m.isBanned ? "解除停權" : "停權"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
