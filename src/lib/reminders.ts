import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

/** 發送 24 小時內即將開始的活動提醒 */
export async function sendActivityReminders() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const activities = await prisma.activity.findMany({
    where: {
      status: "PUBLISHED",
      startAt: { gt: now, lte: in24h },
    },
    include: {
      bookings: { where: { status: "CONFIRMED" }, select: { userId: true } },
    },
  });

  let sent = 0;
  for (const activity of activities) {
    for (const b of activity.bookings) {
      await notifyUser(
        b.userId,
        activity.tenantId,
        "reminder",
        `【PlayPlayPlay】提醒：「${activity.title}」將於 ${activity.startAt.toLocaleString("zh-TW")} 開始`,
      );
      sent += 1;
    }
  }
  return { activities: activities.length, notifications: sent };
}
