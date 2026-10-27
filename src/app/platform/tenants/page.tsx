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
    <div data-ui className="space-y-8">
      {saved && (
        <p className="bg-[var(--surface-tint)] px-4 py-3 text-[14px] font-bold text-[#1B6B73]">
          已儲存租戶簡介
        </p>
      )}

      {editing && (
        <section className="bg-brand-navy p-6 text-white">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[20px] font-black text-white">
              編輯簡介 · {editing.displayName}
            </h2>
            <Link
              href={ROUTES.platformAdmin}
              className="text-[14px] font-bold text-brand-lime hover:underline"
            >
              取消
            </Link>
          </div>
          {error && (
            <p className="mt-2 bg-[#FCECE9] px-3 py-2 text-[14px] font-bold text-[#B42318]">
              {error}
            </p>
          )}
          <form
            action={updateTenantDescription.bind(null, editing.id)}
            className="mt-4 space-y-3"
          >
            <div>
              <label
                className="block text-[14px] font-bold text-[#C8D8E4]"
                htmlFor="edit-description"
              >
                簡介（顯示於租戶前台首頁）
              </label>
              <textarea
                id="edit-description"
                name="description"
                rows={4}
                defaultValue={editing.description ?? ""}
                className="mt-1 w-full bg-white px-4 py-2.5 text-[14px] text-brand-navy"
                placeholder="例：匹克球課程與球敘"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="bg-brand-lime px-5 py-2.5 text-[14px] font-black text-brand-navy hover:bg-white"
              >
                儲存簡介
              </button>
              <Link
                href={ROUTES.platformAdmin}
                className="bg-white px-5 py-2.5 text-[14px] font-bold text-brand-navy"
              >
                取消
              </Link>
            </div>
          </form>
        </section>
      )}

      <section className="bg-white p-6">
        <h2 className="text-[20px] font-black text-brand-navy">建立新租戶</h2>
        {!editing && error && (
          <p className="mt-2 bg-[#FCECE9] px-3 py-2 text-[14px] font-bold text-[#B42318]">
            {error}
          </p>
        )}
        <form action={createTenant} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[14px] font-bold text-brand-navy" htmlFor="slug">
              Slug（網址路徑，例：my-club）
            </label>
            <input
              id="slug"
              name="slug"
              required
              pattern="[a-z0-9-]+"
              className="mt-1 w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
              placeholder="my-club"
            />
          </div>
          <div>
            <label className="block text-[14px] font-bold text-brand-navy" htmlFor="displayName">
              顯示名稱
            </label>
            <input
              id="displayName"
              name="displayName"
              required
              className="mt-1 w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[14px] font-bold text-brand-navy" htmlFor="description">
              簡介
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              className="mt-1 w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
            />
          </div>
          <div>
            <button type="submit" className="btn-brand">
              建立租戶
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden bg-white">
        <div className="px-6 py-4">
          <h2 className="text-[20px] font-black text-brand-navy">已建立的租戶</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-brand-navy text-white">
              <tr>
                <th className="px-4 py-3 font-black">名稱</th>
                <th className="px-4 py-3 font-black">Slug</th>
                <th className="px-4 py-3 font-black">簡介</th>
                <th className="px-4 py-3 font-black">場館數</th>
                <th className="px-4 py-3 font-black">活動數</th>
                <th className="px-4 py-3 font-black">操作</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t, idx) => (
                <tr
                  key={t.id}
                  className={
                    editId === t.id
                      ? "bg-[var(--surface-tint)]"
                      : idx % 2 === 1
                        ? "bg-[var(--bg)]"
                        : "bg-white"
                  }
                >
                  <td className="px-4 py-3 font-black text-brand-navy">{t.displayName}</td>
                  <td className="px-4 py-3 tabular-nums text-[var(--muted)]">{t.slug}</td>
                  <td className="max-w-[240px] px-4 py-3 text-[var(--muted)]" title={t.description ?? ""}>
                    {truncate(t.description)}
                  </td>
                  <td className="px-4 py-3 font-bold tabular-nums text-brand-navy">{t._count.venues}</td>
                  <td className="px-4 py-3 font-bold tabular-nums text-brand-navy">{t._count.activities}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-bold">
                    <Link
                      href={`${ROUTES.platformAdmin}?edit=${t.id}`}
                      className="text-[#1B6B73] hover:underline"
                    >
                      編輯簡介
                    </Link>
                    {" · "}
                    <Link href={ROUTES.tenant(t.slug)} className="text-[#1B6B73] hover:underline">
                      前台
                    </Link>
                    {" · "}
                    <Link href={ROUTES.tenantAdmin(t.slug)} className="text-[#1B6B73] hover:underline">
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
