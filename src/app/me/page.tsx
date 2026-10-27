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
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="bg-white p-6 sm:p-8 lg:col-span-6">
          <div className="flex items-center gap-4">
            <Avatar src={session!.user!.image} name={session!.user!.name ?? "會員"} size="lg" />
            <div>
              <h2 className="text-xl font-extrabold text-brand-navy">
                {session!.user!.name}
              </h2>
              <p className="text-sm font-medium text-[var(--muted)]">
                {session!.user!.email ?? "LINE 快速登入帳號"}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <Link
              href={ROUTES.meAccounts}
              className="btn-brand-outline bg-[var(--bg)] px-4 py-2 text-sm font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
            >
              管理登入方式（Google / LINE）→
            </Link>
            {session!.user!.platformRole === "SUPER_ADMIN" && (
              <>
                <Link
                  href={ROUTES.platformAdmin}
                  className="btn-brand px-4 py-2 text-sm font-bold text-white"
                >
                  平台租戶管理 →
                </Link>
                <Link
                  href={ROUTES.platformPaddles}
                  className="btn-brand px-4 py-2 text-sm font-bold text-white"
                >
                  球拍目錄管理 →
                </Link>
              </>
            )}
          </div>
          {adminTenants.length > 0 && (
            <div className="mt-6 bg-[var(--bg)] p-4">
              <p className="text-sm font-extrabold text-brand-navy">
                場主與管理員權限入口
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {adminTenants.map((t) => (
                  <Link
                    key={t.id}
                    href={ROUTES.tenantAdmin(t.slug)}
                    className="bg-brand-navy px-3.5 py-2 text-sm font-bold text-white hover:bg-brand-teal"
                  >
                    {t.displayName} 管理後台 →
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="bg-white p-6 sm:p-8 lg:col-span-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-xl font-extrabold text-brand-navy">DUPR 積分檔案</h2>
            <Link
              href={ROUTES.meDupr}
              className="text-sm font-extrabold text-[#1D6D75] hover:text-brand-navy"
            >
              {duprLinked ? "管理積分 →" : "連結 DUPR →"}
            </Link>
          </div>
          {duprLinked && dupr ? (
            <div className="mt-4">
              <DuprRatingCard profile={dupr} />
            </div>
          ) : (
            <div className="mt-4 bg-[var(--bg)] p-5">
              <p className="text-base text-[var(--muted)]">
                尚未連結 DUPR 帳號。完成連結後即可顯示單打與雙打官方積分，並直接報名 DUPR 分級賽事。
              </p>
              <Link
                href={ROUTES.meDupr}
                className="btn-brand mt-4 inline-flex px-4 py-2 text-sm font-bold text-white"
              >
                前往設定 DUPR →
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className="bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-extrabold text-brand-navy">已加入的俱樂部場館</h2>
          <p className="text-base font-bold text-[#1D6D75] tabular-nums">
            共 {memberships.length} 間俱樂部
          </p>
        </div>
        {left ? (
          <p className="mt-4 bg-brand-lime-soft px-4 py-3 text-sm font-bold text-brand-navy">
            已退出「{left}」
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 bg-rose-100 px-4 py-3 text-sm font-bold text-rose-900">
            {error}
          </p>
        ) : null}
        <MembershipVenueCards memberships={memberships} accountUser={accountForDisplay} />
      </section>
    </div>
  );
}
