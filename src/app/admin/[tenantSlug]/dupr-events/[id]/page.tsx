import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  addDuprEventPlayers,
  adminClearMatchScore,
  adminReopenMatch,
  adminSaveMatchScore,
  deleteDuprEvent,
  finalizeDuprEvent,
  generateDuprEventSchedule,
  regenerateDuprScoringPin,
  removeDuprEventPlayer,
  reopenDuprEvent,
  resetDuprEventToDraft,
  retrySubmitDuprEvent,
  saveDuprEventRoster,
  updateDuprEventInfo,
} from "@/app/admin/[tenantSlug]/dupr-events/actions";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Badge } from "@/components/ui/badge";
import { requireTenantStaff } from "@/lib/authz";
import { ROUTES } from "@/lib/constants";
import {
  checkFinalizeReadiness,
  DUPR_EVENT_SOURCE_LABELS,
  DUPR_EVENT_STATUS_LABELS,
  getTenantDuprEvent,
  matchPlayerSeqs,
} from "@/lib/dupr-event";
import {
  defaultRoundCount,
  effectiveCourtCount,
  formatScheduleText,
  MIN_PLAYERS,
} from "@/lib/dupr-schedule";
import { formatTaipeiDateTime, formatTaipeiTime } from "@/lib/format-datetime";

const statusVariant = {
  DRAFT: "draft",
  SCHEDULED: "warning",
  FINALIZED: "published",
  SUBMITTED: "success",
} as const;

