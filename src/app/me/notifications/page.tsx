import { auth } from "@/auth";
import { updateNotificationPrefs } from "@/app/me/actions";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

const items = [
  { key: "masterEnabled", label: "總開關" },
  { key: "notifyBookingSelf", label: "預約成功 / 取消" },
  { key: "notifyBookingCancel", label: "他人取消" },
  { key: "notifyRosterChange", label: "已報名活動名單變動" },
  { key: "notifyActivityChange", label: "活動異動（停課、改期等）" },
  { key: "notifyReminder", label: "開課提醒" },
  { key: "notifyRentalBooking", label: "場地租借相關通知" },
] as const;

export default async function MeNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const session = await auth();
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: session!.user!.id },
    include: { tenant: true },
  });

  return (
    <section className="space-y-6">
      <div className="bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-extrabold text-brand-navy">LINE 推播與通知設定</h2>
          <Badge variant="warning">LINE 推播</Badge>
        </div>
        <p className="mt-2 max-w-[54ch] text-base text-[var(--muted)]">
          使用 LINE 登入後即可自動綁定推播帳號，隨時接收報名成功、候補遞補與開課提醒。
        </p>
        {saved && (
          <p className="mt-4 bg-brand-lime-soft px-4 py-2.5 text-sm font-bold text-brand-navy">
            已儲存通知設定
          </p>
        )}
      </div>

      {prefs.length === 0 ? (
        <div className="bg-white p-8">
          <p className="text-base text-[var(--muted)]">加入任一俱樂部場館後，即可設定各館通知偏好。</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {prefs.map((p) => (
            <form
              key={p.id}
              action={updateNotificationPrefs}
              className="bg-white p-6"
            >
              <input type="hidden" name="tenantId" value={p.tenantId} />
              <h3 className="text-xl font-extrabold text-brand-navy">
                {p.tenant.displayName}
              </h3>
              <p className="mt-1 text-sm font-semibold text-[#1D6D75]">
                LINE 狀態：{p.lineLinked ? `已綁定 (${p.lineUserId?.slice(0, 8)}…)` : "未綁定 — 請使用 LINE 登入一次"}
              </p>
              <ul className="mt-4 space-y-2.5 bg-[var(--bg)] p-4">
                {items.map((item) => (
                  <li key={item.key} className="flex items-center gap-2.5 text-base font-medium text-brand-navy">
                    <input
                      type="checkbox"
                      name={item.key}
                      defaultChecked={p[item.key]}
                      className="h-4 w-4 accent-brand-navy"
                    />
                    <label>{item.label}</label>
                  </li>
                ))}
              </ul>
              <button
                type="submit"
                className="btn-brand mt-5 px-5 py-2.5 text-sm font-extrabold text-white"
              >
                儲存推播設定
              </button>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
