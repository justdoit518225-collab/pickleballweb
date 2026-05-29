import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { activityKindBadgeVariant, adminActivityKindLabel, ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { sumPartySize } from "@/lib/activity-capacity";
import { formatActivityDateTime } from "@/lib/format-datetime";
import {
  buildTenantActivityWhere,
  getTenantActivityFilterTypes,
  isTenantActivityFilterType,
  TENANT_ACTIVITY_FILTER_LABELS,
  TENANT_ACTIVITY_FILTER_ORDER,
} from "@/lib/tenant-activity-filters";

export default async function TenantActivitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { tenantSlug } = await params;
  const { type } = await searchParams;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const activeType = isTenantActivityFilterType(type) ? type : undefined;

  const [filterTypes, activities] = await Promise.all([
    getTenantActivityFilterTypes(tenant.id),
    prisma.activity.findMany({
      where: buildTenantActivityWhere(tenant.id, activeType),
      include: {
        venue: true,
        bookings: { where: { status: "CONFIRMED" }, select: { partySize: true } },
      },
      orderBy: { startAt: "asc" },
      take: 50,
    }),
  ]);

  const showFilters = filterTypes.length > 0;
  const soleFilterType = filterTypes.length === 1 ? filterTypes[0] : undefined;

  const isFilterActive = (tab: "all" | (typeof filterTypes)[number]) => {
    if (tab === "all") return !activeType && filterTypes.length > 1;
    if (soleFilterType === tab) return !activeType || activeType === tab;
    return activeType === tab;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href={ROUTES.tenant(tenantSlug)} className="text-sm text-emerald-600">
        ← {tenant.displayName}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-800">活動列表</h1>

      {showFilters && (
        <nav className="mt-4 flex flex-wrap gap-2">
          {filterTypes.length > 1 && (
            <Link
              href={ROUTES.tenantActivities(tenantSlug)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                isFilterActive("all")
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white"
              }`}
            >
              全部
            </Link>
          )}
          {TENANT_ACTIVITY_FILTER_ORDER.filter((t) => filterTypes.includes(t)).map((t) => (
            <Link
              key={t}
              href={ROUTES.tenantActivities(tenantSlug, t)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                isFilterActive(t)
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white"
              }`}
            >
              {TENANT_ACTIVITY_FILTER_LABELS[t]}
            </Link>
          ))}
        </nav>
      )}

      <ul className="mt-6 space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-slate-500">目前沒有符合條件的活動</p>
        ) : (
          activities.map((a) => (
            <li key={a.id}>
              <Link
                href={ROUTES.tenantActivity(tenantSlug, a.id)}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-200"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="font-medium text-slate-800">{a.title}</span>
                  <Badge variant={activityKindBadgeVariant(a.type, a.requiresDupr)}>
                    {adminActivityKindLabel(a.type, a.requiresDupr)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {formatActivityDateTime(a.startAt)} · {a.venue.name} · 名額{" "}
                  {sumPartySize(a.bookings)}/{a.capacity}
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
