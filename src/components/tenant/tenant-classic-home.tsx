import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { sumPartySize } from "@/lib/activity-capacity";
import { formatActivityDateTime } from "@/lib/format-datetime";
import { countLiveDuprEvents } from "@/lib/dupr-event";
import { countTenantUpcomingRentals } from "@/lib/rental-service";
import { getPublishedActivities } from "@/lib/tenant";
import { activityKindBadgeVariant, adminActivityKindLabel, ROUTES } from "@/lib/constants";

type TenantWithVenues = {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  venues: { id: string; name: string; address: string | null }[];
};

/** 傳統場館首頁（Active 等租戶）：球敘 / 課程 / 看板入口 + 活動列表 */
export async function TenantClassicHome({ tenant }: { tenant: TenantWithVenues }) {
  const tenantSlug = tenant.slug;
  const [activities, rentalCount, liveDuprCount] = await Promise.all([
    getPublishedActivities(tenant.id),
    countTenantUpcomingRentals(tenant.id),
    countLiveDuprEvents(tenant.id),
  ]);

  return (
    <div>
      {/* Architectural Club Masthead */}
      <section className="bg-brand-navy py-12 text-white sm:py-16">
        <div className="page-wrap">
          <Link
            href={ROUTES.home}
            className="text-xs font-bold text-brand-lime hover:underline"
          >
            ← 返回 PlayPlayPlay 俱樂部列表
          </Link>
          <div className="mt-4 grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <h1 className="type-head text-white">{tenant.displayName}</h1>
              {tenant.description ? (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/80">
                  {tenant.description}
                </p>
              ) : null}
            </div>
            <nav className="flex flex-wrap gap-2.5 lg:col-span-5 lg:justify-end">
              <Link
                href={ROUTES.tenantBoard(tenantSlug)}
                className="bg-brand-lime px-4 py-2.5 text-sm font-extrabold text-brand-navy transition-colors hover:bg-white"
              >
                今日球場看板
              </Link>
              {liveDuprCount > 0 && (
                <Link
                  href={ROUTES.tenantDuprEvents(tenantSlug)}
                  className="bg-brand-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-lime hover:text-brand-navy"
                >
                  DUPR 積分賽 ({liveDuprCount})
                </Link>
              )}
              <Link
                href={ROUTES.tenantActivities(tenantSlug, "open-play")}
                className="bg-white/12 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white hover:text-brand-navy"
              >
                臨打球敘
              </Link>
              <Link
                href={ROUTES.tenantActivities(tenantSlug, "course")}
                className="bg-white/12 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white hover:text-brand-navy"
              >
                教練課程
              </Link>
              {rentalCount > 0 && (
                <Link
                  href={ROUTES.tenantRentals(tenantSlug)}
                  className="bg-white/12 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white hover:text-brand-navy"
                >
                  場地租借（30 天）
                </Link>
              )}
              <Link
                href={ROUTES.tenantAbout(tenantSlug)}
                className="bg-white/12 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white hover:text-brand-navy"
              >
                關於場館
              </Link>
            </nav>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="page-wrap py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          {/* Left 8 Columns: Upcoming Activities */}
          <section className="lg:col-span-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="type-head text-brand-navy">即將開始的活動</h2>
              <Link
                href={ROUTES.tenantActivities(tenantSlug)}
                className="text-sm font-extrabold text-brand-teal hover:text-brand-navy"
              >
                查看全部活動 →
              </Link>
            </div>

            {activities.length === 0 ? (
              <div className="mt-6 bg-[var(--surface)] p-8">
                <p className="text-base font-medium text-[var(--muted)]">
                  目前沒有開放中的活動，歡迎先查看今日球場看板或場地租借時段。
                </p>
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {activities.slice(0, 6).map((a) => {
                  const heads = sumPartySize(a.bookings);
                  const isFull = heads >= a.capacity;
                  return (
                    <li key={a.id}>
                      <Link
                        href={ROUTES.tenantActivity(tenantSlug, a.id)}
                        className="group flex flex-wrap items-center justify-between gap-4 bg-[var(--surface)] p-6 transition-colors hover:bg-brand-navy hover:text-white"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <Badge variant={activityKindBadgeVariant(a.type, a.requiresDupr)}>
                              {adminActivityKindLabel(a.type, a.requiresDupr)}
                            </Badge>
                            <span className="text-lg font-extrabold text-brand-navy group-hover:text-white">
                              {a.title}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-[var(--muted)] tabular-nums group-hover:text-white/80">
                            {formatActivityDateTime(a.startAt)} · {a.venue.name}
                            {a.court ? ` · ${a.court.name}` : ""}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-4">
                          <div className="text-right">
                            <span className="block text-xs font-bold text-[var(--muted)] group-hover:text-white/70">
                              報名名額
                            </span>
                            <span className="text-lg font-black text-brand-navy tabular-nums group-hover:text-brand-lime">
                              {heads} / {a.capacity}
                            </span>
                          </div>
                          <span
                            className={`px-3 py-1.5 text-xs font-extrabold ${
                              isFull
                                ? "bg-amber-200 text-amber-950"
                                : "bg-brand-lime text-brand-navy"
                            }`}
                          >
                            {isFull ? "可排候補" : "立即報名 →"}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Right 4 Columns: Venues & Quick Access */}
          <aside className=" bg-[var(--surface-alt)] p-7 lg:col-span-4">
            <h2 className="text-xl font-extrabold text-brand-navy">場館據點</h2>
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
              本俱樂部旗下開放預約之球場位置
            </p>
            <ul className="mt-5 space-y-4">
              {tenant.venues.map((v) => (
                <li key={v.id} className="bg-[var(--surface)] p-4">
                  <p className="font-extrabold text-brand-navy">{v.name}</p>
                  {v.address ? (
                    <p className="mt-1 text-sm text-[var(--muted)]">{v.address}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