export default async function AdminDuprEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { tenantSlug, id } = await params;
  const sp = await searchParams;
  const { tenant } = await requireTenantStaff(tenantSlug);
  const event = await getTenantDuprEvent(tenant.id, id);
  if (!event) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const tabletPath = ROUTES.tenantDuprEvent(tenantSlug, event.id);
  const tabletUrl = host ? `${proto}://${host}${tabletPath}` : tabletPath;

  const n = event.players.length;
  const bySeq = new Map(event.players.map((p) => [p.seq, p]));
  const label = (seq: number) => `#${seq} ${bySeq.get(seq)?.name ?? "?"}`;
  const hasScores = event.matches.some((m) => m.scoreA != null);
  const editable = event.status === "DRAFT" || event.status === "SCHEDULED";
  const readiness = checkFinalizeReadiness(event);
  const missingDuprCount = event.players.filter((p) => !p.duprId).length;
  const courts = effectiveCourtCount(Math.max(n, 4), event.courtCount);
  const scheduleText = event.matches.length > 0 ? formatScheduleText(n, event.matches) : "";

  const eventId = event.id;

  return (
    <div className="space-y-6">
      <Link href={ROUTES.tenantAdminDuprEvents(tenantSlug)} className="text-sm text-emerald-600">
        ← DUPR 對戰活動
      </Link>

      {sp.error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</p>}
      {sp.saved && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{sp.saved}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant[event.status]}>{DUPR_EVENT_STATUS_LABELS[event.status]}</Badge>
          <Badge variant="dupr">{DUPR_EVENT_SOURCE_LABELS[event.source]}</Badge>
        </div>
        <h2 className="mt-2 text-lg font-bold text-slate-800">{event.title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {formatTaipeiDateTime(event.startAt)}
          {event.endAt ? ` – ${formatTaipeiTime(event.endAt)}` : ""}
          {event.location ? ` · ${event.location}` : ""}
          {event.fitbookUrl && (
            <>
              {" · "}
              <a href={event.fitbookUrl} target="_blank" rel="noreferrer" className="text-brand-teal">
                FitBook 場次 ↗
              </a>
            </>
          )}
        </p>
        {editable && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-slate-600">編輯活動資訊</summary>
            <form action={updateDuprEventInfo.bind(null, tenantSlug, eventId)} className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-[16rem] flex-1 text-sm">
                <span className="mb-1 block text-xs text-slate-500">活動名稱</span>
                <input name="title" defaultValue={event.title} required className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-slate-500">地點</span>
                <input name="location" defaultValue={event.location ?? ""} className="rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              <button type="submit" className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                儲存
              </button>
            </form>
          </details>
        )}
      </section>

      <section className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm">
        <h3 className="font-semibold text-indigo-900">現場平板計分</h3>
        <div className="mt-3 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-indigo-700">現場碼</p>
            <p className="font-mono text-3xl font-bold tracking-[0.3em] text-indigo-900">{event.scoringPin}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-indigo-700">平板開啟網址</p>
            <Link href={tabletPath} target="_blank" className="break-all font-mono text-sm text-indigo-900 underline">
              {tabletUrl}
            </Link>
            <p className="mt-1 text-xs text-indigo-700/80">
              也可從「{tenant.displayName} → DUPR 計分」進入；平板輸入一次現場碼後 24 小時內免重新輸入。
            </p>
          </div>
          <form action={regenerateDuprScoringPin.bind(null, tenantSlug, eventId)}>
            <button type="submit" className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm text-indigo-800 hover:bg-indigo-50">
              更換現場碼
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-slate-800">報名名單（{n} 人）</h3>
          {missingDuprCount > 0 && (
            <p className="text-xs text-amber-700">{missingDuprCount} 位尚未填 DUPR ID（上傳 DUPR 前需補齊）</p>
          )}
        </div>
        {n === 0 ? (
          <p className="mt-3 text-sm text-slate-500">尚無球員</p>
        ) : (
          <form action={saveDuprEventRoster.bind(null, tenantSlug, eventId)} className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="w-14 px-3 py-2 text-left">編號</th>
                    <th className="px-3 py-2 text-left">名稱</th>
                    <th className="px-3 py-2 text-left">DUPR ID</th>
                    {event.status === "DRAFT" && <th className="w-16 px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {event.players.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-bold tabular-nums text-slate-700">{p.seq}</td>
                      <td className="px-3 py-1.5">
                        <input type="hidden" name="playerId" value={p.id} />
                        <input
                          name="name"
                          defaultValue={p.name}
                          disabled={!editable}
                          className="w-full rounded-md border border-slate-200 px-2 py-1 disabled:bg-slate-50"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          name="duprId"
                          defaultValue={p.duprId ?? ""}
                          disabled={!editable}
                          placeholder="未填"
                          className={`w-full rounded-md border px-2 py-1 font-mono uppercase disabled:bg-slate-50 ${
                            p.duprId ? "border-slate-200" : "border-amber-300 bg-amber-50/50"
                          }`}
                        />
                      </td>
                      {event.status === "DRAFT" && (
                        <td className="px-3 py-1.5 text-right">
                          <button
                            type="submit"
                            formAction={removeDuprEventPlayer.bind(null, tenantSlug, eventId, p.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            移除
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {editable && (
              <button type="submit" className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900">
                儲存名單
              </button>
            )}
          </form>
        )}

        {event.status === "DRAFT" && (
          <form action={addDuprEventPlayers.bind(null, tenantSlug, eventId)} className="mt-4 space-y-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-slate-500">新增球員（每行一位，可寫「名字, DUPR ID」）</span>
              <textarea name="roster" rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm" />
            </label>
            <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
              新增
            </button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800">對戰表</h3>
        {editable && !hasScores && (
          <form action={generateDuprEventSchedule.bind(null, tenantSlug, eventId)} className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">同時使用場地數</span>
              <input
                type="number"
                name="courtCount"
                min={1}
                max={16}
                defaultValue={event.courtCount}
                className="w-24 rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">輪數（空白＝自動）</span>
              <input
                type="number"
                name="rounds"
                min={1}
                max={60}
                placeholder={n >= MIN_PLAYERS ? String(defaultRoundCount(n, event.courtCount)) : ""}
                className="w-28 rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={n < MIN_PLAYERS}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:bg-slate-300"
            >
              {event.matches.length > 0 ? "重新產生對戰表" : "產生對戰表"}
            </button>
            {event.status === "SCHEDULED" && (
              <button
                type="submit"
                formAction={resetDuprEventToDraft.bind(null, tenantSlug, eventId)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                退回名單編輯
              </button>
            )}
            <p className="w-full text-xs text-slate-500">
              {n < MIN_PLAYERS
                ? `至少需要 ${MIN_PLAYERS} 位球員`
                : `${n} 人、${courts} 面場地：每輪 ${courts * 4} 人上場、${n - courts * 4} 人輪休。單一場地 4～8 人使用固定輪轉表，其餘以演算法讓每人搭檔、對手盡量不重複。`}
            </p>
          </form>
        )}

        {event.matches.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">尚未產生對戰表</p>
        ) : (
          <>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-slate-600">文字版對戰表（可複製貼到 LINE）</summary>
              <textarea
                readOnly
                value={scheduleText}
                rows={Math.min(24, scheduleText.split("\n").length + 1)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm"
              />
            </details>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left">場次</th>
                    <th className="px-2 py-2 text-left">隊伍 A</th>
                    <th className="px-2 py-2 text-center">比分</th>
                    <th className="px-2 py-2 text-left">隊伍 B</th>
                    <th className="px-2 py-2 text-left">確認</th>
                    <th className="px-2 py-2 text-left">管理</th>
                  </tr>
                </thead>
                <tbody>
                  {event.matches.map((m) => {
                    const confirmedSeqs = new Set(m.confirmations.map((c) => c.playerSeq));
                    const seqs = matchPlayerSeqs(m);
                    return (
                      <tr key={m.id} className={`border-t border-slate-100 ${m.confirmedAt ? "bg-emerald-50/40" : ""}`}>
                        <td className="whitespace-nowrap px-2 py-2 tabular-nums text-slate-600">
                          #{m.seq}
                          {courts > 1 && <span className="ml-1 text-xs text-slate-400">R{m.round}·{m.court}號</span>}
                        </td>
                        <td className="px-2 py-2">{label(m.teamA1)} / {label(m.teamA2)}</td>
                        <td className="px-2 py-2">
                          {event.status === "SCHEDULED" ? (
                            <form action={adminSaveMatchScore.bind(null, tenantSlug, eventId)} className="flex items-center justify-center gap-1">
                              <input type="hidden" name="matchId" value={m.id} />
                              <input name="scoreA" defaultValue={m.scoreA ?? ""} inputMode="numeric" className="w-10 rounded border border-slate-200 px-1 py-0.5 text-center" />
                              <span>:</span>
                              <input name="scoreB" defaultValue={m.scoreB ?? ""} inputMode="numeric" className="w-10 rounded border border-slate-200 px-1 py-0.5 text-center" />
                              <button type="submit" className="text-xs text-indigo-600 hover:underline">存</button>
                            </form>
                          ) : (
                            <p className="text-center font-semibold tabular-nums">
                              {m.scoreA ?? "-"} : {m.scoreB ?? "-"}
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-2">{label(m.teamB1)} / {label(m.teamB2)}</td>
                        <td className="px-2 py-2 text-xs">
                          {m.scoreA == null ? (
                            <span className="text-slate-400">未開打</span>
                          ) : m.confirmedAt ? (
                            <span className="font-medium text-emerald-700">✓ 四人已確認</span>
                          ) : (
                            <span className="text-amber-700">
                              {confirmedSeqs.size}/4
                              {seqs.filter((s) => !confirmedSeqs.has(s)).length > 0 &&
                                `（待 ${seqs.filter((s) => !confirmedSeqs.has(s)).join("、")}）`}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-xs">
                          {event.status === "SCHEDULED" && m.scoreA != null && (
                            <span className="flex gap-2">
                              {m.confirmations.length > 0 && (
                                <form action={adminReopenMatch.bind(null, tenantSlug, eventId, m.id)}>
                                  <button type="submit" className="text-amber-700 hover:underline">解除確認</button>
                                </form>
                              )}
                              <form action={adminClearMatchScore.bind(null, tenantSlug, eventId, m.id)}>
                                <button type="submit" className="text-red-600 hover:underline">清除</button>
                              </form>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {event.matches.length > 0 && (
        <section className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800">負責人最終確認 · 整批匯入 DUPR</h3>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
            <li className="rounded-lg bg-slate-50 px-3 py-2">已填分 <b>{readiness.scored}</b> 場</li>
            <li className="rounded-lg bg-slate-50 px-3 py-2">四人確認 <b>{readiness.confirmed}</b> 場</li>
            <li className="rounded-lg bg-slate-50 px-3 py-2">未開打 <b>{readiness.unscored}</b> 場（不上傳）</li>
            <li className={`rounded-lg px-3 py-2 ${readiness.missingDupr.length ? "bg-amber-50 text-amber-800" : "bg-slate-50"}`}>
              缺 DUPR ID <b>{readiness.missingDupr.length}</b> 人
            </li>
          </ul>
          {readiness.pendingConfirmation.length > 0 && (
            <p className="mt-2 text-xs text-amber-700">待四人確認：第 {readiness.pendingConfirmation.join("、")} 場</p>
          )}
          {readiness.missingDupr.length > 0 && (
            <p className="mt-1 text-xs text-amber-700">
              缺 DUPR ID：{readiness.missingDupr.map((p) => `#${p.seq} ${p.name}`).join("、")}
            </p>
          )}

          {event.submitError && event.status !== "SUBMITTED" && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">上傳狀態：{event.submitError}</p>
          )}
          {event.status === "SUBMITTED" && event.submittedAt && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              已於 {formatTaipeiDateTime(event.submittedAt)} 匯入 DUPR
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {event.status === "SCHEDULED" && (
              <ConfirmForm
                action={finalizeDuprEvent.bind(null, tenantSlug, eventId)}
                message={`確定最終確認？將鎖定分數並把 ${readiness.confirmed} 場比賽整批匯入 DUPR。`}
              >
                <button
                  type="submit"
                  disabled={
                    readiness.scored === 0 ||
                    readiness.pendingConfirmation.length > 0 ||
                    readiness.missingDupr.length > 0
                  }
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300"
                >
                  最終確認並匯入 DUPR（{readiness.confirmed} 場）
                </button>
              </ConfirmForm>
            )}
            {event.status === "FINALIZED" && (
              <>
                <form action={retrySubmitDuprEvent.bind(null, tenantSlug, eventId)}>
                  <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                    重新上傳 DUPR
                  </button>
                </form>
                <form action={reopenDuprEvent.bind(null, tenantSlug, eventId)}>
                  <button type="submit" className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
                    退回修改
                  </button>
                </form>
              </>
            )}
            {readiness.confirmed > 0 && (
              <a
                href={ROUTES.tenantAdminDuprEventCsv(tenantSlug, event.id)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                下載 DUPR 匯入 CSV
              </a>
            )}
          </div>
        </section>
      )}

      {event.status !== "SUBMITTED" && (
        <ConfirmForm
          action={deleteDuprEvent.bind(null, tenantSlug, eventId)}
          message="確定刪除此 DUPR 活動？名單、對戰表與分數將一併刪除。"
          className="text-right"
        >
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            刪除此活動
          </button>
        </ConfirmForm>
      )}
    </div>
  );
}
