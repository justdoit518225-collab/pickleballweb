import Link from "next/link";
import { notFound } from "next/navigation";
import { DayBoardView } from "@/components/tenant/day-board-view";
import { getDayBoard } from "@/lib/day-board";
import { ROUTES } from "@/lib/constants";
import { getTenantBySlug } from "@/lib/tenant";

function parseDayParam(value: string | undefined): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  const d = new Date(`${value}T12:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
  const { courts, dateLabel } = await getDayBoard(tenant.id, tenantSlug, day);
  const dateValue = toDateInputValue(day);

  const prev = new Date(day);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <div>
          <label htmlFor="board-date" className="block text-xs font-medium text-slate-600">
            選擇日期
          </label>
          <input
            id="board-date"
            type="date"
            name="date"
            defaultValue={dateValue}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          查看
        </button>
        <div className="flex gap-2 text-sm">
          <Link
            href={ROUTES.tenantBoard(tenantSlug, toDateInputValue(prev))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50"
          >
            前一天
          </Link>
          <Link
            href={ROUTES.tenantBoard(tenantSlug, toDateInputValue(next))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50"
          >
            後一天
          </Link>
        </div>
      </form>

      <DayBoardView tenantSlug={tenantSlug} dateLabel={dateLabel} courts={courts} />
    </div>
  );
}
