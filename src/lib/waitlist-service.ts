import { getConfirmedHeadCount } from "@/lib/activity-capacity";
import { ensureTenantMembership } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { bookActivity, BookingError } from "@/lib/booking-service";

export async function joinWaitlist(activityId: string, userId: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
  });

  if (!activity || activity.status !== "PUBLISHED") {
    throw new BookingError("活動不存在或未開放", "NOT_FOUND", 404);
  }

  const confirmedHeads = await getConfirmedHeadCount(activityId);
  if (confirmedHeads < activity.capacity) {
    throw new BookingError("尚有名額，請直接預約", "NOT_FULL");
  }

  const existingBooking = await prisma.booking.findUnique({
    where: { activityId_userId: { activityId, userId } },
  });
  if (existingBooking?.status === "CONFIRMED") {
    throw new BookingError("您已報名", "ALREADY_BOOKED");
  }

  const existingWait = await prisma.waitlistEntry.findUnique({
    where: { activityId_userId: { activityId, userId } },
  });
  if (existingWait?.status === "WAITING") {
    throw new BookingError("您已在候補名單", "ALREADY_WAITLIST");
  }

  await ensureTenantMembership(activity.tenantId, userId);

  const maxPos = await prisma.waitlistEntry.aggregate({
    where: { activityId, status: "WAITING" },
    _max: { position: true },
  });

  return prisma.waitlistEntry.upsert({
    where: { activityId_userId: { activityId, userId } },
    create: {
      activityId,
      userId,
      position: (maxPos._max.position ?? 0) + 1,
      status: "WAITING",
    },
    update: { status: "WAITING", position: (maxPos._max.position ?? 0) + 1, promotedAt: null },
  });
}

/** 取消預約後，將候補第一位自動轉正 */
export async function promoteWaitlist(activityId: string) {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) return null;

  let confirmedHeads = await getConfirmedHeadCount(activityId);

  while (confirmedHeads < activity.capacity) {
    const next = await prisma.waitlistEntry.findFirst({
      where: { activityId, status: "WAITING" },
      orderBy: { position: "asc" },
    });
    if (!next) break;

    try {
      await bookActivity(activityId, next.userId);
      await prisma.waitlistEntry.update({
        where: { id: next.id },
        data: { status: "PROMOTED", promotedAt: new Date() },
      });
      confirmedHeads = await getConfirmedHeadCount(activityId);
      return next;
    } catch (e) {
      if (e instanceof BookingError && e.code === "FULL") break;
      await prisma.waitlistEntry.update({
        where: { id: next.id },
        data: { status: "CANCELLED" },
      });
    }
  }
  return null;
}

export async function leaveWaitlist(activityId: string, userId: string) {
  await prisma.waitlistEntry.updateMany({
    where: { activityId, userId, status: "WAITING" },
    data: { status: "CANCELLED" },
  });
}
