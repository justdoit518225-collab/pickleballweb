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
  type TenantActivityFilterType,
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
        court: true,
        bookings: { where: { status: "CONFIRMED" }, select: { partySize: true } },
      },
      orderBy: { startAt: "asc" },
      take: 50,
    }),
  ]);

  const displayFilters = Array.from(
    new Set([...filterTypes, ...(activeType ? [activeType] : [])]),
  );
  const showFilters = displayFilters.length > 0;
  const soleFilterType = displayFilters.length === 1 ? displayFilters[0] : undefined;

  const isFilterActive = (tab: "all" | TenantActivityFilterType) => {
    if (tab === "all") return !activeType && displayFilters.length > 1;
    if (soleFilterType === tab) return !activeType || activeType === tab;
    return activeType === tab;
  };

  const pageTitle =
    activeType === "course"
      ? "教練課程列表"
      : activeType === "open-play"
        ? "臨打球敘列表"
        : activeType === "dupr"
          ? "DUPR 積分活動"
          : "全部活動列表";

  return (
    <div>
      <section className="bg-brand-navy py-10 text-white sm:py-12">
        <div className="page-wrap">
          <Link
            href={ROUTES.tenant(tenantSlug)}
            className="text-xs font-bold text-brand-lime hover:underline"
          >
            ← 返回 {tenant.displayName}
          </Link>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h1 className="type-head text-white">{pageTitle}</h1>
            {showFilters && (
              <nav className="flex flex-wrap gap-2">
                {displayFilters.length > 1 && (
                  <Link
                    href={ROUTES.tenantActivities(tenantSlug)}
                    className={`px-4 py-2 text-sm font-bold transition-colors ${
                      isFilterActive("all")
                        ? "bg-brand-lime text-brand-navy"
                        : "bg-white/12 text-white hover:bg-white hover:text-brand-navy"
                    }`}
                  >
                    全部
                  </Link>
                )}
                {TENANT_ACTIVITY_FILTER_ORDER.filter((t) => displayFilters.includes(t)).map((t) => (
                  <Link
                    key={t}
                    href={ROUTES.tenantActivities(tenantSlug, t)}
                    className={`px-4 py-2 text-sm font-bold transition-colors ${
                      isFilterActive(t)
                        ? "bg-brand-lime text-brand-navy"
                        : "bg-white/12 text-white hover:bg-white hover:text-brand-navy"
                    }`}
                  >
                    {TENANT_ACTIVITY_FILTER_LABELS[t]}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>
      </section>

      <div className="page-wrap py-12">
        {activities.length === 0 ? (
          <div className="bg-[var(--surface)] p-8">
            <p className="text-base font-semibold text-[var(--muted)]">目前沒有符合條件的活動。</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {activities.map((a) => {
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
                          名額
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
                        {isFull ? "可排候補" : "查看詳情 →"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
