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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={ROUTES.tenant(tenantSlug)} className="text-sm text-emerald-600">
        ← {tenant.displayName}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-800">DUPR</h1>
      <p className="mt-1 text-sm text-slate-500">
        DUPR（Dynamic Universal Pickleball Rating）是全球通用的匹克球積分系統，不分年齡、性別與地區，以 2.000～8.000 的分數反映球員的實際程度。每場比賽結果上傳後，系統會依對手強弱與比分表現，自動更新你的單打與雙打積分。
      </p>

      {days.length === 0 ? (
        <p className="mt-8 rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
          目前沒有進行中的 DUPR 活動
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {days.map((day) => (
            <section key={day.ymd}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                {day.isToday && (
                  <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">今天</span>
                )}
                {formatTaipeiDate(day.events[0].startAt)}
                <span className="font-normal text-slate-400">{day.events.length} 場活動</span>
              </h2>
              <ul className="mt-3 space-y-3">
                {day.events.map((e) => {
                  const done = e.matches.filter((m) => m.confirmedAt).length;
                  return (
                    <li key={e.id}>
                      <Link
                        href={ROUTES.tenantDuprEvent(tenantSlug, e.id)}
                        className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300"
                      >
                        <p className="text-lg font-semibold text-slate-900">{e.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatTaipeiTime(e.startAt)}
                          {e.location ? ` · ${e.location}` : ""}
                        </p>
                        <p className="mt-2 text-sm">
                          <span className={e.status === "SCHEDULED" ? "text-amber-700" : "text-emerald-700"}>
                            {DUPR_EVENT_STATUS_LABELS[e.status]}
                          </span>
                          <span className="text-slate-500">
                            {` · ${e._count.players} 人 · 已確認 ${done}/${e._count.matches} 場`}
                          </span>
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
  );
}
