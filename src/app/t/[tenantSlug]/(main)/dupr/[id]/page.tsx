import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  cancelDuprRegistrationAction,
  enterScoringPin,
  registerDuprAction,
  setPlayerConfirmation,
  staffCheckInAllAction,
  staffRevertCheckInAction,
  staffStartDuprCheckInAction,
  staffStartDuprScheduleAction,
  staffTogglePlayerCheckInAction,
  submitMatchScore,
} from "@/app/t/[tenantSlug]/(main)/dupr/actions";
import { CheckInAutoRefresh } from "@/components/dupr/check-in-auto-refresh";
import { DuprScoringBoard } from "@/components/dupr/dupr-scoring-board";
import { QrCodeSvg } from "@/components/dupr/qr-code-svg";
import { ScoringPinForm } from "@/components/dupr/scoring-pin-form";
import { ROUTES } from "@/lib/constants";
import {
  checkInPlayerByUser,
  DUPR_EVENT_STATUS_LABELS,
  DuprEventError,
  getTenantDuprEvent,
  setPlayerCheckInStatus,
} from "@/lib/dupr-event";
import { defaultRoundCount, MIN_PLAYERS } from "@/lib/dupr-schedule";
import {
  canScoreEvent,
  isTenantStaffUser,
  signEventCheckInToken,
  signPlayerCheckInToken,
  verifyEventCheckInToken,
  verifyPlayerCheckInToken,
} from "@/lib/dupr-scoring-access";
import { formatTaipeiDateTime, formatTaipeiTime } from "@/lib/format-datetime";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";

export const metadata: Metadata = { title: "DUPR 活動與賽程" };

