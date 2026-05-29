import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ActivityListFilters } from "@/components/admin/activity-list-filters";
import { requireTenantStaff } from "@/lib/authz";
import {
  activityStatusBadgeVariant,
  activityStatusLabel,
  adminActivityOrderBy,
  buildAdminActivityWhere,
  LIST_LIMIT,
  type AdminActivityFilterParams,
} from "@/lib/admin-activity-filters";
import { withPrisma } from "@/lib/prisma";
import { sumPartySize } from "@/lib/activity-capacity";
import { activityKindBadgeVariant, adminActivityKindLabel, ROUTES } from "@/lib/constants";
import { formatAdminActivityDateTime } from "@/lib/format-datetime";

export default async function TenantAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<
    AdminActivityFilterParams & { batchCreated?: string }
  >;
}) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const { batchCreated, type, status, when, venue, q } = sp;
  const { tenant } = await requireTenantStaff(tenantSlug);

  const filterParams: AdminActivityFilterParams = { type, status, when, venue, q };
  const where = buildAdminActivityWhere(tenant.id, filterParams);
  const orderBy = adminActivityOrderBy(when);

  const { activities, activityTotal, venues, rentalCount } = await withPrisma(async (db) => {
    const activities = await db.activity.findMany({
      where,
      include: {
        venue: true,
        bookings: {
          where: { status: "CONFIRMED" },
          select: { partySize: true },
        },
      },
      orderBy,
      take: LIST_LIMIT,
    });
    const activityTotal = await db.activity.count({ where });
    const venues = await db.venue.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    const rentalCount = await db.rentalSlot.count({
      where: { tenantId: tenant.id, startAt: { gte: new Date() } },
    });
    return { activities, activityTotal, venues, rentalCount };
  });

  return (
    <div>
      {batchCreated && (
        <p className="mb-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          已批次建立 {batchCreated} 場活動
        </p>
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href={ROUTES.tenantAdminActivityNew(tenantSlug, "open-play")}
          className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm hover:border-emerald-200"
        >
          <h2 className="font-semibold text-emerald-800">＋ 球敘活動</h2>
        </Link>
        <Link
          href={ROUTES.tenantAdminActivityNew(tenantSlug, "course")}
          className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm hover:border-blue-200"
        >
          <h2 className="font-semibold text-blue-800">＋ 課程活動</h2>
        </Link>
        <Link
          href={ROUTES.tenantAdminActivityNew(tenantSlug, "dupr")}
          className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm hover:border-indigo-200"
        >
          <h2 className="font-semibold text-indigo-800">＋ DUPR 活動</h2>
          <p className="mt-1 text-xs text-indigo-600/90">需連結 DUPR 才可報名</p>
        </Link>
        <Link
          href={ROUTES.tenantAdminRentals(tenantSlug)}
          className="rounded-xl border border-violet-100 bg-violet-50/50 p-5 shadow-sm hover:border-violet-200"
        >
          <h2 className="font-semibold text-violet-800">場地租借 · {rentalCount} 時段</h2>
        </Link>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-slate-800">活動列表</h2>
          <p className="text-sm text-slate-500">
            共 {activityTotal} 筆
            {activityTotal > LIST_LIMIT && `（顯示前 ${LIST_LIMIT} 筆，請縮小篩選）`}
          </p>
        </div>

        <ActivityListFilters
          tenantSlug={tenantSlug}
          venues={venues}
          values={{ type, status, when, venue, q }}
        />

        {activities.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">沒有符合條件的活動，請調整篩選或建立新活動。</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {activities.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
              >
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={activityKindBadgeVariant(a.type, a.requiresDupr)}>
                    {adminActivityKindLabel(a.type, a.requiresDupr)}
                  </Badge>
                  <span className="min-w-[3.5rem] text-center text-slate-600 tabular-nums">
                    {sumPartySize(a.bookings)}/{a.capacity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/${tenantSlug}/activities/${a.id}/edit`}
                    className="font-medium text-slate-800 hover:text-emerald-600"
                  >
                    {a.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatAdminActivityDateTime(a.startAt)}
                    {" · "}
                    {a.venue.name}
                  </p>
                </div>
                <div className="shrink-0">
                  <Badge variant={activityStatusBadgeVariant(a.status)}>
                    {activityStatusLabel(a.status)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
