import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const rel = "src/app/platform/tenants/page.tsx";

const ZH = {
  dash: "\u2014",
  ellipsis: "\u2026",
  middot: "\u00b7",
  saved: "\u5df2\u5132\u5b58\u79df\u6236\u7c21\u4ecb",
  title: "\u5e73\u53f0\u7ba1\u7406 \u00b7 \u79df\u6236",
  editTitle: "\u7de8\u8f2f\u7c21\u4ecb",
  cancel: "\u53d6\u6d88",
  descLabel: "\u7c21\u4ecb\uff08\u986f\u793a\u65bc\u79df\u6236\u524d\u53f0\u9996\u9801\uff09",
  descPh: "\u4f8b\uff1a\u5339\u514b\u7403\u8ab2\u7a0b\u8207\u7403\u6558",
  saveDesc: "\u5132\u5b58\u7c21\u4ecb",
  createNew: "\u5efa\u7acb\u65b0\u79df\u6236",
  slugLabel: "Slug\uff08\u7db2\u5740\u8def\u5f91\uff0c\u4f8b\uff1amy-club\uff09",
  displayName: "\u986f\u793a\u540d\u7a31",
  intro: "\u7c21\u4ecb",
  createTenant: "\u5efa\u7acb\u79df\u6236",
  existing: "\u5df2\u5efa\u7acb\u7684\u79df\u6236",
  colName: "\u540d\u7a31",
  colIntro: "\u7c21\u4ecb",
  colVenues: "\u5834\u9928\u6578",
  colActivities: "\u6d3b\u52d5\u6578",
  editIntro: "\u7de8\u8f2f\u7c21\u4ecb",
  front: "\u524d\u53f0",
  admin: "\u5f8c\u53f0",
};

const body = `import Link from "next/link";
import { createTenant, updateTenantDescription } from "@/app/platform/actions";
import { requireSuperAdmin } from "@/lib/authz";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

function truncate(text: string | null, max = 48) {
  if (!text) return "${ZH.dash}";
  return text.length <= max ? text : \`\${text.slice(0, max)}${ZH.ellipsis}\`;
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
      <h1 className="text-2xl font-bold text-slate-800">${ZH.title}</h1>

      {saved && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ${ZH.saved}
        </p>
      )}

      {editing && (
        <section className="mt-6 rounded-xl border border-blue-100 bg-blue-50/40 p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-slate-800">
              ${ZH.editTitle} ${ZH.middot} {editing.displayName}
            </h2>
            <Link
              href={ROUTES.platformAdmin}
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              ${ZH.cancel}
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
                ${ZH.descLabel}
              </label>
              <textarea
                id="edit-description"
                name="description"
                rows={4}
                defaultValue={editing.description ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="${ZH.descPh}"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                ${ZH.saveDesc}
              </button>
              <Link
                href={ROUTES.platformAdmin}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                ${ZH.cancel}
              </Link>
            </div>
          </form>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">${ZH.createNew}</h2>
        {!editing && error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <form action={createTenant} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="slug">
              ${ZH.slugLabel}
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
              ${ZH.displayName}
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
              ${ZH.intro}
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
            ${ZH.createTenant}
          </button>
        </form>
      </section>

      <section className="mt-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-800">
          ${ZH.existing}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="px-4 py-2">${ZH.colName}</th>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">${ZH.colIntro}</th>
                <th className="px-4 py-2">${ZH.colVenues}</th>
                <th className="px-4 py-2">${ZH.colActivities}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr
                  key={t.id}
                  className={\`border-b border-slate-100 \${editId === t.id ? "bg-blue-50/50" : ""}\`}
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
                      href={\`\${ROUTES.platformAdmin}?edit=\${t.id}\`}
                      className="text-brand-teal"
                    >
                      ${ZH.editIntro}
                    </Link>
                    {" ${ZH.middot} "}
                    <Link href={ROUTES.tenant(t.slug)} className="text-brand-teal">
                      ${ZH.front}
                    </Link>
                    {" ${ZH.middot} "}
                    <Link href={ROUTES.tenantAdmin(t.slug)} className="text-brand-teal">
                      ${ZH.admin}
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
`;

const full = path.join(root, rel);
fs.writeFileSync(full, body, "utf8");
new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(full));
console.log("OK", rel);
