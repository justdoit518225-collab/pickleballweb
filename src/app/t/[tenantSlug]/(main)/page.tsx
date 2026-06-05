import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BoardPageBody,
  parseDayParam,
} from "@/components/tenant/board-page-body";
import { getTenantBySlug } from "@/lib/tenant";
import { ROUTES } from "@/lib/constants";

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

  const day = parseDayParam(dateParam);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
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

      <div className="mt-6">
        <BoardPageBody
          tenantId={tenant.id}
          tenantSlug={tenantSlug}
          day={day}
          basePath={ROUTES.tenant(tenantSlug)}
        />
      </div>
    </div>
  );
}
