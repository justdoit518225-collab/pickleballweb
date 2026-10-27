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
    <div>
      {/* Club Header Band */}
      <section className="bg-brand-navy py-10 text-white sm:py-12">
        <div className="page-wrap flex flex-wrap items-end justify-between gap-6">
          <div>
            <Link
              href={ROUTES.home}
              className="text-xs font-bold text-brand-lime hover:underline"
            >
              ← PlayPlayPlay 俱樂部總覽
            </Link>
            <h1 className="type-head mt-2 text-white">{tenant.displayName}</h1>
            {tenant.description ? (
              <p className="mt-2 max-w-2xl text-sm text-white/80">
                {tenant.description}
              </p>
            ) : null}
          </div>
          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            <Link
              href={ROUTES.tenantActivities(tenantSlug, "course")}
              className="bg-brand-teal px-4 py-2.5 text-white transition-colors hover:bg-brand-lime hover:text-brand-navy"
            >
              教練課程
            </Link>
            <Link
              href={ROUTES.meBookings}
              className="bg-white/10 px-4 py-2.5 text-white transition-colors hover:bg-white hover:text-brand-navy"
            >
              我的報名
            </Link>
            <Link
              href={ROUTES.tenantAbout(tenantSlug)}
              className="bg-white/10 px-4 py-2.5 text-white transition-colors hover:bg-white hover:text-brand-navy"
            >
              關於場館與評價
            </Link>
          </nav>
        </div>
      </section>

      <div className="page-wrap py-10">
        <LohoBoardBody
          tenantId={tenant.id}
          tenantSlug={tenantSlug}
          day={day}
          basePath={ROUTES.tenant(tenantSlug)}
        />
      </div>
    </div>
  );
}
