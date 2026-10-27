import {
  createCourt,
  createVenue,
  updateCourt,
  updateVenue,
} from "@/app/admin/[tenantSlug]/manage-actions";
import { VenueStatusActions } from "@/components/admin/venue-status-actions";
import { requireTenantStaff } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const fieldClass = "mt-1 w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy";
const labelClass = "block text-[14px] font-bold text-brand-navy";

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
      {saved && <p className="bg-[var(--surface-tint)] px-4 py-2 text-[14px] font-bold text-[#1B6B73]">已儲存</p>}
      {error && <p className="bg-[#FCECE9] px-4 py-2 text-[14px] font-bold text-[#B42318]">{error}</p>}

      <p className="text-[14px] text-[var(--muted)]">
        某季度不再租用時，建議使用「停用場館」：不會出現在新增活動／租借，歷史紀錄仍保留。僅誤建且無任何紀錄時才可刪除。
      </p>

      <form
        action={createVenue.bind(null, tenantSlug)}
        className="max-w-xl space-y-4 bg-white p-6"
      >
        <h2 className="text-[20px] font-black text-brand-navy">新增場館</h2>
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
          <p className="mt-1 text-[14px] text-[var(--muted)]">留空時系統會依場館名稱自動產生代碼。</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="venue-address">
            地址
          </label>
          <input id="venue-address" name="address" placeholder="選填" className={fieldClass} />
        </div>
        <button type="submit" className="btn-brand">
          新增場館
        </button>
      </form>

      {venues.map((v) => {
        const canDelete = v._count.activities === 0 && v._count.rentalSlots === 0;

        return (
          <section
            key={v.id}
            className={`p-6 ${v.isActive ? "bg-white" : "bg-[var(--surface-alt)] opacity-90"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[20px] font-black text-brand-navy">{v.name}</h3>
                  {!v.isActive && (
                    <span className="bg-[var(--bg)] px-2.5 py-0.5 text-[14px] font-bold text-[var(--muted)]">
                      已停用
                    </span>
                  )}
                </div>
                <p className="text-[14px] text-[var(--muted)]">{v.address ?? "—"}</p>
                <p className="mt-1 font-mono text-[14px] text-[var(--muted)]">代碼：{v.slug}</p>
              </div>
              <details className="text-[14px]">
                <summary className="cursor-pointer font-black text-[#1B6B73] hover:underline">
                  編輯場館
                </summary>
                <form
                  action={updateVenue.bind(null, tenantSlug, v.id)}
                  className="mt-3 min-w-[260px] space-y-3 bg-[var(--bg)] p-4"
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
                      className="mt-1 w-full bg-white px-3 py-2 text-[14px] text-brand-navy"
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
                      className="mt-1 w-full bg-white px-3 py-2 text-[14px] text-brand-navy"
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
                      className="mt-1 w-full bg-white px-3 py-2 text-[14px] text-brand-navy"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-brand-navy px-4 py-2 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy"
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
                    <li className="text-[14px] text-[var(--muted)]">尚無球場</li>
                  ) : (
                    v.courts.map((c) => (
                      <li
                        key={c.id}
                        className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${
                          c.isActive ? "bg-[var(--bg)]" : "bg-[var(--surface-alt)] opacity-75"
                        }`}
                      >
                        <span className="text-[14px] font-bold text-brand-navy">
                          {c.name}
                          {!c.isActive && (
                            <span className="ml-2 text-[14px] text-[var(--muted)]">（已停用）</span>
                          )}
                        </span>
                        {c.isActive && (
                          <details className="text-[14px]">
                            <summary className="cursor-pointer font-bold text-[#1B6B73] hover:underline">
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
                                className="flex-1 bg-white px-3 py-1.5 text-[14px] text-brand-navy"
                              />
                              <button
                                type="submit"
                                className="bg-brand-navy px-3 py-1.5 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy"
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
                    className="flex-1 bg-[var(--bg)] px-4 py-2 text-[14px] text-brand-navy"
                  />
                  <button
                    type="submit"
                    className="bg-brand-navy px-4 py-2 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy"
                  >
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
