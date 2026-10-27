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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-6 py-4">
        <p className="text-base font-semibold text-brand-navy">
          站內通知收件匣（LINE / Email 亦會同步推送）
        </p>
        {notifications.some((n) => !n.readAt) && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="btn-brand px-4 py-2 text-sm font-bold text-white"
            >
              全部標為已讀
            </button>
          </form>
        )}
      </div>
      <ul className="space-y-3">
        {notifications.length === 0 ? (
          <li className="bg-white px-6 py-10 text-base text-[var(--muted)]">
            目前尚無站內通知。
          </li>
        ) : (
          notifications.map((n) => (
            <li
              key={n.id}
              className={`p-5 text-base ${
                n.readAt ? "bg-white" : "bg-brand-lime-soft"
              }`}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-extrabold text-brand-navy">{n.title}</span>
                <span className="text-sm text-[var(--muted)] tabular-nums">
                  {n.createdAt.toLocaleString("zh-TW")}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[var(--muted)]">
                {n.body}
              </p>
              {!n.readAt && (
                <form
                  action={markNotificationRead.bind(null, n.id)}
                  className="mt-3"
                >
                  <button
                    type="submit"
                    className="bg-brand-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-teal"
                  >
                    標為已讀
                  </button>
                </form>
              )}
            </li>
          ))
        )}
      </ul>
      <Link
        href="/me"
        className="inline-block text-sm font-bold text-[#1D6D75] hover:text-brand-navy"
      >
        ← 返回會員中心總覽
      </Link>
    </div>
  );
}
