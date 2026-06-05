import { ensureTenantMembership } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { BookingError } from "@/lib/booking-service";

export function canCancelRental(
  slot: { startAt: Date; cancelHoursBefore: number },
  now = new Date(),
) {
  const deadline = new Date(
    slot.startAt.getTime() - slot.cancelHoursBefore * 60 * 60 * 1000,
  );
  return now < deadline;
}

export async function bookRentalSlot(
  slotId: string,
  userId: string,
  options?: { racketRental?: number },
) {
  const racketRental = options?.racketRental ?? 0;
  if (!Number.isInteger(racketRental) || racketRental < 0) {
    throw new BookingError("球拍數量無效", "INVALID_RACKET");
  }
  const slot = await prisma.rentalSlot.findUnique({
    where: { id: slotId },
    include: { rentalBooking: true },
  });

  if (!slot || slot.status !== "OPEN") {
    throw new BookingError("時段不可預約", "NOT_AVAILABLE", 404);
  }

  if (slot.startAt <= new Date()) {
    throw new BookingError("時段已過期", "EXPIRED");
  }

  if (slot.rentalBooking?.status === "CONFIRMED") {
    throw new BookingError("此時段已被預約", "BOOKED");
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: slot.tenantId, userId } },
  });
  if (membership?.isBanned) {
    throw new BookingError("您的帳號在此場館已被停權", "BANNED", 403);
  }

  await ensureTenantMembership(slot.tenantId, userId);

  return prisma.$transaction(async (tx) => {
    const fresh = await tx.rentalSlot.findUnique({ where: { id: slotId } });
    if (!fresh || fresh.status !== "OPEN") {
      throw new BookingError("時段已被他人預約", "BOOKED");
    }

    await tx.rentalSlot.update({
      where: { id: slotId },
      data: { status: "BOOKED", bookedById: userId },
    });

    const existing = await tx.rentalBooking.findUnique({ where: { slotId } });
    if (existing) {
      return tx.rentalBooking.update({
        where: { id: existing.id },
        data: { status: "CONFIRMED", cancelledAt: null, userId, racketRental },
      });
    }

    return tx.rentalBooking.create({
      data: { slotId, userId, status: "CONFIRMED", racketRental },
    });
  });
}

/** 連續預約多個 OPEN 租場時段（同一球場、時間相鄰） */
export async function bookRentalSlotRange(
  slotIds: string[],
  userId: string,
  options?: { racketRental?: number },
) {
  if (!slotIds.length) {
    throw new BookingError("請選擇時段", "INVALID_RANGE");
  }

  const racketRental = options?.racketRental ?? 0;
  if (!Number.isInteger(racketRental) || racketRental < 0) {
    throw new BookingError("球拍數量無效", "INVALID_RACKET");
  }

  const slots = await prisma.rentalSlot.findMany({
    where: { id: { in: slotIds } },
    include: { rentalBooking: true },
    orderBy: { startAt: "asc" },
  });

  if (slots.length !== slotIds.length) {
    throw new BookingError("部分時段不存在", "NOT_FOUND", 404);
  }

  const courtId = slots[0].courtId;
  const tenantId = slots[0].tenantId;

  for (const slot of slots) {
    if (slot.courtId !== courtId) {
      throw new BookingError("請選擇同一球場的連續時段", "INVALID_RANGE");
    }
    if (slot.status !== "OPEN") {
      throw new BookingError("所選時段中有不可預約的格子", "NOT_AVAILABLE");
    }
    if (slot.startAt <= new Date()) {
      throw new BookingError("所選時段已過期", "EXPIRED");
    }
    if (slot.rentalBooking?.status === "CONFIRMED") {
      throw new BookingError("所選時段已被預約", "BOOKED");
    }
  }

  for (let i = 1; i < slots.length; i++) {
    if (slots[i].startAt.getTime() !== slots[i - 1].endAt.getTime()) {
      throw new BookingError("請選擇連續的時段", "INVALID_RANGE");
    }
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (membership?.isBanned) {
    throw new BookingError("您的帳號在此場館已被停權", "BANNED", 403);
  }

  await ensureTenantMembership(tenantId, userId);

  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const slot of slots) {
      const fresh = await tx.rentalSlot.findUnique({ where: { id: slot.id } });
      if (!fresh || fresh.status !== "OPEN") {
        throw new BookingError("時段已被他人預約", "BOOKED");
      }
      await tx.rentalSlot.update({
        where: { id: slot.id },
        data: { status: "BOOKED", bookedById: userId },
      });
      const existing = await tx.rentalBooking.findUnique({ where: { slotId: slot.id } });
      if (existing) {
        results.push(
          await tx.rentalBooking.update({
            where: { id: existing.id },
            data: { status: "CONFIRMED", cancelledAt: null, userId, racketRental },
          }),
        );
      } else {
        results.push(
          await tx.rentalBooking.create({
            data: { slotId: slot.id, userId, status: "CONFIRMED", racketRental },
          }),
        );
      }
    }
    return results;
  });
}

export async function cancelRentalBooking(slotId: string, userId: string) {
  const slot = await prisma.rentalSlot.findUnique({
    where: { id: slotId },
    include: { rentalBooking: true },
  });

  if (!slot?.rentalBooking || slot.rentalBooking.userId !== userId) {
    throw new BookingError("找不到您的租借預約", "NOT_FOUND", 404);
  }

  if (slot.rentalBooking.status !== "CONFIRMED") {
    throw new BookingError("預約已取消", "ALREADY_CANCELLED");
  }

  if (!canCancelRental(slot)) {
    throw new BookingError("已超過取消期限", "CANCEL_DEADLINE");
  }

  return prisma.$transaction(async (tx) => {
    await tx.rentalBooking.update({
      where: { id: slot.rentalBooking!.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    return tx.rentalSlot.update({
      where: { id: slotId },
      data: { status: "OPEN", bookedById: null },
    });
  });
}

/** 前台場地租借日曆與入口可見的未來天數 */
export const TENANT_RENTAL_LOOKAHEAD_DAYS = 30;

export function getTenantRentalWindow(from = new Date()) {
  const to = new Date(from);
  to.setDate(to.getDate() + TENANT_RENTAL_LOOKAHEAD_DAYS);
  return { from, to };
}

/** 租戶是否有管理員已建立的未來租借時段（前台才可進入） */
export async function countTenantUpcomingRentals(tenantId: string) {
  const { from, to } = getTenantRentalWindow();
  return prisma.rentalSlot.count({
    where: {
      tenantId,
      startAt: { gte: from, lt: to },
      status: { in: ["OPEN", "BOOKED"] },
    },
  });
}

export async function getRentalCalendar(tenantId: string, from: Date, to: Date) {
  return prisma.rentalSlot.findMany({
    where: {
      tenantId,
      startAt: { gte: from, lt: to },
    },
    include: {
      court: true,
      venue: true,
      bookedBy: { select: { id: true, name: true } },
      rentalBooking: { where: { status: "CONFIRMED" } },
    },
    orderBy: [{ courtId: "asc" }, { startAt: "asc" }],
  });
}
