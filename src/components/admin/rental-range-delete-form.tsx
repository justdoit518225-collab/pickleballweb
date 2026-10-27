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
      className="space-y-4 bg-white p-6"
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
        <h2 className="text-[20px] font-black text-brand-navy">依區間批量刪除</h2>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          刪除指定日期與球場內、狀態為開放或封鎖的時段；已有人預約的時段會保留。
        </p>
      </div>
      <fieldset>
        <legend className="text-[14px] font-bold text-brand-navy">球場（可多選）</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {courts.map((c) => (
            <label key={c.id} className="flex items-center gap-2 bg-[var(--bg)] px-3 py-2 text-[14px] font-bold text-brand-navy">
              <input type="checkbox" name="courtIds" value={c.id} />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[14px] font-bold text-brand-navy">開始日期</label>
          <input
            type="date"
            name="startDate"
            required
            defaultValue={defaultStartDate}
            className="mt-1 w-full bg-[var(--bg)] px-4 py-2 text-[14px] text-brand-navy"
          />
        </div>
        <div>
          <label className="block text-[14px] font-bold text-brand-navy">結束日期</label>
          <input
            type="date"
            name="endDate"
            required
            defaultValue={defaultEndDate}
            className="mt-1 w-full bg-[var(--bg)] px-4 py-2 text-[14px] text-brand-navy"
          />
        </div>
      </div>
      <button
        type="submit"
        className="bg-[#FCECE9] px-5 py-2.5 text-[14px] font-black text-[#B42318] hover:bg-[#F8D7D1]"
      >
        刪除區間內未預約時段
      </button>
    </form>
  );
}
