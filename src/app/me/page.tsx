import Link from "next/link";
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
          <Avatar src={session!.user!.image} name={session!.user!.name ?? "會員"} />
          <div>
            <p className="font-semibold">{session!.user!.name}</p>
            <p className="text-sm text-slate-500">{session!.user!.email}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1 text-sm">
          {session!.user!.platformRole === "SUPER_ADMIN" && (
            <Link href={ROUTES.platformAdmin} className="font-medium text-brand-teal">
              → 平台管理（建立租戶）
            </Link>
          )}
          {adminTenants.map((t) => (
            <Link
              key={t.id}
              href={ROUTES.tenantAdmin(t.slug)}
              className="font-medium text-brand-teal"
            >
              {`${"→"} ${t.displayName} 管理後台`}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">DUPR 狀態</h2>
        {dupr?.linkStatus === "LINKED" ? (
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">名稱</dt>
              <dd>{dupr.duprName ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">單打</dt>
              <dd>{dupr.singlesRating?.toString() ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">雙打</dt>
              <dd>{dupr.doublesRating?.toString() ?? "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            尚未連結 DUPR。
            <Link href={ROUTES.meDupr} className="ml-1 text-brand-navy">
              前往設定
            </Link>
          </p>
        )}
      </section>

      <section className="col-span-full rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">已加入的場館</h2>
        {memberships.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">預約任一場館活動後會自動加入該館會員</p>
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
