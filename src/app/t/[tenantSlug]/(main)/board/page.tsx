import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BoardPageBody,
  parseDayParam,
} from "@/components/tenant/board-page-body";
import { LohoBoardBody } from "@/components/tenant/loho-board-body";
import { getTenantBySlug } from "@/lib/tenant";
import { ROUTES, usesHourlyBoardHome } from "@/lib/constants";

export default async function DayBoardPage({
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
    <div>
      <section className="bg-brand-navy py-8 text-white sm:py-10">
        <div className="page-wrap flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href={ROUTES.tenant(tenantSlug)}
              className="text-xs font-bold text-brand-lime hover:underline"
            >
              ← 返回 {tenant.displayName}
            </Link>
            <h1 className="type-head mt-2 text-white">{tenant.displayName} · 球場看板</h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs font-bold">
            <Link
              href={ROUTES.tenantActivities(tenantSlug)}
              className="bg-white/12 px-3.5 py-2 text-white hover:bg-white hover:text-brand-navy"
            >
              活動列表
            </Link>
            <Link
              href={ROUTES.tenantAbout(tenantSlug)}
              className="bg-white/12 px-3.5 py-2 text-white hover:bg-white hover:text-brand-navy"
            >
              關於場館
            </Link>
          </nav>
        </div>
      </section>

      <div className="page-wrap py-10">
        {usesHourlyBoardHome(tenantSlug) ? (
          <LohoBoardBody
            tenantId={tenant.id}
            tenantSlug={tenantSlug}
            day={day}
            basePath={ROUTES.tenantBoard(tenantSlug)}
          />
        ) : (
          <BoardPageBody tenantId={tenant.id} tenantSlug={tenantSlug} day={day} />
        )}
      </div>
    </div>
  );
}
