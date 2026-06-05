import { notFound } from "next/navigation";
import {
  BoardPageBody,
  parseDayParam,
} from "@/components/tenant/board-page-body";
import { getTenantBySlug } from "@/lib/tenant";

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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <BoardPageBody tenantId={tenant.id} tenantSlug={tenantSlug} day={day} />
    </div>
  );
}
