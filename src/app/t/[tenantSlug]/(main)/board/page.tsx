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

  if (usesHourlyBoardHome(tenantSlug)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="mb-4 text-sm text-slate-500">
          <Link href={ROUTES.tenant(tenantSlug)} className="text-brand-navy hover:underline">
            ← 返回 {tenant.displayName}
          </Link>
        </p>
        <LohoBoardBody
          tenantId={tenant.id}
          tenantSlug={tenantSlug}
          day={day}
          basePath={ROUTES.tenantBoard(tenantSlug)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <BoardPageBody tenantId={tenant.id} tenantSlug={tenantSlug} day={day} />
    </div>
  );
}
