import Link from "next/link";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { sumPartySize } from "@/lib/activity-capacity";
import {
  activityKindBadgeVariant,
  adminActivityKindLabel,
  isDuprOnlyTenant,
  ROUTES,
} from "@/lib/constants";
import {
  countLiveDuprEvents,
  DUPR_EVENT_STATUS_LABELS,
  listLiveDuprEventDays,
} from "@/lib/dupr-event";
import { isTenantStaffUser } from "@/lib/dupr-scoring-access";
import {
  formatActivityDateTime,
  formatTaipeiDate,
  formatTaipeiTime,
} from "@/lib/format-datetime";
import { countTenantUpcomingRentals } from "@/lib/rental-service";
import { getPublishedActivities } from "@/lib/tenant";

type TenantWithVenues = {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  venues: { id: string; name: string; address: string | null }[];
};

/** 俱樂部首頁：Active Pickleball Club 專屬 DUPR 報名與賽程首頁；其餘傳統租戶顯示球敘 / 課程 / 看板 */
export async function TenantClassicHome({ tenant }: { tenant: TenantWithVenues }) {
  const tenantSlug = tenant.slug;
  const duprOnly = isDuprOnlyTenant(tenantSlug);

  if (duprOnly) {
    const [days, session, isStaff] = await Promise.all([
      listLiveDuprEventDays(tenant.id),
      auth(),
      isTenantStaffUser(tenant.id),
    ]);
    const userId = session?.user?.id ?? null;

    return (
      <div>
        {/* Architectural Club Masthead (DUPR-Focused for Active Pickleball Club) */}
        <section className="bg-brand-navy py-12 text-white sm:py-16">
          <div className="page-wrap">
            <Link
              href={ROUTES.home}
              className="text-xs font-bold text-brand-lime hover:underline"
            >
              ← 返回 PlayPlayPlay 俱樂部列表
            </Link>
            <div className="mt-4 grid gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <h1 className="type-head text-white">{tenant.displayName}</h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/80">
                  DUPR 積分認證專場：請登入本站帳號線上報名參賽。活動當天由工作人員啟動報到，參賽球友於現場掃描 QR Code 完成報到後即展開當日賽程，每場結束後可由該場次參賽球員直接輸入比分。
                </p>
              </div>
              <nav className="flex flex-wrap gap-2.5 lg:col-span-5 lg:justify-end">
                <Link
                  href={ROUTES.tenantDuprEvents(tenantSlug)}
                  className="bg-brand-lime px-4 py-2.5 text-sm font-extrabold text-brand-navy transition-colors hover:bg-white"
                >
                  DUPR 積分賽總覽
                </Link>
                {!userId && (
                  <Link
                    href={ROUTES.loginWithCallback(ROUTES.tenant(tenantSlug))}
                    className="bg-brand-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-lime hover:text-brand-navy"
                  >
                    登入報名 DUPR
                  </Link>
                )}
                {isStaff && (
                  <Link
                    href={ROUTES.tenantAdminDuprEvents(tenantSlug)}
                    className="bg-[#163560] px-4 py-2.5 text-sm font-extrabold text-brand-lime transition-colors hover:bg-white hover:text-brand-navy"
                  >
                    管理 DUPR 活動 →
                  </Link>
                )}
                <Link
                  href={ROUTES.tenantAbout(tenantSlug)}
                  className="bg-white/12 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white hover:text-brand-navy"
                >
                  關於場館
                </Link>
              </nav>
            </div>
          </div>
        </section>

        <div className="page-wrap py-14 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
            <section className="lg:col-span-8">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="type-head text-brand-navy">DUPR 積分認證賽</h2>
                <Link
                  href={ROUTES.tenantDuprEvents(tenantSlug)}
                  className="text-sm font-extrabold text-brand-teal hover:text-brand-navy"
                >
                  查看全部 DUPR 場次 →
                </Link>
              </div>

              {days.length === 0 ? (
                <div className="mt-6 bg-[var(--surface)] p-8">
                  <p className="text-base font-medium text-[var(--muted)]">
                    目前尚無開放報名或進行中的 DUPR 活動。
                  </p>
                  {isStaff && (
                    <Link
                      href={ROUTES.tenantAdminDuprEvents(tenantSlug)}
                      className="btn-brand mt-4 inline-block"
                    >
                      建立新 DUPR 活動 →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="mt-6 space-y-8">
                  {days.map((day) => (
                    <div key={day.ymd}>
                      <h3 className="flex items-center gap-2.5 text-base font-extrabold text-brand-navy tabular-nums">
                        {day.isToday && (
                          <span className="bg-brand-lime px-2.5 py-0.5 text-xs font-extrabold text-brand-navy">
                            今天
                          </span>
                        )}
                        {formatTaipeiDate(day.events[0].startAt)}
                        <span className="text-sm font-semibold text-[var(--muted)]">
                          · {day.events.length} 場
                        </span>
                      </h3>
                      <ul className="mt-3 space-y-3">
                        {day.events.map((e) => {
                          const done = e.matches.filter((m) => m.confirmedAt).length;
                          const checkedIn = e.players.filter((p) => p.checkedInAt != null).length;
                          const myRecord = userId ? e.players.find((p) => p.userId === userId) : null;
                          return (
                            <li key={e.id}>
                              <Link
                                href={ROUTES.tenantDuprEvent(tenantSlug, e.id)}
                                className={`group flex flex-wrap items-center justify-between gap-4 bg-[var(--surface)] p-6 transition-colors hover:bg-brand-navy hover:text-white ${
                                  myRecord ? "border-l-[6px] border-brand-lime" : ""
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <span
                                      className={`px-2.5 py-0.5 text-xs font-extrabold ${
                                        e.status === "DRAFT"
                                          ? "bg-brand-lime text-brand-navy"
                                          : e.status === "CHECK_IN"
                                            ? "bg-amber-300 text-brand-navy"
                                            : e.status === "SCHEDULED"
                                              ? "bg-brand-lime text-brand-navy"
                                              : "bg-brand-teal text-white"
                                      }`}
                                    >
                                      {DUPR_EVENT_STATUS_LABELS[e.status]}
                                    </span>
                                    {myRecord && (
                                      <span className="bg-brand-navy px-2 py-0.5 text-xs font-black text-brand-lime group-hover:bg-white group-hover:text-brand-navy">
                                        {myRecord.checkedInAt ? "你已報到" : "你已報名"}
                                      </span>
                                    )}
                                    <span className="text-lg font-extrabold text-brand-navy group-hover:text-white">
                                      {e.title}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-[var(--muted)] tabular-nums group-hover:text-white/80">
                                    {formatTaipeiTime(e.startAt)}
                                    {e.location ? ` · ${e.location}` : ""}
                                  </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-4">
                                  <div className="text-right">
                                    <span className="block text-xs font-bold text-[var(--muted)] group-hover:text-white/70">
                                      {e.status === "DRAFT"
                                        ? "報名名額"
                                        : e.status === "CHECK_IN"
                                          ? "現場報到"
                                          : "完賽進度"}
                                    </span>
                                    <span className="text-lg font-black text-brand-navy tabular-nums group-hover:text-brand-lime">
                                      {e.status === "DRAFT"
                                        ? `${e._count.players} / ${e.capacity}`
                                        : e.status === "CHECK_IN"
                                          ? `${checkedIn} / ${e._count.players}`
                                          : `${done} / ${e._count.matches}`}
                                    </span>
                                  </div>
                                  <span className="bg-brand-lime px-3 py-1.5 text-xs font-extrabold text-brand-navy">
                                    {e.status === "DRAFT"
                                      ? myRecord
                                        ? "查看報名 →"
                                        : "立即報名 →"
                                      : e.status === "CHECK_IN"
                                        ? "現場報到 →"
                                        : "查看賽程 →"}
                                  </span>
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Right 4 Columns: Venues & Flow Guide */}
            <aside className="space-y-6 lg:col-span-4">
              <div className="bg-brand-navy p-6 text-white">
                <h2 className="text-lg font-black text-brand-lime">DUPR 參賽 4 步驟</h2>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#C8D8E4]">
                  <li>
                    <b className="text-white">登入網站報名</b>：選擇開放報名中的 DUPR 活動完成線上報名。
                  </li>
                  <li>
                    <b className="text-white">現場掃描 QR Code 報到</b>：活動開始後掃描工作人員出示的 QR Code 即刻報到。
                  </li>
                  <li>
                    <b className="text-white">展開賽程並查看個人場次</b>：報到完畢展開當日賽程，系統自動標示「你的場次」。
                  </li>
                  <li>
                    <b className="text-white">賽後輸入比分</b>：每場結束後由該場次的參賽球員直接輸入比分並確認。
                  </li>
                </ol>
              </div>

              <div className="bg-[var(--surface-alt)] p-7">
                <h2 className="text-xl font-extrabold text-brand-navy">場館據點</h2>
                <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                  本俱樂部旗下舉辦 DUPR 活動之球場位置
                </p>
                <ul className="mt-5 space-y-4">
                  {tenant.venues.map((v) => (
                    <li key={v.id} className="bg-[var(--surface)] p-4">
                      <p className="font-extrabold text-brand-navy">{v.name}</p>
                      {v.address ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">{v.address}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  const [activities, rentalCount, liveDuprCount] = await Promise.all([
    getPublishedActivities(tenant.id),
    countTenantUpcomingRentals(tenant.id),
    countLiveDuprEvents(tenant.id),
  ]);

  return (
    <div>
      {/* Architectural Club Masthead */}
      <section className="bg-brand-navy py-12 text-white sm:py-16">
        <div className="page-wrap">
          <Link
            href={ROUTES.home}
            className="text-xs font-bold text-brand-lime hover:underline"
          >
            ← 返回 PlayPlayPlay 俱樂部列表
          </Link>
          <div className="mt-4 grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <h1 className="type-head text-white">{tenant.displayName}</h1>
              {tenant.description ? (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/80">
                  {tenant.description}
                </p>
              ) : null}
            </div>
            <nav className="flex flex-wrap gap-2.5 lg:col-span-5 lg:justify-end">
              <Link
                href={ROUTES.tenantBoard(tenantSlug)}
                className="bg-brand-lime px-4 py-2.5 text-sm font-extrabold text-brand-navy transition-colors hover:bg-white"
              >
                今日球場看板
              </Link>
              {liveDuprCount > 0 && (
                <Link
                  href={ROUTES.tenantDuprEvents(tenantSlug)}
                  className="bg-brand-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-lime hover:text-brand-navy"
                >
                  DUPR 積分賽 ({liveDuprCount})
                </Link>
              )}
              <Link
                href={ROUTES.tenantActivities(tenantSlug, "open-play")}
                className="bg-white/12 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white hover:text-brand-navy"
              >
                臨打球敘
              </Link>
              <Link
                href={ROUTES.tenantActivities(tenantSlug, "course")}
                className="bg-white/12 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white hover:text-brand-navy"
              >
                教練課程
              </Link>
              {rentalCount > 0 && (
                <Link
                  href={ROUTES.tenantRentals(tenantSlug)}
                  className="bg-white/12 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white hover:text-brand-navy"
                >
                  場地租借（30 天）
                </Link>
              )}
              <Link
                href={ROUTES.tenantAbout(tenantSlug)}
                className="bg-white/12 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white hover:text-brand-navy"
              >
                關於場館
              </Link>
            </nav>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="page-wrap py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          {/* Left 8 Columns: Upcoming Activities */}
          <section className="lg:col-span-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="type-head text-brand-navy">即將開始的活動</h2>
              <Link
                href={ROUTES.tenantActivities(tenantSlug)}
                className="text-sm font-extrabold text-brand-teal hover:text-brand-navy"
              >
                查看全部活動 →
              </Link>
            </div>

            {activities.length === 0 ? (
              <div className="mt-6 bg-[var(--surface)] p-8">
                <p className="text-base font-medium text-[var(--muted)]">
                  目前沒有開放中的活動，歡迎先查看今日球場看板或場地租借時段。
                </p>
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {activities.slice(0, 6).map((a) => {
                  const heads = sumPartySize(a.bookings);
                  const isFull = heads >= a.capacity;
                  return (
                    <li key={a.id}>
                      <Link
                        href={ROUTES.tenantActivity(tenantSlug, a.id)}
                        className="group flex flex-wrap items-center justify-between gap-4 bg-[var(--surface)] p-6 transition-colors hover:bg-brand-navy hover:text-white"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <Badge variant={activityKindBadgeVariant(a.type, a.requiresDupr)}>
                              {adminActivityKindLabel(a.type, a.requiresDupr)}
                            </Badge>
                            <span className="text-lg font-extrabold text-brand-navy group-hover:text-white">
                              {a.title}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-[var(--muted)] tabular-nums group-hover:text-white/80">
                            {formatActivityDateTime(a.startAt)} · {a.venue.name}
                            {a.court ? ` · ${a.court.name}` : ""}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-4">
                          <div className="text-right">
                            <span className="block text-xs font-bold text-[var(--muted)] group-hover:text-white/70">
                              報名名額
                            </span>
                            <span className="text-lg font-black text-brand-navy tabular-nums group-hover:text-brand-lime">
                              {heads} / {a.capacity}
                            </span>
                          </div>
                          <span
                            className={`px-3 py-1.5 text-xs font-extrabold ${
                              isFull
                                ? "bg-amber-200 text-amber-950"
                                : "bg-brand-lime text-brand-navy"
                            }`}
                          >
                            {isFull ? "可排候補" : "立即報名 →"}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Right 4 Columns: Venues & Quick Access */}
          <aside className=" bg-[var(--surface-alt)] p-7 lg:col-span-4">
            <h2 className="text-xl font-extrabold text-brand-navy">場館據點</h2>
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
              本俱樂部旗下開放預約之球場位置
            </p>
            <ul className="mt-5 space-y-4">
              {tenant.venues.map((v) => (
                <li key={v.id} className="bg-[var(--surface)] p-4">
                  <p className="font-extrabold text-brand-navy">{v.name}</p>
                  {v.address ? (
                    <p className="mt-1 text-sm text-[var(--muted)]">{v.address}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
