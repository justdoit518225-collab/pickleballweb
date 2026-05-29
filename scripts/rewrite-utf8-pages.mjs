import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const platformTenants = `import Link from "next/link";
import { createTenant } from "@/app/platform/actions";
import { requireSuperAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

export default async function PlatformTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();
  const { error } = await searchParams;

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { venues: true, activities: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">${"\u5e73\u53f0\u7ba1\u7406 \u00b7 \u79df\u6236"}</h1>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">${"\u5efa\u7acb\u65b0\u79df\u6236"}</h2>
        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <form action={createTenant} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="slug">
              Slug${"\uff08\u7db2\u5740\u8def\u5f91\uff0c\u4f8b\uff1amy-club\uff09"}
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
              ${"\u986f\u793a\u540d\u7a31"}
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
              ${"\u7c21\u4ecb"}
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
            ${"\u5efa\u7acb\u79df\u6236"}
          </button>
        </form>
      </section>

      <table className="mt-10 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-2">${"\u540d\u7a31"}</th>
            <th className="py-2">Slug</th>
            <th className="py-2">${"\u5834\u9928\u6578"}</th>
            <th className="py-2">${"\u6d3b\u52d5\u6578"}</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.id} className="border-b border-slate-100">
              <td className="py-3 font-medium text-slate-800">{t.displayName}</td>
              <td className="py-3 font-mono text-slate-600">{t.slug}</td>
              <td className="py-3">{t._count.venues}</td>
              <td className="py-3">{t._count.activities}</td>
              <td className="py-3">
                <Link href={ROUTES.tenant(t.slug)} className="text-brand-teal">
                  ${"\u524d\u53f0"}
                </Link>
                {" ${"\u00b7"} "}
                <Link href={ROUTES.tenantAdmin(t.slug)} className="text-brand-teal">
                  ${"\u5f8c\u53f0"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;

fs.writeFileSync(path.join(root, "src/app/platform/tenants/page.tsx"), platformTenants, "utf8");
console.log("Wrote platform tenants page OK");
