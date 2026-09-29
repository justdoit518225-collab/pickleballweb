import { requireTenantStaff } from "@/lib/authz";
import { buildDuprCsv, getTenantDuprEvent } from "@/lib/dupr-event";
import { getTaipeiYmd } from "@/lib/venue-timezone";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> },
) {
  const { tenantSlug, id } = await params;
  const { tenant } = await requireTenantStaff(tenantSlug);
  const event = await getTenantDuprEvent(tenant.id, id);
  if (!event) return new Response("Not found", { status: 404 });

  const filename = `dupr-${getTaipeiYmd(event.startAt)}-${event.id.slice(-6)}.csv`;
  return new Response(`\uFEFF${buildDuprCsv(event)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
