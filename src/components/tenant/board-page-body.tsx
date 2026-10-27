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
    <div className="space-y-6" data-ui>
      <form
        method="get"
        className="flex flex-wrap items-end justify-between gap-4 bg-[var(--surface)] p-5"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="board-date" className="block text-xs font-bold text-[var(--muted)]">
              選擇查詢日期
            </label>
            <input
              id="board-date"
              type="date"
              name="date"
              defaultValue={dateValue}
              className="mt-1.5 bg-[var(--bg)] px-3.5 py-2 text-sm font-bold text-brand-navy tabular-nums focus:outline-2 focus:outline-brand-teal"
            />
          </div>
          <button
            type="submit"
            className="bg-brand-navy px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-teal"
          >
            切換日期
          </button>
        </div>

        <div className="flex gap-2 text-sm font-bold">
          <Link
            href={dateLink(prev)}
            className="bg-[var(--surface-alt)] px-4 py-2 text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
          >
            ← 前一天
          </Link>
          <Link
            href={dateLink(next)}
            className="bg-[var(--surface-alt)] px-4 py-2 text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
          >
            後一天 →
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
