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
      <Link
        href={ROUTES.tenantAdminDuprEvents(tenantSlug)}
        className="inline-block text-[14px] font-black text-[#1B6B73] hover:text-brand-navy"
      >
        ← DUPR 對戰活動
      </Link>

      {sp.error && (
        <p className="bg-[#FCECE9] px-4 py-3 text-[14px] font-bold text-[#B42318]">{sp.error}</p>
      )}
      {sp.saved && (
        <p className="bg-[var(--surface-tint)] px-4 py-3 text-[14px] font-bold text-[#1B6B73]">{sp.saved}</p>
      )}

      <section className="bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant[event.status]}>{DUPR_EVENT_STATUS_LABELS[event.status]}</Badge>
          <Badge variant="dupr">{DUPR_EVENT_SOURCE_LABELS[event.source]}</Badge>
        </div>
        <h2 className="mt-3 text-[24px] font-black text-brand-navy">{event.title}</h2>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          {formatTaipeiDateTime(event.startAt)}
          {event.endAt ? ` – ${formatTaipeiTime(event.endAt)}` : ""}
          {event.location ? ` · ${event.location}` : ""}
          {event.fitbookUrl && (
            <>
              {" · "}
              <a href={event.fitbookUrl} target="_blank" rel="noreferrer" className="font-bold text-[#1B6B73]">
                FitBook 場次 ↗
              </a>
            </>
          )}
        </p>
        {editable && (
          <details className="mt-4">
            <summary className="cursor-pointer text-[14px] font-bold text-brand-navy">編輯活動資訊</summary>
            <form
              action={updateDuprEventInfo.bind(null, tenantSlug, eventId)}
              className="mt-3 flex flex-wrap items-end gap-3"
            >
              <label className="min-w-[16rem] flex-1 text-[14px]">
                <span className="mb-1 block text-[14px] font-bold text-brand-navy">活動名稱</span>
                <input
                  name="title"
                  defaultValue={event.title}
                  required
                  className="w-full bg-[var(--bg)] px-4 py-2 text-[14px] text-brand-navy"
                />
              </label>
              <label className="text-[14px]">
                <span className="mb-1 block text-[14px] font-bold text-brand-navy">地點</span>
                <input
                  name="location"
                  defaultValue={event.location ?? ""}
                  className="bg-[var(--bg)] px-4 py-2 text-[14px] text-brand-navy"
                />
              </label>
              <button
                type="submit"
                className="bg-brand-navy px-4 py-2 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy"
              >
                儲存
              </button>
            </form>
          </details>
        )}
      </section>

      <section className="bg-brand-navy p-6 text-white">
        <h3 className="text-[20px] font-black text-white">現場平板計分</h3>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[14px] font-bold text-[#C8D8E4]">現場碼</p>
            <p className="font-mono text-[32px] font-black tracking-[0.25em] text-brand-lime">{event.scoringPin}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-[#C8D8E4]">平板開啟網址</p>
            <Link href={tabletPath} target="_blank" className="break-all font-mono text-[14px] font-bold text-white underline">
              {tabletUrl}
            </Link>
            <p className="mt-1 text-[14px] text-[#C8D8E4]">
              也可從「{tenant.displayName} → DUPR 計分」進入；平板輸入一次現場碼後 24 小時內免重新輸入。
            </p>
          </div>
          <form action={regenerateDuprScoringPin.bind(null, tenantSlug, eventId)}>
            <button
              type="submit"
              className="bg-white px-4 py-2 text-[14px] font-black text-brand-navy hover:bg-brand-lime"
            >
              更換現場碼
            </button>
          </form>
        </div>
      </section>

      <section className="bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[20px] font-black text-brand-navy">報名名單（{n} 人）</h3>
          {missingDuprCount > 0 && (
            <p className="text-[14px] font-bold text-[#9A5B00]">
              {missingDuprCount} 位尚未填 DUPR ID（上傳 DUPR 前需補齊）
            </p>
          )}
        </div>
        {n === 0 ? (
          <p className="mt-3 text-[14px] text-[var(--muted)]">尚無球員</p>
        ) : (
          <form action={saveDuprEventRoster.bind(null, tenantSlug, eventId)} className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-[14px]">
                <thead className="bg-brand-navy text-white">
                  <tr>
                    <th className="w-16 px-3 py-2 text-left font-black">編號</th>
                    <th className="px-3 py-2 text-left font-black">名稱</th>
                    <th className="px-3 py-2 text-left font-black">DUPR ID</th>
                    {event.status === "DRAFT" && <th className="w-16 px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {event.players.map((p) => (
                    <tr key={p.id} className="border-t border-[var(--line)]">
                      <td className="px-3 py-2 font-mono font-black tabular-nums text-brand-navy">{p.seq}</td>
                      <td className="px-3 py-2">
                        <input type="hidden" name="playerId" value={p.id} />
                        <input
                          name="name"
                          defaultValue={p.name}
                          disabled={!editable}
                          className="w-full bg-[var(--bg)] px-3 py-1.5 text-[14px] font-bold text-brand-navy disabled:opacity-60"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          name="duprId"
                          defaultValue={p.duprId ?? ""}
                          disabled={!editable}
                          placeholder="未填"
                          className={`w-full px-3 py-1.5 font-mono text-[14px] uppercase disabled:opacity-60 ${
                            p.duprId ? "bg-[var(--bg)] text-brand-navy" : "bg-[#FFF4E5] text-[#9A5B00]"
                          }`}
                        />
                      </td>
                      {event.status === "DRAFT" && (
                        <td className="px-3 py-2 text-right">
                          <button
                            type="submit"
                            formAction={removeDuprEventPlayer.bind(null, tenantSlug, eventId, p.id)}
                            className="text-[14px] font-bold text-[#B42318] hover:underline"
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
              <button type="submit" className="btn-brand mt-4">
                儲存名單
              </button>
            )}
          </form>
        )}

        {event.status === "DRAFT" && (
          <form action={addDuprEventPlayers.bind(null, tenantSlug, eventId)} className="mt-6 space-y-2">
            <label className="block text-[14px]">
              <span className="mb-1 block text-[14px] font-bold text-brand-navy">
                新增球員（每行一位，可寫「名字, DUPR ID」）
              </span>
              <textarea
                name="roster"
                rows={3}
                className="w-full bg-[var(--bg)] px-4 py-2 font-mono text-[14px] text-brand-navy"
              />
            </label>
            <button
              type="submit"
              className="bg-brand-navy px-4 py-2 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy"
            >
              新增
            </button>
          </form>
        )}
      </section>

      <section className="bg-white p-6">
        <h3 className="text-[20px] font-black text-brand-navy">對戰表</h3>
        {editable && !hasScores && (
          <form
            action={generateDuprEventSchedule.bind(null, tenantSlug, eventId)}
            className="mt-4 flex flex-wrap items-end gap-3"
          >
            <label className="text-[14px]">
              <span className="mb-1 block text-[14px] font-bold text-brand-navy">同時使用場地數</span>
              <input
                type="number"
                name="courtCount"
                min={1}
                max={16}
                defaultValue={event.courtCount}
                className="w-24 bg-[var(--bg)] px-4 py-2 text-[14px] font-bold text-brand-navy"
              />
            </label>
            <label className="text-[14px]">
              <span className="mb-1 block text-[14px] font-bold text-brand-navy">輪數（空白＝自動）</span>
              <input
                type="number"
                name="rounds"
                min={1}
                max={60}
                placeholder={n >= MIN_PLAYERS ? String(defaultRoundCount(n, event.courtCount)) : ""}
                className="w-28 bg-[var(--bg)] px-4 py-2 text-[14px] font-bold text-brand-navy"
              />
            </label>
            <button
              type="submit"
              disabled={n < MIN_PLAYERS}
              className="btn-brand disabled:opacity-40"
            >
              {event.matches.length > 0 ? "重新產生對戰表" : "產生對戰表"}
            </button>
            {event.status === "SCHEDULED" && (
              <button
                type="submit"
                formAction={resetDuprEventToDraft.bind(null, tenantSlug, eventId)}
                className="bg-[var(--bg)] px-4 py-2 text-[14px] font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
              >
                退回名單編輯
              </button>
            )}
            <p className="w-full text-[14px] text-[var(--muted)]">
              {n < MIN_PLAYERS
                ? `至少需要 ${MIN_PLAYERS} 位球員`
                : `${n} 人、${courts} 面場地：每輪 ${courts * 4} 人上場、${n - courts * 4} 人輪休。單一場地 4～8 人使用固定輪轉表，其餘以演算法讓每人搭檔、對手盡量不重複。`}
            </p>
          </form>
        )}

        {event.matches.length === 0 ? (
          <p className="mt-4 text-[14px] text-[var(--muted)]">尚未產生對戰表</p>
        ) : (
          <>
            <details className="mt-4">
              <summary className="cursor-pointer text-[14px] font-bold text-brand-navy">
                文字版對戰表（可複製貼到 LINE）
              </summary>
              <textarea
                readOnly
                value={scheduleText}
                rows={Math.min(24, scheduleText.split("\n").length + 1)}
                className="mt-2 w-full bg-[var(--bg)] px-4 py-3 font-mono text-[14px] text-brand-navy"
              />
            </details>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[48rem] text-[14px]">
                <thead className="bg-brand-navy text-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-black">場次</th>
                    <th className="px-3 py-2 text-left font-black">隊伍 A</th>
                    <th className="px-3 py-2 text-center font-black">比分</th>
                    <th className="px-3 py-2 text-left font-black">隊伍 B</th>
                    <th className="px-3 py-2 text-left font-black">確認</th>
                    <th className="px-3 py-2 text-left font-black">管理</th>
                  </tr>
                </thead>
                <tbody>
                  {event.matches.map((m) => {
                    const confirmedSeqs = new Set(m.confirmations.map((c) => c.playerSeq));
                    const seqs = matchPlayerSeqs(m);
                    return (
                      <tr
                        key={m.id}
                        className={`border-t border-[var(--line)] ${
                          m.confirmedAt ? "bg-[var(--surface-tint)]" : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-3 py-2 font-mono font-bold tabular-nums text-brand-navy">
                          #{m.seq}
                          {courts > 1 && (
                            <span className="ml-1 text-[14px] text-[var(--muted)]">
                              R{m.round}·{m.court}號
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold text-brand-navy">
                          {label(m.teamA1)} / {label(m.teamA2)}
                        </td>
                        <td className="px-3 py-2">
                          {event.status === "SCHEDULED" ? (
                            <form
                              action={adminSaveMatchScore.bind(null, tenantSlug, eventId)}
                              className="flex items-center justify-center gap-1.5"
                            >
                              <input type="hidden" name="matchId" value={m.id} />
                              <input
                                name="scoreA"
                                defaultValue={m.scoreA ?? ""}
                                inputMode="numeric"
                                className="w-12 bg-[var(--bg)] px-2 py-1 text-center font-mono font-bold text-brand-navy"
                              />
                              <span>:</span>
                              <input
                                name="scoreB"
                                defaultValue={m.scoreB ?? ""}
                                inputMode="numeric"
                                className="w-12 bg-[var(--bg)] px-2 py-1 text-center font-mono font-bold text-brand-navy"
                              />
                              <button
                                type="submit"
                                className="bg-brand-navy px-2.5 py-1 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy"
                              >
                                存
                              </button>
                            </form>
                          ) : (
                            <p className="text-center font-mono font-black tabular-nums text-brand-navy">
                              {m.scoreA ?? "-"} : {m.scoreB ?? "-"}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold text-brand-navy">
                          {label(m.teamB1)} / {label(m.teamB2)}
                        </td>
                        <td className="px-3 py-2 text-[14px]">
                          {m.scoreA == null ? (
                            <span className="text-[var(--muted)]">未開打</span>
                          ) : m.confirmedAt ? (
                            <span className="font-black text-[#1B6B73]">✓ 四人已確認</span>
                          ) : (
                            <span className="font-bold text-[#9A5B00]">
                              {confirmedSeqs.size}/4
                              {seqs.filter((s) => !confirmedSeqs.has(s)).length > 0 &&
                                `（待 ${seqs.filter((s) => !confirmedSeqs.has(s)).join("、")}）`}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[14px]">
                          {event.status === "SCHEDULED" && m.scoreA != null && (
                            <span className="flex gap-2">
                              {m.confirmations.length > 0 && (
                                <form action={adminReopenMatch.bind(null, tenantSlug, eventId, m.id)}>
                                  <button type="submit" className="font-bold text-[#9A5B00] hover:underline">
                                    解除確認
                                  </button>
                                </form>
                              )}
                              <form action={adminClearMatchScore.bind(null, tenantSlug, eventId, m.id)}>
                                <button type="submit" className="font-bold text-[#B42318] hover:underline">
                                  清除
                                </button>
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
        <section className="bg-white p-6">
          <h3 className="text-[20px] font-black text-brand-navy">負責人最終確認 · 整批匯入 DUPR</h3>
          <ul className="mt-4 grid gap-3 text-[14px] sm:grid-cols-4">
            <li className="bg-[var(--bg)] px-4 py-3 text-brand-navy">
              已填分 <b className="font-mono font-black">{readiness.scored}</b> 場
            </li>
            <li className="bg-[var(--bg)] px-4 py-3 text-brand-navy">
              四人確認 <b className="font-mono font-black">{readiness.confirmed}</b> 場
            </li>
            <li className="bg-[var(--bg)] px-4 py-3 text-brand-navy">
              未開打 <b className="font-mono font-black">{readiness.unscored}</b> 場（不上傳）
            </li>
            <li
              className={`px-4 py-3 ${
                readiness.missingDupr.length ? "bg-[#FFF4E5] text-[#9A5B00]" : "bg-[var(--bg)] text-brand-navy"
              }`}
            >
              缺 DUPR ID <b className="font-mono font-black">{readiness.missingDupr.length}</b> 人
            </li>
          </ul>
          {readiness.pendingConfirmation.length > 0 && (
            <p className="mt-3 text-[14px] font-bold text-[#9A5B00]">
              待四人確認：第 {readiness.pendingConfirmation.join("、")} 場
            </p>
          )}
          {readiness.missingDupr.length > 0 && (
            <p className="mt-1 text-[14px] font-bold text-[#9A5B00]">
              缺 DUPR ID：{readiness.missingDupr.map((p) => `#${p.seq} ${p.name}`).join("、")}
            </p>
          )}

          {event.submitError && event.status !== "SUBMITTED" && (
            <p className="mt-3 bg-[#FFF4E5] px-4 py-2 text-[14px] font-bold text-[#9A5B00]">
              上傳狀態：{event.submitError}
            </p>
          )}
          {event.status === "SUBMITTED" && event.submittedAt && (
            <p className="mt-3 bg-[var(--surface-tint)] px-4 py-2 text-[14px] font-bold text-[#1B6B73]">
              已於 {formatTaipeiDateTime(event.submittedAt)} 匯入 DUPR
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
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
                  className="btn-brand disabled:opacity-40"
                >
                  最終確認並匯入 DUPR（{readiness.confirmed} 場）
                </button>
              </ConfirmForm>
            )}
            {event.status === "FINALIZED" && (
              <>
                <form action={retrySubmitDuprEvent.bind(null, tenantSlug, eventId)}>
                  <button type="submit" className="btn-brand">
                    重新上傳 DUPR
                  </button>
                </form>
                <form action={reopenDuprEvent.bind(null, tenantSlug, eventId)}>
                  <button
                    type="submit"
                    className="bg-[var(--bg)] px-4 py-2 text-[14px] font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
                  >
                    退回修改
                  </button>
                </form>
              </>
            )}
            {readiness.confirmed > 0 && (
              <a
                href={ROUTES.tenantAdminDuprEventCsv(tenantSlug, event.id)}
                className="bg-[var(--bg)] px-4 py-2 text-[14px] font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
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
            className="bg-[#FCECE9] px-5 py-2.5 text-[14px] font-black text-[#B42318] hover:bg-[#F8D7D1]"
          >
            刪除此活動
          </button>
        </ConfirmForm>
      )}
    </div>
  );
}
