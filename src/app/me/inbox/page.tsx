import Link from "next/link";
import { auth } from "@/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/app/me/actions";
import { prisma } from "@/lib/prisma";

export default async function MeInboxPage() {
  const session = await auth();
  const notifications = await prisma.userNotification.findMany({
    where: { userId: session!.user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">站內通知（LINE / Email 亦會同步推送）</p>
        {notifications.some((n) => !n.readAt) && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="text-sm text-brand-teal">
              全部標為已讀
            </button>
          </form>
        )}
      </div>
      <ul className="mt-4 space-y-2">
        {notifications.length === 0 ? (
          <li className="text-sm text-slate-500">尚無通知</li>
        ) : (
          notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 text-sm ${n.readAt ? "border-slate-100 bg-white" : "border-brand-teal-soft bg-brand-lime-soft/30"}`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium text-slate-800">{n.title}</span>
                <span className="text-xs text-slate-400">
                  {n.createdAt.toLocaleString("zh-TW")}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-slate-600">{n.body}</p>
              {!n.readAt && (
                <form action={markNotificationRead.bind(null, n.id)} className="mt-2">
                  <button type="submit" className="text-xs text-brand-teal">
                    標為已讀
                  </button>
                </form>
              )}
            </li>
          ))
        )}
      </ul>
      <Link href="/me" className="mt-6 inline-block text-sm text-brand-teal">
        ← 會員中心
      </Link>
    </div>
  );
}
