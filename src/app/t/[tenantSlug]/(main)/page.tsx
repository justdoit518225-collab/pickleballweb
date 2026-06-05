import Link from "next/link";
import { notFound } from "next/navigation";
import { parseDayParam } from "@/components/tenant/board-page-body";
import { LohoBoardBody } from "@/components/tenant/loho-board-body";
import { TenantClassicHome } from "@/components/tenant/tenant-classic-home";
import { getTenantBySlug } from "@/lib/tenant";
import { ROUTES, usesHourlyBoardHome } from "@/lib/constants";

export default async function TenantHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { tenantSlug } = await params;
  const { date: dateParam } = await searchParams;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  if (!usesHourlyBoardHome(tenantSlug)) {
    return <TenantClassicHome tenant={tenant} />;
  }

  const day = parseDayParam(dateParam);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{tenant.displayName}</h1>
          {tenant.description && (
            <p className="mt-1 text-sm text-slate-600">{tenant.description}</p>
          )}
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link
            href={ROUTES.tenantActivities(tenantSlug, "course")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            課程
          </Link>
          <Link
            href={ROUTES.meBookings}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            我的報名
          </Link>
          <Link
            href={ROUTES.tenantAbout(tenantSlug)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            關於場館
          </Link>
        </nav>
      </header>

      <LohoBoardBody
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        day={day}
        basePath={ROUTES.tenant(tenantSlug)}
      />
    </div>
  );
}
