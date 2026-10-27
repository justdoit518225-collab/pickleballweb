import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { DUPR_EVENT_STATUS_LABELS, listLiveDuprEventDays } from "@/lib/dupr-event";
import { formatTaipeiDate, formatTaipeiTime } from "@/lib/format-datetime";
import { getTenantBySlug } from "@/lib/tenant";

export const metadata: Metadata = { title: "DUPR" };

export default async function DuprEventsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const days = await listLiveDuprEventDays(tenant.id);

  return (
    <div>
      <section className="bg-brand-navy py-10 text-white sm:py-12">
        <div className="page-wrap">
          <Link
            href={ROUTES.tenant(tenantSlug)}
            className="text-xs font-bold text-brand-lime hover:underline"
          >
            ← 返回 {tenant.displayName}
          </Link>
          <h1 className="type-head mt-3 text-white">DUPR 積分認證賽</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">
            DUPR（Dynamic Universal Pickleball Rating）是全球通用的匹克球積分系統，以 2.000～8.000 的分數反映球員實際程度。每場對戰結果確認後，系統會依對手強弱與比分表現更新單雙打積分。
          </p>
        </div>
      </section>

      <div className="page-wrap py-12">
        {days.length === 0 ? (
          <div className="bg-[var(--surface)] p-8 text-center">
            <p className="text-base font-semibold text-[var(--muted)]">
              目前沒有進行中的 DUPR 活動
            </p>
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
                    return (
                      <li key={e.id}>
                        <Link
                          href={ROUTES.tenantDuprEvent(tenantSlug, e.id)}
                          className="group block bg-[var(--surface)] p-6 transition-colors hover:bg-brand-navy hover:text-white"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2.5 py-0.5 text-xs font-extrabold ${
                                e.status === "SCHEDULED"
                                  ? "bg-brand-lime text-brand-navy"
                                  : "bg-brand-teal text-white"
                              }`}
                            >
                              {DUPR_EVENT_STATUS_LABELS[e.status]}
                            </span>
                            <span className="text-xs font-bold text-[var(--muted)] tabular-nums group-hover:text-white/75">
                              已確認 {done} / {e._count.matches} 場
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
                            進入對戰計分板 →
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
