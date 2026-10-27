import Link from "next/link";
import { auth } from "@/auth";
import { HourlyBoardClient } from "@/components/tenant/hourly-board-client";
import {
  toDateInputValue,
} from "@/components/tenant/board-page-body";
import { getHourlyBoard } from "@/lib/hourly-board";

/** 樂活專用：今日 × A/B/C × 每小時格狀看板 */
export async function LohoBoardBody({
  tenantId,
  tenantSlug,
  day,
  basePath,
}: {
  tenantId: string;
  tenantSlug: string;
  day: Date;
  basePath: string;
}) {
  const session = await auth();
  const { columns, hours, dateLabel } = await getHourlyBoard(
    tenantId,
    day,
    session?.user?.id,
  );
  const dateValue = toDateInputValue(day);
  const prev = new Date(day);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);
  const dateLink = (d: Date) => `${basePath}?date=${toDateInputValue(d)}`;

  return (
    <div className="space-y-6" data-ui>
      <form
        method="get"
        className="flex flex-wrap items-end justify-between gap-4 bg-[var(--surface)] p-5"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="loho-date" className="block text-xs font-bold text-[var(--muted)]">
              選擇查詢日期
            </label>
            <input
              id="loho-date"
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

      <HourlyBoardClient
        tenantSlug={tenantSlug}
        dateLabel={dateLabel}
        columns={columns}
        hours={hours}
        loggedIn={Boolean(session?.user)}
      />
    </div>
  );
}