export default async function DuprScoringPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
  searchParams: Promise<{
    checkin?: string;
    checkinPlayer?: string;
    token?: string;
    saved?: string;
    error?: string;
  }>;
}) {
  const { tenantSlug, id } = await params;
  const sp = await searchParams;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  let event = await getTenantDuprEvent(tenant.id, id);
  if (!event) notFound();

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isStaff = await isTenantStaffUser(tenant.id);
  const pagePath = ROUTES.tenantDuprEvent(tenantSlug, event.id);

  let autoNotice: { type: "saved" | "error"; text: string } | null = null;

  // 1) 球友掃描現場「活動報到 QR Code」(?checkin=...)
  if (sp.checkin) {
    if (!userId) {
      redirect(ROUTES.loginWithCallback(`${pagePath}?checkin=${encodeURIComponent(sp.checkin)}`));
    }
    if (verifyEventCheckInToken(event.id, sp.checkin)) {
      try {
        const p = await checkInPlayerByUser(tenant.id, event.id, userId);
        autoNotice = {
          type: "saved",
          text: `掃描報到成功！編號 #${p.seq} ${p.name} 已完成報到，請等待工作人員開始賽程。`,
        };
        event = (await getTenantDuprEvent(tenant.id, id)) ?? event;
      } catch (e) {
        autoNotice = {
          type: "error",
          text: e instanceof DuprEventError ? e.message : "報到失敗",
        };
      }
    } else {
      autoNotice = { type: "error", text: "報到 QR Code 無效或已過期" };
    }
  }

  // 2) 員工掃描球友「個人報到 QR Code」(?checkinPlayer=...&token=...)
  if (sp.checkinPlayer && sp.token) {
    if (!userId) {
      redirect(
        ROUTES.loginWithCallback(
          `${pagePath}?checkinPlayer=${encodeURIComponent(sp.checkinPlayer)}&token=${encodeURIComponent(sp.token)}`,
        ),
      );
    }
    if (!isStaff) {
      autoNotice = { type: "error", text: "此為工作人員專用掃描連結，請改掃現場活動報到 QR Code" };
    } else if (verifyPlayerCheckInToken(event.id, sp.checkinPlayer, sp.token)) {
      try {
        const p = await setPlayerCheckInStatus(tenant.id, event.id, sp.checkinPlayer, true);
        autoNotice = {
          type: "saved",
          text: `掃描完成！已為編號 #${p.seq} ${p.name} 完成現場報到。`,
        };
        event = (await getTenantDuprEvent(tenant.id, id)) ?? event;
      } catch (e) {
        autoNotice = {
          type: "error",
          text: e instanceof DuprEventError ? e.message : "報到失敗",
        };
      }
    } else {
      autoNotice = { type: "error", text: "參賽者報到碼驗證失敗" };
    }
  }

  const [userProfile, membership] = userId
    ? await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true, duprProfile: { select: { duprId: true } } },
        }),
        prisma.tenantMembership.findUnique({
          where: { tenantId_userId: { tenantId: tenant.id, userId } },
          select: { nickname: true },
        }),
      ])
    : [null, null];

  const defaultPlayerName =
    membership?.nickname?.trim() ||
    userProfile?.name?.trim() ||
    userProfile?.email?.split("@")[0] ||
    "";
  const defaultDuprId = userProfile?.duprProfile?.duprId ?? "";

  const myPlayer = userId ? event.players.find((p) => p.userId === userId) ?? null : null;
  const canScoreAll = await canScoreEvent(event);
  const scoringOpen = event.status === "SCHEDULED";
  const checkedInCount = event.players.filter((p) => p.checkedInAt != null).length;
  const isFull = event.players.length >= event.capacity;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}${pagePath}`;
  const eventCheckInUrl = `${baseUrl}?checkin=${signEventCheckInToken(event.id)}`;
  const myPlayerCheckInUrl = myPlayer
    ? `${baseUrl}?checkinPlayer=${myPlayer.id}&token=${signPlayerCheckInToken(event.id, myPlayer.id)}`
    : null;

  const savedMessage = autoNotice?.type === "saved" ? autoNotice.text : sp.saved;
  const errorMessage = autoNotice?.type === "error" ? autoNotice.text : sp.error;

  return (
    <div>
      {/* Hero Masthead */}
      <section className="bg-brand-navy py-10 text-white sm:py-12">
        <div className="page-wrap">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={ROUTES.tenantDuprEvents(tenantSlug)}
              className="text-xs font-bold text-brand-lime hover:underline"
            >
              ← 返回 {tenant.displayName} · DUPR 列表
            </Link>
            {isStaff && (
              <Link
                href={ROUTES.tenantAdminDuprEvent(tenantSlug, event.id)}
                className="bg-[#163560] px-3.5 py-1.5 text-xs font-black text-brand-lime hover:bg-white hover:text-brand-navy"
              >
                後台管理與匯入 DUPR →
              </Link>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={`px-2.5 py-0.5 text-xs font-extrabold ${
                event.status === "DRAFT"
                  ? "bg-brand-lime text-brand-navy"
                  : event.status === "CHECK_IN"
                    ? "bg-amber-300 text-brand-navy"
                    : scoringOpen
                      ? "bg-brand-lime text-brand-navy"
                      : "bg-brand-teal text-white"
              }`}
            >
              {DUPR_EVENT_STATUS_LABELS[event.status]}
            </span>
            <span className="text-xs font-bold text-white/80 tabular-nums">
              {formatTaipeiDateTime(event.startAt)}
              {event.endAt ? ` – ${formatTaipeiTime(event.endAt)}` : ""}
              {event.location ? ` · ${event.location}` : ""}
              {` · 已報名 ${event.players.length} / ${event.capacity} 人`}
              {event.status === "CHECK_IN" ? `（已報到 ${checkedInCount} 人）` : ""}
            </span>
          </div>
          <h1 className="type-head mt-3 text-white">{event.title}</h1>
        </div>
      </section>

      <div className="page-wrap py-10" data-ui>
        <div className="space-y-8">
          {errorMessage && (
            <p className="bg-[#FCECE9] px-5 py-4 text-[14px] font-bold text-[#B42318]">
              {errorMessage}
            </p>
          )}
          {savedMessage && (
            <p className="bg-brand-lime px-5 py-4 text-[14px] font-black text-brand-navy">
              {savedMessage}
            </p>
          )}

          {/* ─── 階段 1：開放報名中 (DRAFT) ──────────────────────────────────── */}
          {event.status === "DRAFT" && (
            <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
              <div className="space-y-6 lg:col-span-7">
                <section className="bg-white p-6 sm:p-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-[24px] font-black text-brand-navy">線上報名參賽</h2>
                    <span className="text-[16px] font-black tabular-nums text-[#1B6B73]">
                      名額 {event.players.length} / {event.capacity}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] text-[var(--muted)]">
                    請先登入本站帳號完成報名。活動當天由工作人員按下「開始活動」後，現場掃描 QR Code 完成報到即展開當日 DUPR 賽程。
                  </p>

                  {!userId ? (
                    <div className="mt-6 bg-[var(--bg)] p-6">
                      <p className="text-[16px] font-bold text-brand-navy">
                        報名 DUPR 積分賽需先登入帳號
                      </p>
                      <p className="mt-1 text-[14px] text-[var(--muted)]">
                        登入後系統會自動識別你的參賽場次，讓你直接查看專屬賽程並於每場賽後輸入比分。
                      </p>
                      <Link
                        href={ROUTES.loginWithCallback(pagePath)}
                        className="btn-brand mt-4 inline-block"
                      >
                        登入網站並報名 →
                      </Link>
                    </div>
                  ) : myPlayer ? (
                    <div className="mt-6 border-l-[6px] border-brand-lime bg-[var(--bg)] p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <span className="bg-brand-lime px-2.5 py-0.5 text-[12px] font-black text-brand-navy">
                            已完成報名
                          </span>
                          <p className="mt-2 text-[20px] font-black text-brand-navy">
                            參賽編號 #{myPlayer.seq} · {myPlayer.name}
                          </p>
                          <p className="mt-1 text-[14px] font-bold tabular-nums text-[var(--muted)]">
                            DUPR ID：{myPlayer.duprId ?? "尚未填寫（可於會員中心綁定）"}
                          </p>
                          <p className="mt-3 text-[14px] text-brand-navy">
                            到場後請等待工作人員開啟報到，即可掃描現場 QR Code 或出示右側個人報到碼完成報到。
                          </p>
                          <form
                            action={cancelDuprRegistrationAction.bind(null, tenantSlug, event.id)}
                            className="mt-4"
                          >
                            <button
                              type="submit"
                              className="bg-[#FCECE9] px-4 py-2 text-[14px] font-black text-[#B42318] hover:bg-[#F8D7D1]"
                            >
                              取消報名
                            </button>
                          </form>
                        </div>
                        {myPlayerCheckInUrl && (
                          <div className="text-center">
                            <QrCodeSvg value={myPlayerCheckInUrl} size={140} />
                            <p className="mt-1 text-[12px] font-bold text-[var(--muted)]">
                              你的個人報到碼
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : isFull ? (
                    <div className="mt-6 bg-[#FFF4E5] p-6">
                      <p className="text-[16px] font-black text-[#9A5B00]">
                        本場 DUPR 活動名額已滿（{event.capacity} 人）
                      </p>
                    </div>
                  ) : (
                    <form
                      action={registerDuprAction.bind(null, tenantSlug, event.id)}
                      className="mt-6 space-y-4 bg-[var(--bg)] p-6"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-[14px]">
                          <span className="mb-1 block font-bold text-brand-navy">參賽顯示名稱</span>
                          <input
                            name="name"
                            required
                            defaultValue={defaultPlayerName}
                            placeholder="請輸入你的稱呼"
                            className="w-full bg-white px-4 py-2.5 text-[14px] font-bold text-brand-navy"
                          />
                        </label>
                        <label className="block text-[14px]">
                          <span className="mb-1 block font-bold text-brand-navy">
                            DUPR ID（選填，已連結會自動帶入）
                          </span>
                          <input
                            name="duprId"
                            defaultValue={defaultDuprId}
                            placeholder="例如 ABC123"
                            className="w-full bg-white px-4 py-2.5 text-[14px] font-bold uppercase text-brand-navy"
                          />
                        </label>
                      </div>
                      <button type="submit" className="btn-brand">
                        立即報名參賽 →
                      </button>
                    </form>
                  )}
                </section>

                {isStaff && (
                  <section className="bg-brand-navy p-6 text-white sm:p-8">
                    <span className="bg-brand-lime px-2.5 py-0.5 text-[12px] font-black text-brand-navy">
                      俱樂部授權人員控場
                    </span>
                    <h3 className="mt-3 text-[20px] font-black text-white">
                      步驟 1：按下「開始活動」啟動現場報到
                    </h3>
                    <p className="mt-1 text-[14px] text-[#C8D8E4]">
                      按下後活動將進入「報到進行中」階段，畫面會產生現場報到 QR Code 供參賽球友掃描報到。
                    </p>
                    <form
                      action={staffStartDuprCheckInAction.bind(null, tenantSlug, event.id)}
                      className="mt-5"
                    >
                      <button
                        type="submit"
                        className="bg-brand-lime px-6 py-3 text-[16px] font-black text-brand-navy transition-colors hover:bg-white"
                      >
                        開始活動（進入報到程序） →
                      </button>
                    </form>
                  </section>
                )}
              </div>

              <aside className="bg-white p-6 lg:col-span-5">
                <h3 className="text-[20px] font-black text-brand-navy">
                  目前已報名球友（{event.players.length} / {event.capacity}）
                </h3>
                {event.players.length === 0 ? (
                  <p className="mt-4 bg-[var(--bg)] p-6 text-[14px] text-[var(--muted)]">
                    目前尚無球友報名，歡迎成為第一位報名者！
                  </p>
                ) : (
                  <ul className="mt-4 space-y-1.5">
                    {event.players.map((p) => {
                      const isMe = myPlayer?.id === p.id;
                      return (
                        <li
                          key={p.id}
                          className={`flex items-center justify-between px-4 py-3 text-[14px] ${
                            isMe ? "bg-brand-lime/25 font-black" : "bg-[var(--bg)]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-black tabular-nums text-brand-navy">
                              #{p.seq}
                            </span>
                            <span className="font-bold text-brand-navy">
                              {p.name}
                              {isMe && (
                                <span className="ml-2 bg-brand-lime px-2 py-0.5 text-[12px] font-black text-brand-navy">
                                  你
                                </span>
                              )}
                            </span>
                          </div>
                          <span className="text-[12px] font-bold tabular-nums text-[var(--muted)]">
                            {p.duprId ? `DUPR ${p.duprId}` : "已報名"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </aside>
            </div>
          )}

          {/* ─── 階段 2：活動開始 · 報到進行中 (CHECK_IN) ─────────────────────── */}
          {event.status === "CHECK_IN" && (
            <div className="space-y-8">
              <CheckInAutoRefresh />
              {isStaff && (
                <section className="bg-brand-navy p-6 text-white sm:p-8">
                  <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                    <div className="flex flex-col items-center bg-[#163560] p-6 text-center lg:col-span-5">
                      <span className="bg-brand-lime px-3 py-1 text-[12px] font-black text-brand-navy">
                        推薦方式：請參賽球友用手機掃描此 QR Code
                      </span>
                      <div className="mt-4">
                        <QrCodeSvg value={eventCheckInUrl} size={220} />
                      </div>
                      <p className="mt-3 text-[16px] font-black text-white">
                        {event.title} · 現場報到碼
                      </p>
                      <p className="mt-1 text-[14px] text-[#C8D8E4]">
                        球友用手機相機或 LINE 掃描後，即自動完成本人報到（或由工作人員掃描球友手機上的個人碼）
                      </p>
                    </div>

                    <div className="space-y-5 lg:col-span-7">
                      <div>
                        <span className="bg-amber-300 px-2.5 py-0.5 text-[12px] font-black text-brand-navy">
                          步驟 2：確認參賽人員報到並展開賽程
                        </span>
                        <h2 className="mt-2 text-[24px] font-black text-white">
                          報到進度：已報到{" "}
                          <span className="text-brand-lime">{checkedInCount}</span> /{" "}
                          {event.players.length} 人
                        </h2>
                        <p className="mt-1 text-[14px] text-[#C8D8E4]">
                          待現場球友皆完成報到後，請設定下方場地數並按下「開始賽程」，系統將自動依已報到人員展開今日輪轉對戰表。
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <form action={staffCheckInAllAction.bind(null, tenantSlug, event.id)}>
                          <button
                            type="submit"
                            className="bg-white px-4 py-2 text-[14px] font-black text-brand-navy hover:bg-brand-lime"
                          >
                            將全體報名者標記為已報到
                          </button>
                        </form>
                        <form action={staffRevertCheckInAction.bind(null, tenantSlug, event.id)}>
                          <button
                            type="submit"
                            className="bg-[#163560] px-4 py-2 text-[14px] font-bold text-[#C8D8E4] hover:bg-white hover:text-brand-navy"
                          >
                            ← 退回開放報名階段
                          </button>
                        </form>
                      </div>

                      <form
                        action={staffStartDuprScheduleAction.bind(null, tenantSlug, event.id)}
                        className="space-y-4 bg-[#163560] p-5"
                      >
                        <h3 className="text-[16px] font-black text-brand-lime">
                          步驟 3：按下「開始賽程」展開今日對戰表
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-3">
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
                              <option value="checkedIn">
                                僅已報到球員（{checkedInCount} 人）
                              </option>
                              <option value="all">
                                全部報名球員（{event.players.length} 人）
                              </option>
                            </select>
                          </label>
                        </div>
                        <button
                          type="submit"
                          disabled={event.players.length < MIN_PLAYERS}
                          className="w-full bg-brand-lime px-6 py-3.5 text-[16px] font-black text-brand-navy transition-colors hover:bg-white disabled:opacity-40"
                        >
                          開始賽程（展開今日 DUPR 對戰表） →
                        </button>
                      </form>
                    </div>
                  </div>
                </section>
              )}

              <section className="bg-white p-6 sm:p-8">
                <h2 className="text-[24px] font-black text-brand-navy">參賽人員現場報到</h2>
                {!userId ? (
                  <div className="mt-4 bg-[var(--bg)] p-6">
                    <p className="text-[16px] font-bold text-brand-navy">
                      請先登入你的報名帳號以完成現場報到
                    </p>
                    <Link
                      href={ROUTES.loginWithCallback(pagePath)}
                      className="btn-brand mt-4 inline-block"
                    >
                      登入帳號進行報到 →
                    </Link>
                  </div>
                ) : !myPlayer ? (
                  <div className="mt-4 bg-[#FFF4E5] p-6">
                    <p className="text-[16px] font-bold text-[#9A5B00]">
                      你的帳號尚未在本次報名名單中。如需現場補報名，請洽現場工作人員協助新增。
                    </p>
                  </div>
                ) : myPlayer.checkedInAt ? (
                  <div className="mt-4 border-l-[6px] border-brand-lime bg-[var(--surface-tint)] p-6">
                    <span className="bg-brand-lime px-2.5 py-0.5 text-[12px] font-black text-brand-navy">
                      報到完成
                    </span>
                    <p className="mt-2 text-[20px] font-black text-brand-navy">
                      編號 #{myPlayer.seq} {myPlayer.name} — 你已完成現場報到！
                    </p>
                    <p className="mt-1 text-[14px] text-[#1B6B73]">
                      目前全場報到進度：{checkedInCount} / {event.players.length} 人。待全體報到完畢、工作人員按下「開始賽程」後，此頁面將立即展開今日賽程並標示你的專屬場次。
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-6 bg-[var(--bg)] p-6 sm:grid-cols-12 sm:items-center">
                    <div className="space-y-3 sm:col-span-7">
                      <span className="bg-amber-300 px-2.5 py-0.5 text-[12px] font-black text-brand-navy">
                        待現場報到 · 編號 #{myPlayer.seq} {myPlayer.name}
                      </span>
                      <h3 className="text-[20px] font-black text-brand-navy">
                        請向現場工作人員完成互動報到（無法自行線上點擊報到）
                      </h3>
                      <p className="text-[14px] text-[var(--muted)]">
                        為確保所有排入賽程的球友皆已實際到場，報到須與現場工作人員互動完成：
                      </p>
                      <ul className="list-decimal space-y-1.5 pl-5 text-[14px] font-bold text-brand-navy">
                        <li>出示右側你的「個人參賽報到 QR Code」，由現場工作人員掃描完成報到</li>
                        <li>或使用手機相機／LINE 掃描現場工作人員手持出示的「活動報到 QR Code」</li>
                      </ul>
                      <p className="pt-1 text-[12px] font-bold text-[#1B6B73]">
                        工作人員掃描或確認後，本畫面將自動更新為「報到完成」。
                      </p>
                    </div>
                    {myPlayerCheckInUrl && (
                      <div className="flex flex-col items-center bg-white p-5 text-center sm:col-span-5">
                        <QrCodeSvg value={myPlayerCheckInUrl} size={190} />
                        <p className="mt-2 text-[14px] font-black text-brand-navy">
                          編號 #{myPlayer.seq} {myPlayer.name} 個人報到碼
                        </p>
                        <p className="mt-0.5 text-[12px] font-bold text-[var(--muted)]">
                          請出示此 QR Code 給現場工作人員掃描
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-[20px] font-black text-brand-navy">
                      現場報到名單（已報到 {checkedInCount} / {event.players.length} 人）
                    </h3>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[32rem] text-[14px]">
                      <thead className="bg-brand-navy text-white">
                        <tr>
                          <th className="w-16 px-4 py-2.5 text-left font-black">編號</th>
                          <th className="px-4 py-2.5 text-left font-black">參賽球員</th>
                          <th className="px-4 py-2.5 text-left font-black">DUPR ID</th>
                          <th className="px-4 py-2.5 text-left font-black">報到狀態</th>
                          {isStaff && <th className="px-4 py-2.5 text-right font-black">員工操作</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {event.players.map((p) => {
                          const checked = Boolean(p.checkedInAt);
                          const isMe = myPlayer?.id === p.id;
                          return (
                            <tr
                              key={p.id}
                              className={
                                isMe
                                  ? "bg-brand-lime/20"
                                  : checked
                                    ? "bg-[var(--surface-tint)]"
                                    : "bg-[var(--bg)]"
                              }
                            >
                              <td className="px-4 py-3 font-black tabular-nums text-brand-navy">
                                #{p.seq}
                              </td>
                              <td className="px-4 py-3 font-bold text-brand-navy">
                                {p.name}
                                {isMe && (
                                  <span className="ml-2 bg-brand-lime px-2 py-0.5 text-[12px] font-black text-brand-navy">
                                    你
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-[14px] font-bold tabular-nums text-[var(--muted)]">
                                {p.duprId ?? "-"}
                              </td>
                              <td className="px-4 py-3">
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
                              {isStaff && (
                                <td className="px-4 py-3 text-right">
                                  <form
                                    action={staffTogglePlayerCheckInAction.bind(
                                      null,
                                      tenantSlug,
                                      event.id,
                                      p.id,
                                      !checked,
                                    )}
                                  >
                                    <button
                                      type="submit"
                                      className={`px-3 py-1 text-[12px] font-black ${
                                        checked
                                          ? "bg-white text-[var(--muted)] hover:text-[#B42318]"
                                          : "bg-brand-navy text-white hover:bg-brand-lime hover:text-brand-navy"
                                      }`}
                                    >
                                      {checked ? "取消報到" : "手動報到"}
                                    </button>
                                  </form>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ─── 階段 3：賽程進行中 / 已最終確認 / 已匯入 DUPR ─────────────────── */}
          {(event.status === "SCHEDULED" ||
            event.status === "FINALIZED" ||
            event.status === "SUBMITTED") && (
            <>
              {!userId && scoringOpen && (
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5">
                  <div>
                    <p className="text-[16px] font-black text-brand-navy">
                      你是本場參賽球員嗎？登入後自動標示「你的場次」並可直接輸入比分！
                    </p>
                    <p className="mt-0.5 text-[14px] text-[var(--muted)]">
                      登入報名帳號後，每場比賽結束即可由該場次的參賽球員直接輸入並確認比分。
                    </p>
                  </div>
                  <Link
                    href={ROUTES.loginWithCallback(pagePath)}
                    className="btn-brand shrink-0"
                  >
                    登入參賽帳號 →
                  </Link>
                </div>
              )}

              {!canScoreAll && !myPlayer && scoringOpen && (
                <details className="bg-white p-4">
                  <summary className="cursor-pointer text-[14px] font-bold text-[var(--muted)]">
                    現場公用平板計分碼解鎖（非個人手機登入時使用）
                  </summary>
                  <div className="mt-3">
                    <ScoringPinForm action={enterScoringPin.bind(null, tenantSlug, event.id)} />
                  </div>
                </details>
              )}

              {!scoringOpen && (
                <p className="bg-brand-lime-soft px-5 py-3.5 text-sm font-bold text-brand-navy">
                  本場比分已由負責人最終確認，無法再修改。
                </p>
              )}

              <DuprScoringBoard
                players={event.players.map((p) => ({ seq: p.seq, name: p.name }))}
                matches={event.matches.map((m) => ({
                  id: m.id,
                  seq: m.seq,
                  round: m.round,
                  court: m.court,
                  teamA: [m.teamA1, m.teamA2],
                  teamB: [m.teamB1, m.teamB2],
                  scoreA: m.scoreA,
                  scoreB: m.scoreB,
                  confirmedSeqs: m.confirmations.map((c) => c.playerSeq),
                  confirmed: Boolean(m.confirmedAt),
                }))}
                myPlayerSeq={myPlayer?.seq ?? null}
                canScore={canScoreAll}
                scoringOpen={scoringOpen}
                submitScore={submitMatchScore.bind(null, tenantSlug, event.id)}
                setConfirmation={setPlayerConfirmation.bind(null, tenantSlug, event.id)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
