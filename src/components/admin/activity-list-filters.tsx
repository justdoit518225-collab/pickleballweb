import type { ReactNode } from "react";
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

function SelectChevron() {
  return (
    <span
      className="pointer-events-none absolute inset-y-0 right-3.5 flex w-5 items-center justify-center text-slate-500"
      aria-hidden
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path
          fillRule="evenodd"
          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

function FilterSelect({
  id,
  name,
  label,
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-label={label}
        className="min-w-[8.25rem] w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-12 text-sm text-slate-800"
      >
        {children}
      </select>
      <SelectChevron />
    </div>
  );
}

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

  const inputClass =
    "w-full min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800";

  return (
    <form
      method="get"
      className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
    >
      <FilterSelect id="filter-type" name="type" label="類型" defaultValue={values.type ?? ""}>
        <option value="">全部類型</option>
        <option value="open-play">球敘</option>
        <option value="course">課程</option>
        <option value="dupr">DUPR</option>
      </FilterSelect>

      <FilterSelect id="filter-status" name="status" label="狀態" defaultValue={values.status ?? ""}>
        <option value="">全部狀態</option>
        <option value="draft">草稿</option>
        <option value="published">已發布</option>
        <option value="cancelled">已取消</option>
      </FilterSelect>

      <FilterSelect id="filter-when" name="when" label="時間" defaultValue={values.when ?? "upcoming"}>
        <option value="upcoming">即將舉行</option>
        <option value="past">已結束</option>
        <option value="all">全部時間</option>
      </FilterSelect>

      {venues.length > 1 && (
        <FilterSelect id="filter-venue" name="venue" label="場館" defaultValue={values.venue ?? ""}>
          <option value="">全部場館</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </FilterSelect>
      )}

      <div className="min-w-[140px] flex-1">
        <label className="sr-only" htmlFor="filter-q">
          搜尋標題
        </label>
        <input
          id="filter-q"
          name="q"
          type="search"
          placeholder="搜尋活動標題…"
          defaultValue={values.q ?? ""}
          className={inputClass}
          aria-label="搜尋標題"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        套用
      </button>
      {hasFilter && (
        <Link
          href={ROUTES.tenantAdmin(tenantSlug)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          清除
        </Link>
      )}
    </form>
  );
}
