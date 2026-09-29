import Link from "next/link";
import {
  createDuprEventFromFitbook,
  createDuprEventManual,
  deleteDuprEvent,
} from "@/app/admin/[tenantSlug]/dupr-events/actions";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Badge } from "@/components/ui/badge";
import { requireTenantStaff } from "@/lib/authz";
import { ROUTES } from "@/lib/constants";
import { DUPR_EVENT_SOURCE_LABELS, DUPR_EVENT_STATUS_LABELS } from "@/lib/dupr-event";
import {
  fetchFitbookCourses,
  fitbookScheduleUrl,
  getFitbookStore,
  isValidYmd,
  type FitbookCourse,
} from "@/lib/fitbook";
import { getFitbookConnection } from "@/lib/fitbook-session";
import { formatTaipeiDateTime } from "@/lib/format-datetime";
import { prisma } from "@/lib/prisma";
import { getTaipeiYmd } from "@/lib/venue-timezone";

const statusVariant = {
  DRAFT: "draft",
  SCHEDULED: "warning",
  FINALIZED: "published",
  SUBMITTED: "success",
} as const;

export default async function AdminDuprEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ date?: string; error?: string; saved?: string }>;
}) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const { tenant, isTenantAdmin } = await requireTenantStaff(tenantSlug);
  const store = getFitbookStore(tenantSlug);
  const fitbook = store ? await getFitbookConnection(tenant.id) : null;
  const date = sp.date && isValidYmd(sp.date) ? sp.date : getTaipeiYmd(new Date());

  let courses: FitbookCourse[] = [];
  let fitbookError: string | null = null;
  if (store) {
    try {
      courses = await fetchFitbookCourses(store, date);
    } catch (e) {
      fitbookError = e instanceof Error ? e.message : "無法連線 FitBook";
    }
  }

  const events = await prisma.duprEvent.findMany({
    where: { tenantId: tenant.id },
    orderBy: { startAt: "desc" },
    take: 50,
    include: {
      _count: { select: { players: true, matches: true } },
      matches: { select: { confirmedAt: true } },
    },
  });

  return (
    <div className="space-y-8">
      {sp.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</p>
      )}
      {sp.saved && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{sp.saved}</p>
      )}

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-slate-800">DUPR 對戰活動</h2>
          <Link href={ROUTES.tenantDuprEvents(tenantSlug)} className="text-sm text-brand-teal">
            平板計分入口 →
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">尚無 DUPR 對戰活動，請從下方 FitBook 匯入或手動建立。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {events.map((e) => {
              const confirmed = e.matches.filter((m) => m.confirmedAt).length;
              return (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
                >
                  <Badge variant={statusVariant[e.status]}>{DUPR_EVENT_STATUS_LABELS[e.status]}</Badge>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={ROUTES.tenantAdminDuprEvent(tenantSlug, e.id)}
                      className="font-medium text-slate-800 hover:text-emerald-600"
                    >
                      {e.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatTaipeiDateTime(e.startAt)}
                      {e.location ? ` · ${e.location}` : ""}
                      {` · ${DUPR_EVENT_SOURCE_LABELS[e.source]}`}
                    </p>
                  </div>
                  <span className="text-xs tabular-nums text-slate-600">
                    {e._count.players} 人 · 已確認 {confirmed}/{e._count.matches} 場
                  </span>
                  {e.status !== "SUBMITTED" && (
                    <ConfirmForm
                      action={deleteDuprEvent.bind(null, tenantSlug, e.id)}
                      message={`確定刪除「${e.title}」？名單、對戰表與分數將一併刪除。`}
                    >
                      <button type="submit" className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                        刪除
                      </button>
                    </ConfirmForm>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {store && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-slate-800">從 FitBook 匯入報名名單</h2>
            <a
              href={fitbookScheduleUrl(store, date)}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-teal"
            >
              在 FitBook 開啟 {date} ↗
            </a>
          </div>
          {fitbook?.status === "ok" ? (
            <p className="mt-1 text-xs text-emerald-700">
              已連線 FitBook{fitbook.accountName ? `（帳號：${fitbook.accountName}）` : ""}：按「匯入名單」會即時抓取該場「已預約會員」。
              有貼上名單時以貼上的為準。
            </p>
          ) : (
            <p className={`mt-1 text-xs ${fitbook?.status === "expired" ? "text-red-600" : "text-amber-700"}`}>
              {fitbook?.status === "expired" ? "FitBook 登入已失效，" : "尚未連線 FitBook，"}
              {isTenantAdmin ? (
                <>
                  請到
                  <Link href={`${ROUTES.tenantAdminSettings(tenantSlug)}#fitbook`} className="underline">
                    設定 → FitBook 連線
                  </Link>
                  貼上登入 Cookie 以即時抓取名單。
                </>
              ) : (
                "請場館管理員到「設定」更新 FitBook 連線。"
              )}
              目前可複製 FitBook「已預約會員」貼到場次下方匯入；不貼則依報名人數產生模擬名單。
            </p>
          )}

          <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">日期</span>
              <input
                type="date"
                name="date"
                defaultValue={date}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <button type="submit" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
              查詢場次
            </button>
          </form>

          {fitbookError ? (
            <p className="mt-4 text-sm text-red-600">{fitbookError}</p>
          ) : courses.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">這天 FitBook 沒有場次。</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {courses.map((c) => (
                <li key={c.courseId} className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm">
                  <form action={createDuprEventFromFitbook.bind(null, tenantSlug)}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800">{c.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {c.showTime} · {c.categoryName} · 報名 {c.reservationCount} 人 ·{" "}
                          <a href={c.url} target="_blank" rel="noreferrer" className="text-brand-teal">
                            FitBook 名單 ↗
                          </a>
                        </p>
                      </div>
                      <input type="hidden" name="date" value={date} />
                      <input type="hidden" name="courseId" value={c.courseId} />
                      <label className="flex items-center gap-1 text-xs text-slate-600">
                        場地數
                        <input
                          type="number"
                          name="courtCount"
                          min={1}
                          max={16}
                          defaultValue={Math.max(1, Math.floor(c.reservationCount / 6))}
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={c.reservationCount === 0}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:bg-slate-300"
                      >
                        匯入名單
                      </button>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-slate-500">貼上真實名單（選填）</summary>
                      <textarea
                        name="roster"
                        rows={6}
                        placeholder={"從 FitBook「已預約會員」複製後貼上，一行一位\n重複的暱稱（同帳號代多人報名）會自動編號"}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </details>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800">手動建立</h2>
        <form action={createDuprEventManual.bind(null, tenantSlug)} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-slate-500">活動名稱</span>
            <input name="title" required placeholder="DUPR 積分賽" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-500">日期</span>
            <input type="date" name="date" required defaultValue={date} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">開始</span>
              <input type="time" name="startTime" defaultValue="19:00" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">結束</span>
              <input type="time" name="endTime" defaultValue="22:00" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-500">地點</span>
            <input name="location" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-500">場地數</span>
            <input type="number" name="courtCount" min={1} max={16} defaultValue={1} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-slate-500">
              報名名單（每行一位，可寫「名字, DUPR ID」）
            </span>
            <textarea
              name="roster"
              rows={7}
              placeholder={"1. 建伸, ABC123\n2. 小昱\n3. Kevin 陳"}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
              建立活動
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
