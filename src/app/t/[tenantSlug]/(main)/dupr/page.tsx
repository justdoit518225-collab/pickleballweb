import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ROUTES } from "@/lib/constants";
import { DUPR_EVENT_STATUS_LABELS, listLiveDuprEventDays } from "@/lib/dupr-event";
import { isTenantStaffUser } from "@/lib/dupr-scoring-access";
import { formatTaipeiDate, formatTaipeiTime } from "@/lib/format-datetime";
import { getTenantBySlug } from "@/lib/tenant";

export const metadata: Metadata = { title: "DUPR 積分認證賽" };

export default async function DuprEventsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const [days, session, isStaff] = await Promise.all([
    listLiveDuprEventDays(tenant.id),
    auth(),
    isTenantStaffUser(tenant.id),
  ]);
  const userId = session?.user?.id ?? null;

  return (
    <div>
      <section className="bg-brand-navy py-10 text-white sm:py-12">
        <div className="page-wrap">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={ROUTES.tenant(tenantSlug)}
              className="text-xs font-bold text-brand-lime hover:underline"
            >
              ← 返回 {tenant.displayName}
            </Link>
            {isStaff && (
              <Link
                href={ROUTES.tenantAdminDuprEvents(tenantSlug)}
                className="bg-brand-lime px-4 py-2 text-xs font-black text-brand-navy hover:bg-white"
              >
                ＋ 建立／管理 DUPR 活動 →
              </Link>
            )}
          </div>
          <h1 className="type-head mt-3 text-white">DUPR 積分認證賽</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">
            登入網站即可線上報名 DUPR 場次。活動當天由現場人員啟動報到，參賽球友掃描 QR Code 完成報到後立即展開當日輪轉賽程，並於每場結束後直接輸入比分。
          </p>
        </div>
      </section>

      <div className="page-wrap py-12">
        {days.length === 0 ? (
          <div className="bg-[var(--surface)] p-8 text-center">
            <p className="text-base font-semibold text-[var(--muted)]">
              目前沒有開放報名或進行中的 DUPR 活動
            </p>
            {isStaff && (
              <Link
                href={ROUTES.tenantAdminDuprEvents(tenantSlug)}
                className="btn-brand mt-4 inline-block"
              >
                前往後台建立 DUPR 活動 →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {days.map((day) => (
              <section key={day.ymd}>
                <h2 className="flex items-center gap-2.5 text-base font-extrabold text-brand-navy tabular-nums">
                  {day.isToday && (
                    <span className="bg-brand-lime px-2.5 py-0.5 text-xs font-extrabold text-brand-navy">
                      今天
                    </span>
                  )}
                  {formatTaipeiDate(day.events[0].startAt)}
                  <span className="text-sm font-semibold text-[var(--muted)]">
                    · {day.events.length} 場活動
                  </span>
                </h2>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {day.events.map((e) => {
                    const done = e.matches.filter((m) => m.confirmedAt).length;
                    const checkedIn = e.players.filter((p) => p.checkedInAt != null).length;
                    const myRecord = userId ? e.players.find((p) => p.userId === userId) : null;

                    const ctaLabel =
                      e.status === "DRAFT"
                        ? myRecord
                          ? "查看報名狀態／個人報到碼 →"
                          : "登入網站報名參賽 →"
                        : e.status === "CHECK_IN"
                          ? myRecord?.checkedInAt
                            ? "已完成報到 · 查看現場進度 →"
                            : "進入現場 QR Code 報到 →"
                          : "查看今日賽程與輸入比分 →";

                    return (
                      <li key={e.id}>
                        <Link
                          href={ROUTES.tenantDuprEvent(tenantSlug, e.id)}
                          className={`group block bg-[var(--surface)] p-6 transition-colors hover:bg-brand-navy hover:text-white ${
                            myRecord ? "border-l-[6px] border-brand-lime" : ""
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
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
                            </div>
                            <span className="text-xs font-bold text-[var(--muted)] tabular-nums group-hover:text-white/75">
                              {e.status === "DRAFT"
                                ? `已報名 ${e._count.players} / ${e.capacity} 人`
                                : e.status === "CHECK_IN"
                                  ? `已報到 ${checkedIn} / ${e._count.players} 人`
                                  : `已確認 ${done} / ${e._count.matches} 場`}
                            </span>
                          </div>
                          <p className="mt-3 text-xl font-extrabold text-brand-navy group-hover:text-white">
                            {e.title}
                          </p>
                          <p className="mt-1.5 text-sm text-[var(--muted)] tabular-nums group-hover:text-white/80">
                            {formatTaipeiTime(e.startAt)}
                            {e.location ? ` · ${e.location}` : ""} · 共 {e._count.players} 位球員
                          </p>
                          <p className="mt-4 text-xs font-extrabold text-brand-teal group-hover:text-brand-lime">
                            {ctaLabel}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
