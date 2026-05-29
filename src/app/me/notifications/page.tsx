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
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800">通知設定</h2>
        <Badge variant="warning">LINE 推播</Badge>
      </div>
      <p className="text-sm text-slate-600">
        使用 LINE 登入後可綁定推播帳號；請於 .env 設定 LINE_CHANNEL_ACCESS_TOKEN 以實際發送。
      </p>
      {saved && <p className="text-sm text-brand-teal">已儲存通知設定</p>}
      {prefs.length === 0 ? (
        <p className="text-sm text-slate-500">加入場館後可設定各館通知偏好</p>
      ) : (
        prefs.map((p) => (
          <form
            key={p.id}
            action={updateNotificationPrefs}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <input type="hidden" name="tenantId" value={p.tenantId} />
            <h3 className="font-medium text-slate-800">{p.tenant.displayName}</h3>
            <p className="mt-1 text-xs text-slate-500">
              LINE {p.lineLinked ? `${"已綁定"} (${p.lineUserId?.slice(0, 8)}…)` : "未綁定 — 請用 LINE 登入一次"}
            </p>
            <ul className="mt-4 space-y-2">
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={item.key}
                    defaultChecked={p[item.key]}
                    className="rounded border-slate-300"
                  />
                  <label>{item.label}</label>
                </li>
              ))}
            </ul>
            <button
              type="submit"
              className="mt-4 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white"
            >
              儲存設定
            </button>
          </form>
        ))
      )}
    </section>
  );
}
