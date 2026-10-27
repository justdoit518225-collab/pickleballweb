import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  addDuprEventPlayers,
  adminCheckInAllPlayers,
  adminClearMatchScore,
  adminReopenMatch,
  adminRevertCheckInToDraft,
  adminSaveMatchScore,
  adminStartCheckIn,
  adminTogglePlayerCheckIn,
  deleteDuprEvent,
  finalizeDuprEvent,
  generateDuprEventSchedule,
  removeDuprEventPlayer,
  reopenDuprEvent,
  resetDuprEventToDraft,
  retrySubmitDuprEvent,
  saveDuprEventRoster,
  updateDuprEventInfo,
} from "@/app/admin/[tenantSlug]/dupr-events/actions";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { QrCodeSvg } from "@/components/dupr/qr-code-svg";
import { Badge } from "@/components/ui/badge";
import { requireTenantStaff } from "@/lib/authz";
import { ROUTES } from "@/lib/constants";
import {
  checkFinalizeReadiness,
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
import { signEventCheckInToken } from "@/lib/dupr-scoring-access";
import { formatTaipeiDateTime, formatTaipeiTime } from "@/lib/format-datetime";

const statusVariant = {
  DRAFT: "published",
  CHECK_IN: "warning",
  SCHEDULED: "dupr",
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
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const frontPath = ROUTES.tenantDuprEvent(tenantSlug, event.id);
  const frontUrl = `${proto}://${host}${frontPath}`;
  const eventCheckInUrl = `${frontUrl}?checkin=${signEventCheckInToken(event.id)}`;

  const n = event.players.length;
  const checkedInCount = event.players.filter((p) => p.checkedInAt != null).length;
  const bySeq = new Map(event.players.map((p) => [p.seq, p]));
  const label = (seq: number) => `#${seq} ${bySeq.get(seq)?.name ?? "?"}`;
  const hasScores = event.matches.some((m) => m.scoreA != null);
  const editable =
    event.status === "DRAFT" || event.status === "CHECK_IN" || event.status === "SCHEDULED";
  const canEditRoster = event.status === "DRAFT" || event.status === "CHECK_IN";
  const readiness = checkFinalizeReadiness(event);
  const missingDuprCount = event.players.filter((p) => !p.duprId).length;
  const courts = effectiveCourtCount(Math.max(n, 4), event.courtCount);
  const scheduleText = event.matches.length > 0 ? formatScheduleText(n, event.matches) : "";

  const eventId = event.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={ROUTES.tenantAdminDuprEvents(tenantSlug)}
          className="inline-block text-[14px] font-black text-[#1B6B73] hover:text-brand-navy"
        >
          ← DUPR 對戰活動管理
        </Link>
        <Link
          href={frontPath}
          target="_blank"
          className="bg-brand-navy px-4 py-2 text-[14px] font-black text-brand-lime hover:bg-brand-lime hover:text-brand-navy"
        >
          開啟前台活動／報到／賽程頁 ↗
        </Link>
      </div>

      {sp.error && (
        <p className="bg-[#FCECE9] px-4 py-3 text-[14px] font-bold text-[#B42318]">{sp.error}</p>
      )}
      {sp.saved && (
        <p className="bg-[var(--surface-tint)] px-4 py-3 text-[14px] font-bold text-[#1B6B73]">{sp.saved}</p>
      )}

      {/* 活動標題與基本設定 */}
      <section className="bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant[event.status]}>{DUPR_EVENT_STATUS_LABELS[event.status]}</Badge>
          <span className="text-[14px] font-bold tabular-nums text-[var(--muted)]">
            報名 {n} / {event.capacity} 人 · 已報到 {checkedInCount} 人
          </span>
        </div>
        <h2 className="mt-3 text-[24px] font-black text-brand-navy">{event.title}</h2>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          {formatTaipeiDateTime(event.startAt)}
          {event.endAt ? ` – ${formatTaipeiTime(event.endAt)}` : ""}
          {event.location ? ` · ${event.location}` : ""}
        </p>
        {editable && (
          <details className="mt-4">
            <summary className="cursor-pointer text-[14px] font-bold text-brand-navy">編輯活動資訊與名額</summary>
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
              <label className="text-[14px]">
                <span className="mb-1 block text-[14px] font-bold text-brand-navy">名額上限</span>
                <input
                  type="number"
                  name="capacity"
                  min={4}
                  max={64}
                  defaultValue={event.capacity}
                  className="w-24 bg-[var(--bg)] px-4 py-2 text-[14px] font-bold text-brand-navy"
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

      {/* 流程控制中心：步驟 1（開始活動進入報到） & 步驟 2（QR Code 報到與開始賽程） */}
      {event.status === "DRAFT" && (
        <section className="bg-brand-navy p-6 text-white">
          <span className="bg-brand-lime px-2.5 py-0.5 text-[12px] font-black text-brand-navy">
            目前階段：開放球友登入報名中（{n} / {event.capacity} 人）
          </span>
          <h3 className="mt-3 text-[20px] font-black text-white">
            步驟 1：活動時間到時，按下「開始活動」進入現場報到程序
          </h3>
          <p className="mt-1 text-[14px] text-[#C8D8E4]">
            球友可從俱樂部前台登入報名此場活動。當活動開始時，請點擊下方按鈕啟動 QR Code 報到程序。
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <form action={adminStartCheckIn.bind(null, tenantSlug, eventId)}>
              <button
                type="submit"
                className="bg-brand-lime px-6 py-3 text-[16px] font-black text-brand-navy transition-colors hover:bg-white"
              >
                開始活動（進入 QR Code 報到程序） →
              </button>
            </form>
            <Link
              href={frontPath}
              target="_blank"
              className="text-[14px] font-bold text-white underline"
            >
              報名網址：{frontUrl}
            </Link>
          </div>
        </section>
      )}

      {event.status === "CHECK_IN" && (
        <section className="bg-brand-navy p-6 text-white">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="flex flex-col items-center bg-[#163560] p-6 text-center lg:col-span-5">
              <span className="bg-brand-lime px-3 py-1 text-[12px] font-black text-brand-navy">
                請參賽球友用手機掃描此 QR Code 報到
              </span>
              <div className="mt-4">
                <QrCodeSvg value={eventCheckInUrl} size={220} />
              </div>
              <p className="mt-3 text-[16px] font-black text-white">{event.title} · 現場報到碼</p>
              <p className="mt-1 text-[14px] text-[#C8D8E4]">
                球友用手機相機或 LINE 掃描後自動完成本人報到
              </p>
            </div>

            <div className="space-y-4 lg:col-span-7">
              <span className="bg-amber-300 px-2.5 py-0.5 text-[12px] font-black text-brand-navy">
                目前階段：現場報到進行中
              </span>
              <h3 className="text-[24px] font-black text-white">
                報到進度：已報到 <span className="text-brand-lime">{checkedInCount}</span> / {n} 人
              </h3>
              <p className="text-[14px] text-[#C8D8E4]">
                參賽人員掃描左側 QR Code 或由下方名單手動點選報到。待全數報到完畢後，請按下「開始賽程」展開今日 DUPR 賽程。
              </p>
              <div className="flex flex-wrap gap-3">
                <form action={adminCheckInAllPlayers.bind(null, tenantSlug, eventId)}>
                  <button
                    type="submit"
                    className="bg-white px-4 py-2 text-[14px] font-black text-brand-navy hover:bg-brand-lime"
                  >
                    全體標記為已報到
                  </button>
                </form>
                <form action={adminRevertCheckInToDraft.bind(null, tenantSlug, eventId)}>
                  <button
                    type="submit"
                    className="bg-[#163560] px-4 py-2 text-[14px] font-bold text-[#C8D8E4] hover:bg-white hover:text-brand-navy"
                  >
                    ← 退回開放報名階段
                  </button>
                </form>
              </div>

              <form
                action={generateDuprEventSchedule.bind(null, tenantSlug, eventId)}
                className="mt-4 space-y-4 bg-[#163560] p-5"
              >
                <h4 className="text-[16px] font-black text-brand-lime">
                  步驟 2：都報到之後，按下「開始賽程」展開當日對戰表
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-[14px]">
                    <span className="mb-1 block font-bold text-[#C8D8E4]">同時使用場地數</span>
                    <input
                      type="number"
                      name="courtCount"
                      min={1}
                      max={16}
                      defaultValue={event.courtCount}
                      className="w-full bg-white px-3 py-2 text-[14px] font-black text-brand-navy"
                    />
                  </label>
                  <label className="block text-[14px]">
                    <span className="mb-1 block font-bold text-[#C8D8E4]">輪數（空白＝自動）</span>
                    <input
                      type="number"
                      name="rounds"
                      min={1}
                      max={60}
                      placeholder={
                        checkedInCount >= MIN_PLAYERS
                          ? String(defaultRoundCount(checkedInCount, event.courtCount))
                          : ""
                      }
                      className="w-full bg-white px-3 py-2 text-[14px] font-black text-brand-navy"
                    />
                  </label>
                  <label className="block text-[14px]">
                    <span className="mb-1 block font-bold text-[#C8D8E4]">排入賽程對象</span>
                    <select
                      name="rosterScope"
                      defaultValue="checkedIn"
                      className="w-full bg-white px-3 py-2 text-[14px] font-black text-brand-navy"
                    >
                      <option value="checkedIn">僅已報到球員（{checkedInCount} 人）</option>
                      <option value="all">全部報名球員（{n} 人）</option>
                    </select>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={n < MIN_PLAYERS}
                  className="w-full bg-brand-lime px-6 py-3.5 text-[16px] font-black text-brand-navy hover:bg-white disabled:opacity-40"
                >
                  開始賽程（展開今日 DUPR 對戰表） →
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* 報名與報到名單 */}
      <section className="bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[20px] font-black text-brand-navy">
            參賽名單（已報名 {n} / {event.capacity} 人 · 已報到 {checkedInCount} 人）
          </h3>
          {missingDuprCount > 0 && (
            <p className="text-[14px] font-bold text-[#9A5B00]">
              {missingDuprCount} 位尚未填 DUPR ID（上傳 DUPR 前需補齊）
            </p>
          )}
        </div>
        {n === 0 ? (
          <p className="mt-3 text-[14px] text-[var(--muted)]">目前尚無球員報名</p>
        ) : (
          <form action={saveDuprEventRoster.bind(null, tenantSlug, eventId)} className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[38rem] text-[14px]">
                <thead className="bg-brand-navy text-white">
                  <tr>
                    <th className="w-16 px-3 py-2 text-left font-black">編號</th>
                    <th className="px-3 py-2 text-left font-black">名稱</th>
                    <th className="px-3 py-2 text-left font-black">DUPR ID</th>
                    <th className="w-32 px-3 py-2 text-left font-black">報到狀態</th>
                    {canEditRoster && <th className="w-28 px-3 py-2 text-right font-black">操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {event.players.map((p, idx) => {
                    const checked = Boolean(p.checkedInAt);
                    return (
                      <tr
                        key={p.id}
                        className={idx % 2 === 1 ? "bg-[var(--bg)]" : "bg-white"}
                      >
                        <td className="px-3 py-2 font-black tabular-nums text-brand-navy">
                          {p.seq}
                        </td>
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
                            className={`w-full px-3 py-1.5 text-[14px] font-bold uppercase tabular-nums disabled:opacity-60 ${
                              p.duprId ? "bg-[var(--bg)] text-brand-navy" : "bg-[#FFF4E5] text-[#9A5B00]"
                            }`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          {checked ? (
                            <span className="bg-[#1B6B73] px-2.5 py-1 text-[12px] font-black text-white">
                              已報到
                            </span>
                          ) : (
                            <span className="bg-[#FFF4E5] px-2.5 py-1 text-[12px] font-bold text-[#9A5B00]">
                              待報到
                            </span>
                          )}
                        </td>
                        {canEditRoster && (
                          <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">
                            <button
                              type="submit"
                              formAction={adminTogglePlayerCheckIn.bind(
                                null,
                                tenantSlug,
                                eventId,
                                p.id,
                                !checked,
                              )}
                              className="text-[14px] font-bold text-[#1B6B73] hover:underline"
                            >
                              {checked ? "取消報到" : "報到"}
                            </button>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
            {editable && (
              <button type="submit" className="btn-brand mt-4">
                儲存名單變更
              </button>
            )}
          </form>
        )}

        {canEditRoster && (
          <form action={addDuprEventPlayers.bind(null, tenantSlug, eventId)} className="mt-6 space-y-2">
            <label className="block text-[14px]">
              <span className="mb-1 block text-[14px] font-bold text-brand-navy">
                手動新增球員（每行一位，可寫「名字, DUPR ID」）
              </span>
              <textarea
                name="roster"
                rows={3}
                className="w-full bg-[var(--bg)] px-4 py-2 text-[14px] text-brand-navy"
              />
            </label>
            <button
              type="submit"
              className="bg-brand-navy px-4 py-2 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy"
            >
              新增球員
            </button>
          </form>
        )}
      </section>

      {/* 對戰表與比分管理 */}
      <section className="bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[20px] font-black text-brand-navy">當日賽程與對戰表</h3>
          {event.status === "SCHEDULED" && !hasScores && (
            <form action={resetDuprEventToDraft.bind(null, tenantSlug, eventId)}>
              <button
                type="submit"
                className="bg-[var(--bg)] px-4 py-2 text-[14px] font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
              >
                ← 退回報到階段重新排程
              </button>
            </form>
          )}
        </div>

        {event.matches.length === 0 ? (
          <p className="mt-4 text-[14px] text-[var(--muted)]">
            尚未展開賽程。請先完成「開始活動 → 參賽人員報到 → 按下開始賽程」。
          </p>
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
                className="mt-2 w-full bg-[var(--bg)] px-4 py-3 text-[14px] text-brand-navy"
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
                  {event.matches.map((m, idx) => {
                    const confirmedSeqs = new Set(m.confirmations.map((c) => c.playerSeq));
                    const seqs = matchPlayerSeqs(m);
                    return (
                      <tr
                        key={m.id}
                        className={
                          m.confirmedAt
                            ? "bg-[var(--surface-tint)]"
                            : idx % 2 === 1
                              ? "bg-[var(--bg)]"
                              : "bg-white"
                        }
                      >
                        <td className="whitespace-nowrap px-3 py-2 font-bold tabular-nums text-brand-navy">
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
                                className="w-12 bg-[var(--bg)] px-2 py-1 text-center font-bold tabular-nums text-brand-navy"
                              />
                              <span>:</span>
                              <input
                                name="scoreB"
                                defaultValue={m.scoreB ?? ""}
                                inputMode="numeric"
                                className="w-12 bg-[var(--bg)] px-2 py-1 text-center font-bold tabular-nums text-brand-navy"
                              />
                              <button
                                type="submit"
                                className="bg-brand-navy px-2.5 py-1 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy"
                              >
                                存
                              </button>
                            </form>
                          ) : (
                            <p className="text-center font-black tabular-nums text-brand-navy">
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
                            <span className="font-black text-[#1B6B73]">四人已確認</span>
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
              已填分 <b className="font-black tabular-nums">{readiness.scored}</b> 場
            </li>
            <li className="bg-[var(--bg)] px-4 py-3 text-brand-navy">
              四人確認 <b className="font-black tabular-nums">{readiness.confirmed}</b> 場
            </li>
            <li className="bg-[var(--bg)] px-4 py-3 text-brand-navy">
              未開打 <b className="font-black tabular-nums">{readiness.unscored}</b> 場（不上傳）
            </li>
            <li
              className={`px-4 py-3 ${
                readiness.missingDupr.length ? "bg-[#FFF4E5] text-[#9A5B00]" : "bg-[var(--bg)] text-brand-navy"
              }`}
            >
              缺 DUPR ID <b className="font-black tabular-nums">{readiness.missingDupr.length}</b> 人
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
