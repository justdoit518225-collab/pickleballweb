import Link from "next/link";
import { auth } from "@/auth";
import { HourlyBoardClient } from "@/components/tenant/hourly-board-client";
import {
  parseDayParam,
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
    <div className="space-y-6">
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <div>
          <label htmlFor="loho-date" className="block text-xs font-medium text-slate-600">
            選擇日期
          </label>
          <input
            id="loho-date"
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
