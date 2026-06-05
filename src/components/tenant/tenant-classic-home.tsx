import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { sumPartySize } from "@/lib/activity-capacity";
import { formatActivityDateTime } from "@/lib/format-datetime";
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
  const [activities, rentalCount] = await Promise.all([
    getPublishedActivities(tenant.id),
    countTenantUpcomingRentals(tenant.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">{tenant.displayName}</h1>
        {tenant.description && (
          <p className="mt-2 text-slate-600">{tenant.description}</p>
        )}
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        <Link
          href={ROUTES.tenantActivities(tenantSlug, "open-play")}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
        >
          球敘
        </Link>
        <Link
          href={ROUTES.tenantActivities(tenantSlug, "course")}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
        >
          課程
        </Link>
        <Link
          href={ROUTES.tenantBoard(tenantSlug)}
          className="rounded-lg border border-brand-teal/40 bg-brand-lime-soft/40 px-4 py-2 text-sm font-medium text-brand-navy shadow-sm"
        >
          當日球敘看板
        </Link>
        {rentalCount > 0 && (
          <Link
            href={ROUTES.tenantRentals(tenantSlug)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
          >
            場地租借（30 天）
          </Link>
        )}
        <Link
          href={ROUTES.tenantAbout(tenantSlug)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
        >
          關於場館
        </Link>
      </nav>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">即將開始的活動</h2>
          <Link href={ROUTES.tenantActivities(tenantSlug)} className="text-sm text-emerald-700">
            查看全部
          </Link>
        </div>
        {activities.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">目前沒有開放中的活動</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {activities.slice(0, 5).map((a) => (
              <li key={a.id}>
                <Link
                  href={ROUTES.tenantActivity(tenantSlug, a.id)}
                  className="block rounded-xl border border-zinc-200 bg-white p-4 hover:border-emerald-300"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.title}</span>
                    <Badge variant={activityKindBadgeVariant(a.type, a.requiresDupr)}>
                      {adminActivityKindLabel(a.type, a.requiresDupr)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatActivityDateTime(a.startAt)} · {a.venue.name}
                    {a.court ? ` · ${a.court.name}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    名額 {sumPartySize(a.bookings)} / {a.capacity}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">場館據點</h2>
        <ul className="mt-3 space-y-2">
          {tenant.venues.map((v) => (
            <li key={v.id} className="text-sm text-zinc-600">
              {v.name}
              {v.address && ` — ${v.address}`}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
