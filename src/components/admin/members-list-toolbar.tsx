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
    <div className="space-y-4">
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 bg-white p-5"
      >
        <input type="hidden" name="page" value="1" />
        {view === "scroll" && <input type="hidden" name="view" value="scroll" />}

        <div className="min-w-[200px] flex-1">
          <label htmlFor="members-q" className="block text-[14px] font-bold text-brand-navy">
            搜尋
          </label>
          <input
            id="members-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="姓名、Email、暱稱、LINE ID…"
            className="mt-1 w-full bg-[var(--bg)] px-4 py-2 text-[14px] text-brand-navy"
          />
        </div>

        <div>
          <label htmlFor="members-pageSize" className="block text-[14px] font-bold text-brand-navy">
            顯示筆數
          </label>
          <select
            id="members-pageSize"
            name="pageSize"
            defaultValue={pageSize}
            className="mt-1 bg-[var(--bg)] px-4 py-2 text-[14px] font-bold text-brand-navy"
          >
            {MEMBER_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} 筆
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="members-view" className="block text-[14px] font-bold text-brand-navy">
            顯示方式
          </label>
          <select
            id="members-view"
            name="view"
            defaultValue={view}
            className="mt-1 bg-[var(--bg)] px-4 py-2 text-[14px] font-bold text-brand-navy"
          >
            <option value="paginate">分頁</option>
            <option value="scroll">固定高度（捲動）</option>
          </select>
        </div>

        <button
          type="submit"
          className="bg-brand-navy px-5 py-2 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy"
        >
          套用
        </button>

        {(q || view !== "paginate" || pageSize !== 25) && (
          <Link
            href={ROUTES.tenantAdminMembers(tenantSlug)}
            className="bg-[var(--bg)] px-4 py-2 text-[14px] font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
          >
            重設
          </Link>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[14px] font-bold text-brand-navy">
        <p>
          共 <span className="font-mono font-black">{total}</span> 位會員
          {view === "paginate" && totalPages > 1 && (
            <>
              {" "}
              · 第 {page} / {totalPages} 頁
            </>
          )}
          {view === "scroll" && (
            <span className="text-[var(--muted)]"> · 顯示前 {Math.min(pageSize, total)} 筆（可捲動）</span>
          )}
        </p>

        {view === "paginate" && totalPages > 1 && (
          <nav className="flex flex-wrap items-center gap-1" aria-label="會員列表分頁">
            {page > 1 ? (
              <Link
                href={pageLink(page - 1)}
                className="bg-white px-3 py-1.5 font-bold text-brand-navy hover:bg-brand-lime"
              >
                上一頁
              </Link>
            ) : (
              <span className="bg-[var(--surface-alt)] px-3 py-1.5 text-[var(--muted)]">
                上一頁
              </span>
            )}

            {pageNumbers.map((n, i) =>
              n === "…" ? (
                <span key={`ellipsis-${i}`} className="px-2 text-[var(--muted)]">
                  …
                </span>
              ) : (
                <Link
                  key={n}
                  href={pageLink(n)}
                  className={`min-w-[2.25rem] px-3 py-1.5 text-center font-mono font-black ${
                    n === page
                      ? "bg-brand-navy text-white"
                      : "bg-white text-brand-navy hover:bg-brand-lime"
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
                className="bg-white px-3 py-1.5 font-bold text-brand-navy hover:bg-brand-lime"
              >
                下一頁
              </Link>
            ) : (
              <span className="bg-[var(--surface-alt)] px-3 py-1.5 text-[var(--muted)]">
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
