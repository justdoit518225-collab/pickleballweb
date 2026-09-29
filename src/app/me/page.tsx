import Link from "next/link";
import { auth } from "@/auth";
import { DuprRatingCard } from "@/components/me/dupr-rating-card";
import { MembershipVenueCards } from "@/components/me/membership-venue-cards";
import { Avatar } from "@/components/ui/avatar";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

export default async function MeOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ left?: string; error?: string }>;
}) {
  const { left, error } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id;

  const isSuperAdmin = session!.user!.platformRole === "SUPER_ADMIN";

  const [memberships, staffRoles, allTenantsForSuper, accountUser, dupr] = await Promise.all([
    prisma.tenantMembership.findMany({
      where: { userId },
      include: {
        tenant: {
          select: {
            slug: true,
            displayName: true,
            logoUrl: true,
            description: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.tenantStaffRole.findMany({
      where: { userId },
      include: { tenant: true },
    }),
    isSuperAdmin
      ? prisma.tenant.findMany({
          where: { isActive: true },
          orderBy: { displayName: "asc" },
        })
      : Promise.resolve([]),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, image: true },
    }),
    prisma.duprProfile.findUnique({ where: { userId } }),
  ]);
  const duprLinked = dupr?.linkStatus === "LINKED" && Boolean(dupr.duprId);

  const accountForDisplay = {
    id: userId,
    name: accountUser?.name ?? session!.user!.name ?? null,
    image: accountUser?.image ?? session!.user!.image ?? null,
  };

  const adminTenants = isSuperAdmin
    ? allTenantsForSuper
    : [...new Map(staffRoles.map((r) => [r.tenant.id, r.tenant])).values()];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <Avatar src={session!.user!.image} name={session!.user!.name ?? "會員"} />
          <div>
            <p className="font-semibold">{session!.user!.name}</p>
            <p className="text-sm text-slate-500">{session!.user!.email}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1 text-sm">
          <Link href={ROUTES.meAccounts} className="font-medium text-brand-navy">
            → 登入方式（連結 Google / LINE）
          </Link>
          {session!.user!.platformRole === "SUPER_ADMIN" && (
            <>
              <Link href={ROUTES.platformAdmin} className="font-medium text-brand-teal">
                → 平台管理（租戶）
              </Link>
              <Link href={ROUTES.platformPaddles} className="font-medium text-brand-teal">
                → 匹克球拍管理
              </Link>
            </>
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
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">DUPR</h2>
          <Link href={ROUTES.meDupr} className="text-sm font-medium text-brand-navy">
            {duprLinked ? "管理 →" : "連結 DUPR →"}
          </Link>
        </div>
        {duprLinked && dupr ? (
          <div className="mt-3">
            <DuprRatingCard profile={dupr} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">尚未連結 DUPR，登入 DUPR 帳號後即可在這裡看到你的積分。</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">已加入的場館</h2>
            <p className="mt-1 text-sm text-slate-500">
              共 {memberships.length} 個場館
            </p>
          </div>
        </div>
        {left ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            已退出「{left}」
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <MembershipVenueCards memberships={memberships} accountUser={accountForDisplay} />
      </section>
    </div>
  );
}
