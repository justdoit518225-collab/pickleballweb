import Link from "next/link";
import {
  createDuprEventManual,
  deleteDuprEvent,
} from "@/app/admin/[tenantSlug]/dupr-events/actions";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Badge } from "@/components/ui/badge";
import { requireTenantStaff } from "@/lib/authz";
import { ROUTES } from "@/lib/constants";
import { DUPR_EVENT_STATUS_LABELS } from "@/lib/dupr-event";
import { isValidYmd } from "@/lib/fitbook";
import { formatTaipeiDateTime } from "@/lib/format-datetime";
import { prisma } from "@/lib/prisma";
import { getTaipeiYmd } from "@/lib/venue-timezone";

const statusVariant = {
  DRAFT: "published",
  CHECK_IN: "warning",
  SCHEDULED: "dupr",
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
  const { tenant } = await requireTenantStaff(tenantSlug);
  const date = sp.date && isValidYmd(sp.date) ? sp.date : getTaipeiYmd(new Date());

  const [events, venues] = await Promise.all([
    prisma.duprEvent.findMany({
      where: { tenantId: tenant.id },
      orderBy: { startAt: "desc" },
      take: 50,
      include: {
        _count: { select: { players: true, matches: true } },
        players: { select: { checkedInAt: true } },
        matches: { select: { confirmedAt: true } },
      },
    }),
    prisma.venue.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      {sp.error && (
        <p className="bg-[#FCECE9] px-4 py-3 text-[14px] font-bold text-[#B42318]">{sp.error}</p>
      )}
      {sp.saved && (
        <p className="bg-[var(--surface-tint)] px-4 py-3 text-[14px] font-bold text-[#1B6B73]">{sp.saved}</p>
      )}

      <section className="bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-[20px] font-black text-brand-navy">DUPR 對戰活動管理</h2>
            <p className="mt-1 text-[14px] text-[var(--muted)]">
              建立活動後即開放球友登入網站報名 → 活動開始時由工作人員按下「開始活動」進入 QR Code 報到 → 報到完畢按下「開始賽程」展開當日賽程。
            </p>
          </div>
          <Link
            href={ROUTES.tenantDuprEvents(tenantSlug)}
            className="text-[14px] font-black text-[#1B6B73] hover:text-brand-navy"
          >
            前往前台報名／報到／賽程頁 →
          </Link>
        </div>

        {events.length === 0 ? (
          <p className="mt-4 bg-[var(--bg)] p-6 text-[14px] text-[var(--muted)]">
            尚無 DUPR 對戰活動，請從下方建立新場次並開放球友登入報名。
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {events.map((e) => {
              const confirmed = e.matches.filter((m) => m.confirmedAt).length;
              const checkedIn = e.players.filter((p) => p.checkedInAt != null).length;
              return (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-3 bg-[var(--bg)] px-5 py-4 text-[14px]"
                >
                  <Badge variant={statusVariant[e.status]}>{DUPR_EVENT_STATUS_LABELS[e.status]}</Badge>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={ROUTES.tenantAdminDuprEvent(tenantSlug, e.id)}
                      className="text-[16px] font-black text-brand-navy hover:text-[#1B6B73]"
                    >
                      {e.title}
                    </Link>
                    <p className="mt-0.5 text-[14px] text-[var(--muted)]">
                      {formatTaipeiDateTime(e.startAt)}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </div>
                  <span className="text-[14px] font-bold tabular-nums text-brand-navy">
                    {e.status === "DRAFT"
                      ? `報名 ${e._count.players}/${e.capacity} 人`
                      : e.status === "CHECK_IN"
                        ? `已報到 ${checkedIn}/${e._count.players} 人`
                        : `${e._count.players} 人 · 已確認 ${confirmed}/${e._count.matches} 場`}
                  </span>
                  <Link
                    href={ROUTES.tenantAdminDuprEvent(tenantSlug, e.id)}
                    className="bg-brand-navy px-3 py-1.5 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy"
                  >
                    控場管理
                  </Link>
                  {e.status !== "SUBMITTED" && (
                    <ConfirmForm
                      action={deleteDuprEvent.bind(null, tenantSlug, e.id)}
                      message={`確定刪除「${e.title}」？名單、對戰表與分數將一併刪除。`}
                    >
                      <button
                        type="submit"
                        className="bg-[#FCECE9] px-3 py-1.5 text-[14px] font-black text-[#B42318] hover:bg-[#F8D7D1]"
                      >
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

      <section className="bg-white p-6">
        <h2 className="text-[20px] font-black text-brand-navy">建立 DUPR 活動（開放球友登入報名）</h2>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          建立後活動將顯示於俱樂部前台，讓球友登入網站報名參賽。
        </p>
        <form action={createDuprEventManual.bind(null, tenantSlug)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-[14px] sm:col-span-2">
            <span className="mb-1 block text-[14px] font-bold text-brand-navy">活動名稱</span>
            <input
              name="title"
              required
              placeholder="例如：週五晚間 DUPR 雙打積分認證賽"
              className="w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
            />
          </label>
          <label className="text-[14px]">
            <span className="mb-1 block text-[14px] font-bold text-brand-navy">日期</span>
            <input
              type="date"
              name="date"
              required
              defaultValue={date}
              className="w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[14px]">
              <span className="mb-1 block text-[14px] font-bold text-brand-navy">開始時間</span>
              <input
                type="time"
                name="startTime"
                defaultValue="19:00"
                className="w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
              />
            </label>
            <label className="text-[14px]">
              <span className="mb-1 block text-[14px] font-bold text-brand-navy">結束時間</span>
              <input
                type="time"
                name="endTime"
                defaultValue="22:00"
                className="w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
              />
            </label>
          </div>
          <label className="text-[14px]">
            <span className="mb-1 block text-[14px] font-bold text-brand-navy">比賽地點／場館</span>
            <input
              name="location"
              list="venue-locations"
              placeholder={venues[0]?.name ?? "請輸入場館地點"}
              defaultValue={venues[0]?.name ?? ""}
              className="w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
            />
            <datalist id="venue-locations">
              {venues.map((v) => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[14px]">
              <span className="mb-1 block text-[14px] font-bold text-brand-navy">報名名額上限</span>
              <input
                type="number"
                name="capacity"
                min={4}
                max={64}
                defaultValue={16}
                className="w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] font-bold text-brand-navy"
              />
            </label>
            <label className="text-[14px]">
              <span className="mb-1 block text-[14px] font-bold text-brand-navy">預計使用場地數</span>
              <input
                type="number"
                name="courtCount"
                min={1}
                max={16}
                defaultValue={2}
                className="w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] font-bold text-brand-navy"
              />
            </label>
          </div>
          <details className="sm:col-span-2">
            <summary className="cursor-pointer text-[14px] font-bold text-[var(--muted)]">
              預先加入部分球員名單（選填，一般由球友自行登入網站報名）
            </summary>
            <textarea
              name="roster"
              rows={4}
              placeholder={"每行一位，可寫「名字, DUPR ID」"}
              className="mt-2 w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
            />
          </details>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-brand">
              建立活動並開放報名
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
