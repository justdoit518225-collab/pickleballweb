import { ActivityForm } from "@/components/admin/activity-form";
import { requireTenantStaff } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function NewActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ error?: string; type?: string }>;
}) {
  const { tenantSlug } = await params;
  const { error, type } = await searchParams;
  const duprMode = type === "dupr";
  const defaultType =
    type === "course" ? "COURSE" : type === "open-play" || duprMode ? "OPEN_PLAY" : undefined;
  const { tenant } = await requireTenantStaff(tenantSlug);

  const venues = await prisma.venue.findMany({
    where: { tenantId: tenant.id, isActive: true },
    include: { courts: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  });

  const title = duprMode
    ? "DUPR 活動"
    : defaultType === "COURSE"
      ? "課程"
      : defaultType === "OPEN_PLAY"
        ? "球敘"
        : "活動";

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-slate-800">建立{title}</h2>
      {duprMode && (
        <p className="mt-2 text-sm text-slate-600">
          會員須已於會員中心連結 DUPR 才能報名此活動。
        </p>
      )}
      <div className="mt-6">
        <ActivityForm
          tenantSlug={tenantSlug}
          venues={venues}
          error={error}
          defaultType={defaultType}
          duprMode={duprMode}
          allowBatch={defaultType === "OPEN_PLAY" || defaultType === "COURSE"}
        />
      </div>
    </div>
  );
}
