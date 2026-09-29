import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { DUPR_EVENT_STATUS_LABELS, listLiveDuprEvents } from "@/lib/dupr-event";
import { formatTaipeiDateTime } from "@/lib/format-datetime";
import { getTenantBySlug } from "@/lib/tenant";

export const metadata: Metadata = { title: "DUPR 計分" };

export default async function DuprEventsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const events = await listLiveDuprEvents(tenant.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={ROUTES.tenant(tenantSlug)} className="text-sm text-emerald-600">
        ← {tenant.displayName}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-800">DUPR 計分</h1>
      <p className="mt-1 text-sm text-slate-500">選擇今天的 DUPR 活動，比賽結束後由四位球員填分並確認。</p>

      {events.length === 0 ? (
        <p className="mt-8 rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
          目前沒有進行中的 DUPR 活動
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {events.map((e) => {
            const done = e.matches.filter((m) => m.confirmedAt).length;
            return (
              <li key={e.id}>
                <Link
                  href={ROUTES.tenantDuprEvent(tenantSlug, e.id)}
                  className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300"
                >
                  <p className="text-lg font-semibold text-slate-900">{e.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatTaipeiDateTime(e.startAt)}
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
      )}
    </div>
  );
}
