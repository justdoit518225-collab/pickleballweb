import Link from "next/link";
import { AdminBoardView } from "@/components/admin/admin-board-view";
import { requireTenantStaff } from "@/lib/authz";
import { getAdminDayBoard } from "@/lib/admin-board";
import {
  parseDayParam,
  toDateInputValue,
} from "@/components/tenant/board-page-body";

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
  const { courts, members, moveTargets, dateLabel } = await getAdminDayBoard(
    tenant.id,
    day,
  );

  const prev = new Date(day);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);
  const base = `/admin/${tenantSlug}/board`;

  return (
    <div className="space-y-6">
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <div>
          <label htmlFor="admin-board-date" className="block text-xs font-medium text-slate-600">
            選擇日期
          </label>
          <input
            id="admin-board-date"
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
            href={`${base}?date=${toDateInputValue(prev)}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50"
          >
            前一天
          </Link>
          <Link
            href={`${base}?date=${toDateInputValue(next)}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50"
          >
            後一天
          </Link>
        </div>
      </form>

      <AdminBoardView
        tenantSlug={tenantSlug}
        date={dateValue}
        dateLabel={dateLabel}
        courts={courts}
        members={members}
        moveTargets={moveTargets}
      />
    </div>
  );
}
