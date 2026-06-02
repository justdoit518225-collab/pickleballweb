"use client";

import { deleteRentalSlotsInRange } from "@/app/admin/[tenantSlug]/rental-actions";

type CourtOption = { id: string; label: string };

export function RentalRangeDeleteForm({
  tenantSlug,
  courts,
  defaultStartDate,
  defaultEndDate,
}: {
  tenantSlug: string;
  courts: CourtOption[];
  defaultStartDate: string;
  defaultEndDate: string;
}) {
  const action = deleteRentalSlotsInRange.bind(null, tenantSlug);

  return (
    <form
      action={action}
      className="rounded-xl border border-red-100 bg-red-50/50 p-6 shadow-sm space-y-4"
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        const courtIds = fd.getAll("courtIds");
        const start = String(fd.get("startDate") ?? "");
        const end = String(fd.get("endDate") ?? "");
        if (!courtIds.length) {
          e.preventDefault();
          alert("請至少選擇一個球場");
          return;
        }
        if (
          !confirm(
            `確定刪除 ${start} ～ ${end} 所選球場中、未預約的開放／封鎖時段？\n（已預約 BOOKED 不會刪除）`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <div>
        <h2 className="font-semibold text-slate-800">依區間批量刪除</h2>
        <p className="mt-1 text-sm text-slate-600">
          刪除指定日期與球場內、狀態為開放或封鎖的時段；已有人預約的時段會保留。
        </p>
      </div>
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">球場（可多選）</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {courts.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="courtIds" value={c.id} className="rounded" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">開始日期</label>
          <input
            type="date"
            name="startDate"
            required
            defaultValue={defaultStartDate}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">結束日期</label>
          <input
            type="date"
            name="endDate"
            required
            defaultValue={defaultEndDate}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        刪除區間內未預約時段
      </button>
    </form>
  );
}
