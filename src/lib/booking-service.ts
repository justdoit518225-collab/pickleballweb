import { canCancelBooking } from "@/lib/booking";
import {
  getConfirmedHeadCount,
  MAX_PARTY_SIZE_PER_BOOKING,
} from "@/lib/activity-capacity";
import { ensureTenantMembership } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

export class BookingError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 400,
  ) {
    super(message);
  }
}

function normalizePartySize(
  raw: number | undefined,
  activity: { type: string; requiresDupr: boolean },
): number {
  const partySize = raw ?? 1;
  if (!Number.isInteger(partySize) || partySize < 1) {
    throw new BookingError("請選擇有效人數", "INVALID_PARTY_SIZE");
  }
  if (partySize > MAX_PARTY_SIZE_PER_BOOKING) {
    throw new BookingError(
      `單次報名最多 ${MAX_PARTY_SIZE_PER_BOOKING} 人`,
      "INVALID_PARTY_SIZE",
    );
  }
  if (activity.type !== "OPEN_PLAY" || activity.requiresDupr) {
    if (partySize > 1) {
      throw new BookingError("此活動僅支援單人報名", "SINGLE_ONLY");
    }
    return 1;
  }
  return partySize;
}

export async function bookActivity(
  activityId: string,
  userId: string,
  options?: { partySize?: number },
) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
  });

  if (!activity || activity.status !== "PUBLISHED") {
    throw new BookingError("活動不存在或未開放預約", "NOT_FOUND", 404);
  }

  if (activity.startAt <= new Date()) {
    throw new BookingError("活動已開始，無法預約", "STARTED");
  }

  const partySize = normalizePartySize(options?.partySize, activity);

  const existing = await prisma.booking.findUnique({
    where: { activityId_userId: { activityId, userId } },
  });

  if (existing?.status === "CONFIRMED") {
    throw new BookingError("您已報名此活動", "ALREADY_BOOKED");
  }

  if (activity.requiresDupr) {
    const dupr = await prisma.duprProfile.findUnique({ where: { userId } });
    if (!dupr?.duprId || dupr.linkStatus !== "LINKED") {
      throw new BookingError(
        "此為 DUPR 專場，請先至會員中心連結 DUPR 資料",
        "DUPR_REQUIRED",
      );
    }
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: activity.tenantId, userId } },
  });
  if (membership?.isBanned) {
    throw new BookingError("您的帳號在此場館已被停權", "BANNED", 403);
  }

  await ensureTenantMembership(activity.tenantId, userId);

  const booking = await prisma.$transaction(async (tx) => {
    const headsWithoutUser = await getConfirmedHeadCount(activityId, tx, userId);
    if (headsWithoutUser + partySize > activity.capacity) {
      throw new BookingError("名額不足，請減少人數或加入候補", "FULL");
    }

    if (existing) {
      return tx.booking.update({
        where: { id: existing.id },
        data: { status: "CONFIRMED", cancelledAt: null, partySize },
      });
    }

    return tx.booking.create({
      data: { activityId, userId, status: "CONFIRMED", partySize },
    });
  });

  return booking;
}

export async function cancelBooking(activityId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { activityId_userId: { activityId, userId } },
    include: { activity: true },
  });

  if (!booking || booking.status !== "CONFIRMED") {
    throw new BookingError("找不到有效預約", "NOT_FOUND", 404);
  }

  if (!canCancelBooking(booking.activity)) {
    throw new BookingError("已超過取消期限", "CANCEL_DEADLINE");
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  return { booking: updated, activity: booking.activity };
}
