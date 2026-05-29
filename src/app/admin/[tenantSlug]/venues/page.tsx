import {
  createCourt,
  createVenue,
  updateCourt,
  updateVenue,
} from "@/app/admin/[tenantSlug]/manage-actions";
import { VenueStatusActions } from "@/components/admin/venue-status-actions";
import { requireTenantStaff } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const fieldClass = "mt-1 w-full rounded-lg border px-3 py-2 text-sm";
const labelClass = "block text-sm font-medium text-slate-700";

export default async function AdminVenuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const { saved, error } = await searchParams;
  const { tenant } = await requireTenantStaff(tenantSlug);

  const venues = await prisma.venue.findMany({
    where: { tenantId: tenant.id },
    include: {
      courts: { orderBy: { sortOrder: "asc" } },
      _count: { select: { activities: true, rentalSlots: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-8">
      {saved && <p className="text-sm text-emerald-600">已儲存</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-sm text-slate-600">
        某季度不再租用時，建議使用「停用場館」：不會出現在新增活動／租借，歷史紀錄仍保留。僅誤建且無任何紀錄時才可刪除。
      </p>

      <form
        action={createVenue.bind(null, tenantSlug)}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
      >
        <h2 className="font-semibold">新增場館</h2>
        <div>
          <label className={labelClass} htmlFor="venue-name">
            場館名稱
          </label>
          <input
            id="venue-name"
            name="name"
            placeholder="例：中和館"
            required
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="venue-slug">
            英文名稱
          </label>
          <input
            id="venue-slug"
            name="slug"
            placeholder="選填，例：zhonghe（僅小寫英文、數字、連字號）"
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-slate-500">留空時系統會依場館名稱自動產生代碼。</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="venue-address">
            地址
          </label>
          <input id="venue-address" name="address" placeholder="選填" className={fieldClass} />
        </div>
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          新增場館
        </button>
      </form>

      {venues.map((v) => {
        const canDelete = v._count.activities === 0 && v._count.rentalSlots === 0;

        return (
          <section
            key={v.id}
            className={`rounded-xl border bg-white p-5 shadow-sm ${
              v.isActive ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-90"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-800">{v.name}</h3>
                  {!v.isActive && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                      已停用
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{v.address ?? "—"}</p>
                <p className="mt-1 text-xs text-slate-400">代碼：{v.slug}</p>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-brand-teal hover:underline">
                  編輯場館
                </summary>
                <form
                  action={updateVenue.bind(null, tenantSlug, v.id)}
                  className="mt-3 min-w-[260px] space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3"
                >
                  <div>
                    <label className={labelClass} htmlFor={`venue-name-${v.id}`}>
                      場館名稱
                    </label>
                    <input
                      id={`venue-name-${v.id}`}
                      name="name"
                      required
                      defaultValue={v.name}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor={`venue-slug-${v.id}`}>
                      英文名稱
                    </label>
                    <input
                      id={`venue-slug-${v.id}`}
                      name="slug"
                      defaultValue={v.slug}
                      placeholder="例：zhonghe"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor={`venue-address-${v.id}`}>
                      地址
                    </label>
                    <input
                      id={`venue-address-${v.id}`}
                      name="address"
                      defaultValue={v.address ?? ""}
                      className={fieldClass}
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-brand-navy px-3 py-1.5 text-sm text-white hover:opacity-90"
                  >
                    儲存場館
                  </button>
                </form>
                <VenueStatusActions
                  tenantSlug={tenantSlug}
                  venueId={v.id}
                  isActive={v.isActive}
                  canDelete={canDelete}
                />
              </details>
            </div>

            {v.isActive && (
              <>
                <ul className="mt-4 space-y-2">
                  {v.courts.length === 0 ? (
                    <li className="text-sm text-slate-500">尚無球場</li>
                  ) : (
                    v.courts.map((c) => (
                      <li
                        key={c.id}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                          c.isActive
                            ? "border-slate-100 bg-slate-50"
                            : "border-slate-100 bg-slate-100 opacity-75"
                        }`}
                      >
                        <span className="text-sm font-medium text-slate-800">
                          {c.name}
                          {!c.isActive && (
                            <span className="ml-2 text-xs text-slate-500">（已停用）</span>
                          )}
                        </span>
                        {c.isActive && (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-brand-teal hover:underline">
                              編輯
                            </summary>
                            <form
                              action={updateCourt.bind(null, tenantSlug, c.id)}
                              className="mt-2 flex gap-2"
                            >
                              <input
                                name="name"
                                required
                                defaultValue={c.name}
                                className="flex-1 rounded-lg border px-2 py-1 text-sm"
                              />
                              <button
                                type="submit"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm hover:bg-slate-50"
                              >
                                儲存
                              </button>
                            </form>
                          </details>
                        )}
                      </li>
                    ))
                  )}
                </ul>

                <form action={createCourt.bind(null, tenantSlug)} className="mt-4 flex gap-2">
                  <input type="hidden" name="venueId" value={v.id} />
                  <input
                    name="name"
                    placeholder="新球場名稱"
                    className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  />
                  <button type="submit" className="rounded-lg border px-3 py-2 text-sm">
                    ＋球場
                  </button>
                </form>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
