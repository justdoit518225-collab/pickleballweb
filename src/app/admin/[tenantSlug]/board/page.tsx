import Link from "next/link";
import { AdminBoardView } from "@/components/admin/admin-board-view";
import { AdminHourlyBoardView } from "@/components/admin/admin-hourly-board-view";
import { requireTenantStaff } from "@/lib/authz";
import { getAdminDayBoard } from "@/lib/admin-board";
import { getAdminHourlyBoard } from "@/lib/hourly-board";
import {
  parseDayParam,
  toDateInputValue,
} from "@/components/tenant/board-page-body";
import { usesHourlyBoardHome } from "@/lib/constants";

export default async function AdminBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { tenantSlug } = await params;
  const { date: dateParam } = await searchParams;
  const { tenant } = await requireTenantStaff(tenantSlug);

  const day = parseDayParam(dateParam);
  const dateValue = toDateInputValue(day);

  const prev = new Date(day);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);
  const base = `/admin/${tenantSlug}/board`;

  const dateNav = (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 bg-white p-5"
    >
      <div>
        <label htmlFor="admin-board-date" className="block text-[14px] font-bold text-brand-navy">
          選擇日期
        </label>
        <input
          id="admin-board-date"
          type="date"
          name="date"
          defaultValue={dateValue}
          className="mt-1 bg-[var(--bg)] px-4 py-2 text-[14px] font-bold text-brand-navy"
        />
      </div>
      <button
        type="submit"
        className="bg-brand-navy px-4 py-2 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy"
      >
        查看
      </button>
      <div className="flex gap-2 text-[14px]">
        <Link
          href={`${base}?date=${toDateInputValue(prev)}`}
          className="bg-[var(--bg)] px-4 py-2 font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
        >
          前一天
        </Link>
        <Link
          href={`${base}?date=${toDateInputValue(next)}`}
          className="bg-[var(--bg)] px-4 py-2 font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
        >
          後一天
        </Link>
      </div>
    </form>
  );

  if (usesHourlyBoardHome(tenantSlug)) {
    const hourly = await getAdminHourlyBoard(tenant.id, day);
    return (
      <div className="space-y-6">
        {dateNav}
        <AdminHourlyBoardView
          tenantSlug={tenantSlug}
          date={dateValue}
          dateLabel={hourly.dateLabel}
          columns={hourly.columns}
          hours={hourly.hours}
          members={hourly.members}
          moveTargets={hourly.moveTargets}
        />
      </div>
    );
  }

  const block = await getAdminDayBoard(tenant.id, day);

  return (
    <div className="space-y-6">
      {dateNav}
      <AdminBoardView
        tenantSlug={tenantSlug}
        date={dateValue}
        dateLabel={block.dateLabel}
        courts={block.courts}
        members={block.members}
        moveTargets={block.moveTargets}
      />
    </div>
  );
}
