import Link from "next/link";
import { redirect } from "next/navigation";
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
import {
  activityKindBadgeVariant,
  adminActivityKindLabel,
  isDuprOnlyTenant,
  ROUTES,
} from "@/lib/constants";
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
  if (isDuprOnlyTenant(tenantSlug)) {
    redirect(ROUTES.tenantAdminDuprEvents(tenantSlug));
  }
  const sp = await searchParams;
  const { batchCreated, type, status, when, venue, q } = sp;
  const { tenant } = await requireTenantStaff(tenantSlug);

  const filterParams: AdminActivityFilterParams = { type, status, when, venue, q };
  const where = buildAdminActivityWhere(tenant.id, filterParams);
  const orderBy = adminActivityOrderBy(when);

  const { activities, activityTotal, venues } = await withPrisma(async (db) => {
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
    return { activities, activityTotal, venues };
  });

  return (
    <div data-ui className="space-y-8">
      {batchCreated && (
        <p className="bg-[var(--surface-tint)] px-4 py-3 text-[14px] font-bold text-[#1B6B73]">
          已批次建立 {batchCreated} 場活動
        </p>
      )}
      <section className="grid gap-4 sm:grid-cols-3">
        <Link
          href={ROUTES.tenantAdminActivityNew(tenantSlug, "open-play")}
          className="bg-brand-lime p-6 text-brand-navy transition-colors hover:bg-[#9BD35A]"
        >
          <h2 className="text-[20px] font-black text-brand-navy">＋ 球敘活動</h2>
          <p className="mt-1 text-[14px] font-bold text-brand-navy">友善球敘、固定揪團</p>
        </Link>
        <Link
          href={ROUTES.tenantAdminActivityNew(tenantSlug, "course")}
          className="bg-brand-navy p-6 text-white transition-colors hover:bg-[#133463]"
        >
          <h2 className="text-[20px] font-black text-white">＋ 課程活動</h2>
          <p className="mt-1 text-[14px] font-bold text-[#C8D8E4]">教練教學、團體培訓班</p>
        </Link>
        <Link
          href={ROUTES.tenantAdminActivityNew(tenantSlug, "dupr")}
          className="bg-[#1B6B73] p-6 text-white transition-colors hover:bg-[#15575E]"
        >
          <h2 className="text-[20px] font-black text-white">＋ DUPR 活動</h2>
          <p className="mt-1 text-[14px] font-bold text-[#DCEBEC]">需連結 DUPR 才可報名</p>
        </Link>
      </section>

      <section className="bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[20px] font-black text-brand-navy">活動列表</h2>
          <p className="text-[14px] font-bold tabular-nums text-[var(--muted)]">
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
          <p className="mt-6 bg-[var(--bg)] p-6 text-[14px] text-[var(--muted)]">
            沒有符合條件的活動，請調整篩選或建立新活動。
          </p>
        ) : (
          <ul className="mt-5 space-y-2">
            {activities.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 bg-[var(--bg)] px-5 py-4 text-[14px] transition-colors hover:bg-[var(--surface-alt)]"
              >
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={activityKindBadgeVariant(a.type, a.requiresDupr)}>
                    {adminActivityKindLabel(a.type, a.requiresDupr)}
                  </Badge>
                  <span className="min-w-[3.5rem] text-center font-black tabular-nums text-brand-navy">
                    {sumPartySize(a.bookings)}/{a.capacity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/${tenantSlug}/activities/${a.id}/edit`}
                    className="text-[16px] font-black text-brand-navy hover:text-[#1B6B73]"
                  >
                    {a.title}
                  </Link>
                  <p className="mt-0.5 text-[14px] text-[var(--muted)]">
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
