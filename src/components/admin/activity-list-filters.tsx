import Link from "next/link";
import { ROUTES } from "@/lib/constants";

type VenueOption = { id: string; name: string };

type FilterValues = {
  type?: string;
  status?: string;
  when?: string;
  venue?: string;
  q?: string;
};

export function ActivityListFilters({
  tenantSlug,
  venues,
  values,
}: {
  tenantSlug: string;
  venues: VenueOption[];
  values: FilterValues;
}) {
  const hasFilter = Boolean(
    values.type || values.status || values.when || values.venue || values.q?.trim(),
  );

  const selectClass =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800";
  const labelClass = "sr-only";

  return (
    <form
      method="get"
      className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
    >
      <div>
        <label className={labelClass} htmlFor="filter-type">
          類型
        </label>
        <select
          id="filter-type"
          name="type"
          defaultValue={values.type ?? ""}
          className={selectClass}
          aria-label="類型"
        >
          <option value="">全部類型</option>
          <option value="open-play">球敘</option>
          <option value="course">課程</option>
          <option value="dupr">DUPR</option>
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="filter-status">
          狀態
        </label>
        <select
          id="filter-status"
          name="status"
          defaultValue={values.status ?? ""}
          className={selectClass}
          aria-label="狀態"
        >
          <option value="">全部狀態</option>
          <option value="draft">草稿</option>
          <option value="published">已發布</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="filter-when">
          時間
        </label>
        <select
          id="filter-when"
          name="when"
          defaultValue={values.when ?? "upcoming"}
          className={selectClass}
          aria-label="時間"
        >
          <option value="upcoming">即將舉行</option>
          <option value="past">已結束</option>
          <option value="all">全部時間</option>
        </select>
      </div>
      {venues.length > 1 && (
        <div>
          <label className={labelClass} htmlFor="filter-venue">
            場館
          </label>
          <select
            id="filter-venue"
            name="venue"
            defaultValue={values.venue ?? ""}
            className={selectClass}
            aria-label="場館"
          >
            <option value="">全部場館</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="min-w-[140px] flex-1">
        <label className={labelClass} htmlFor="filter-q">
          搜尋標題
        </label>
        <input
          id="filter-q"
          name="q"
          type="search"
          placeholder="搜尋活動標題…"
          defaultValue={values.q ?? ""}
          className={`${selectClass} w-full min-w-[140px]`}
          aria-label="搜尋標題"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        套用
      </button>
      {hasFilter && (
        <Link
          href={ROUTES.tenantAdmin(tenantSlug)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          清除
        </Link>
      )}
    </form>
  );
}
