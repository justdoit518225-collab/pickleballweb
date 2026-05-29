import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const body = `import Link from "next/link";
import { auth } from "@/auth";
import { Avatar } from "@/components/ui/avatar";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

export default async function MeOverviewPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const [memberships, dupr, staffRoles] = await Promise.all([
    prisma.tenantMembership.findMany({
      where: { userId },
      include: { tenant: true },
    }),
    prisma.duprProfile.findUnique({ where: { userId } }),
    prisma.tenantStaffRole.findMany({
      where: { userId },
      include: { tenant: true },
    }),
  ]);

  const adminTenants = [
    ...new Map(staffRoles.map((r) => [r.tenant.id, r.tenant])).values(),
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <Avatar src={session!.user!.image} name={session!.user!.name ?? "${"\u6703\u54e1"}"} />
          <div>
            <p className="font-semibold">{session!.user!.name}</p>
            <p className="text-sm text-slate-500">{session!.user!.email}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1 text-sm">
          {session!.user!.platformRole === "SUPER_ADMIN" && (
            <Link href={ROUTES.platformAdmin} className="font-medium text-brand-teal">
              ${"\u2192 \u5e73\u53f0\u7ba1\u7406\uff08\u5efa\u7acb\u79df\u6236\uff09"}
            </Link>
          )}
          {adminTenants.map((t) => (
            <Link
              key={t.id}
              href={ROUTES.tenantAdmin(t.slug)}
              className="font-medium text-brand-teal"
            >
              {\`\${"\u2192"} \${t.displayName} ${"\u7ba1\u7406\u5f8c\u53f0"}\`}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">DUPR ${"\u72c0\u614b"}</h2>
        {dupr?.linkStatus === "LINKED" ? (
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">${"\u540d\u7a31"}</dt>
              <dd>{dupr.duprName ?? "${"\u2014"}"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">${"\u55ae\u6253"}</dt>
              <dd>{dupr.singlesRating?.toString() ?? "${"\u2014"}"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">${"\u96d9\u6253"}</dt>
              <dd>{dupr.doublesRating?.toString() ?? "${"\u2014"}"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            ${"\u5c1a\u672a\u9023\u7d50 DUPR\u3002"}
            <Link href={ROUTES.meDupr} className="ml-1 text-brand-navy">
              ${"\u524d\u5f80\u8a2d\u5b9a"}
            </Link>
          </p>
        )}
      </section>

      <section className="col-span-full rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">${"\u5df2\u52a0\u5165\u7684\u5834\u9928"}</h2>
        {memberships.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">${"\u9810\u7d04\u4efb\u4e00\u5834\u9928\u6d3b\u52d5\u5f8c\u6703\u81ea\u52d5\u52a0\u5165\u8a72\u9928\u6703\u54e1"}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {memberships.map((m) => (
              <li key={m.id}>
                <Link href={ROUTES.tenant(m.tenant.slug)} className="text-sm text-brand-navy">
                  {m.tenant.displayName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
`;

fs.writeFileSync(path.join(root, "src/app/me/page.tsx"), body, "utf8");
console.log("OK me/page.tsx");
