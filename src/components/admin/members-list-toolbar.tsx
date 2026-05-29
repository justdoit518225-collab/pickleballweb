import Link from "next/link";
import { MEMBER_PAGE_SIZES, type AdminMembersListParams } from "@/lib/admin-members-list";
import { ROUTES } from "@/lib/constants";

export function MembersListToolbar({
  tenantSlug,
  total,
  totalPages,
  params,
}: {
  tenantSlug: string;
  total: number;
  totalPages: number;
  params: AdminMembersListParams;
}) {
  const { page, pageSize, view, q } = params;
  const baseQuery = { pageSize, view, q: q || undefined };

  const pageLink = (p: number) =>
    ROUTES.tenantAdminMembers(tenantSlug, { ...baseQuery, page: p });

  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <div className="space-y-3">
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
      >
        <input type="hidden" name="page" value="1" />
        {view === "scroll" && <input type="hidden" name="view" value="scroll" />}

        <div>
          <label htmlFor="members-q" className="block text-xs font-medium text-slate-600">
            搜尋
          </label>
          <input
            id="members-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="姓名、Email、暱稱…"
            className="mt-1 w-full min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="members-pageSize" className="block text-xs font-medium text-slate-600">
            顯示筆數
          </label>
          <select
            id="members-pageSize"
            name="pageSize"
            defaultValue={pageSize}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {MEMBER_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} 筆
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="members-view" className="block text-xs font-medium text-slate-600">
            顯示方式
          </label>
          <select
            id="members-view"
            name="view"
            defaultValue={view}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="paginate">分頁</option>
            <option value="scroll">固定高度（捲動）</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          套用
        </button>

        {(q || view !== "paginate" || pageSize !== 25) && (
          <Link
            href={ROUTES.tenantAdminMembers(tenantSlug)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            重設
          </Link>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <p>
          共 <span className="font-medium text-slate-800">{total}</span> 位會員
          {view === "paginate" && totalPages > 1 && (
            <>
              {" "}
              · 第 {page} / {totalPages} 頁
            </>
          )}
          {view === "scroll" && (
            <span className="text-slate-500"> · 顯示前 {Math.min(pageSize, total)} 筆（可捲動）</span>
          )}
        </p>

        {view === "paginate" && totalPages > 1 && (
          <nav className="flex flex-wrap items-center gap-1" aria-label="會員列表分頁">
            {page > 1 ? (
              <Link
                href={pageLink(page - 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50"
              >
                上一頁
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-slate-400">
                上一頁
              </span>
            )}

            {pageNumbers.map((n, i) =>
              n === "…" ? (
                <span key={`ellipsis-${i}`} className="px-2 text-slate-400">
                  …
                </span>
              ) : (
                <Link
                  key={n}
                  href={pageLink(n)}
                  className={`min-w-[2.25rem] rounded-lg border px-3 py-1.5 text-center ${
                    n === page
                      ? "border-brand-navy bg-brand-navy text-white"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  aria-current={n === page ? "page" : undefined}
                >
                  {n}
                </Link>
              ),
            )}

            {page < totalPages ? (
              <Link
                href={pageLink(page + 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50"
              >
                下一頁
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-slate-400">
                下一頁
              </span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}
