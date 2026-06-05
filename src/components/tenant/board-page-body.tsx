import Link from "next/link";
import { auth } from "@/auth";
import { DayBoardClient } from "@/components/tenant/day-board-client";
import { getDayBoard } from "@/lib/day-board";
import { ROUTES } from "@/lib/constants";

export function parseDayParam(value: string | undefined): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  const d = new Date(`${value}T12:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function BoardPageBody({
  tenantId,
  tenantSlug,
  day,
  basePath,
}: {
  tenantId: string;
  tenantSlug: string;
  day: Date;
  /** 日期切換連結基底，預設前台看板路徑 */
  basePath?: string;
}) {
  const session = await auth();
  const { courts, dateLabel } = await getDayBoard(
    tenantId,
    tenantSlug,
    day,
    session?.user?.id,
  );
  const dateValue = toDateInputValue(day);
  const base = basePath ?? ROUTES.tenantBoard(tenantSlug);
  const dateLink = (d: Date) => `${base}?date=${toDateInputValue(d)}`;

  const prev = new Date(day);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);

  return (
    <div className="space-y-6">
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
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
            href={dateLink(prev)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50"
          >
            前一天
          </Link>
          <Link
            href={dateLink(next)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50"
          >
            後一天
          </Link>
        </div>
      </form>

      <DayBoardClient
        tenantSlug={tenantSlug}
        dateLabel={dateLabel}
        courts={courts}
        loggedIn={Boolean(session?.user)}
      />
    </div>
  );
}
