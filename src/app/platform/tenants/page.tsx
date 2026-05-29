import Link from "next/link";
import { createTenant, updateTenantDescription } from "@/app/platform/actions";
import { requireSuperAdmin } from "@/lib/authz";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

function truncate(text: string | null, max = 48) {
  if (!text) return "—";
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

export default async function PlatformTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; edit?: string }>;
}) {
  await requireSuperAdmin();
  const { error, saved, edit: editId } = await searchParams;

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { venues: true, activities: true } } },
  });

  const editing = editId ? tenants.find((t) => t.id === editId) : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">平台管理 · 租戶</h1>

      {saved && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          已儲存租戶簡介
        </p>
      )}

      {editing && (
        <section className="mt-6 rounded-xl border border-blue-100 bg-blue-50/40 p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-slate-800">
              編輯簡介 · {editing.displayName}
            </h2>
            <Link
              href={ROUTES.platformAdmin}
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              取消
            </Link>
          </div>
          {error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <form
            action={updateTenantDescription.bind(null, editing.id)}
            className="mt-4 space-y-3"
          >
            <div>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="edit-description"
              >
                簡介（顯示於租戶前台首頁）
              </label>
              <textarea
                id="edit-description"
                name="description"
                rows={4}
                defaultValue={editing.description ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="例：匹克球課程與球敘"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                儲存簡介
              </button>
              <Link
                href={ROUTES.platformAdmin}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                取消
              </Link>
            </div>
          </form>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">建立新租戶</h2>
        {!editing && error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <form action={createTenant} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="slug">
              Slug（網址路徑，例：my-club）
            </label>
            <input
              id="slug"
              name="slug"
              required
              pattern="[a-z0-9-]+"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="active-pickleball"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="displayName">
              顯示名稱
            </label>
            <input
              id="displayName"
              name="displayName"
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="description">
              簡介
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-fit rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            建立租戶
          </button>
        </form>
      </section>

      <section className="mt-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-800">
          已建立的租戶
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="px-4 py-2">名稱</th>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">簡介</th>
                <th className="px-4 py-2">場館數</th>
                <th className="px-4 py-2">活動數</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr
                  key={t.id}
                  className={`border-b border-slate-100 ${editId === t.id ? "bg-blue-50/50" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{t.displayName}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{t.slug}</td>
                  <td className="max-w-[200px] px-4 py-3 text-slate-600" title={t.description ?? ""}>
                    {truncate(t.description)}
                  </td>
                  <td className="px-4 py-3">{t._count.venues}</td>
                  <td className="px-4 py-3">{t._count.activities}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`${ROUTES.platformAdmin}?edit=${t.id}`}
                      className="text-brand-teal"
                    >
                      編輯簡介
                    </Link>
                    {" · "}
                    <Link href={ROUTES.tenant(t.slug)} className="text-brand-teal">
                      前台
                    </Link>
                    {" · "}
                    <Link href={ROUTES.tenantAdmin(t.slug)} className="text-brand-teal">
                      後台
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
