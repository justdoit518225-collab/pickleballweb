"use server";

import { revalidatePath } from "next/cache";
import { requireTenantStaff } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { combineActivityDateWithTime } from "@/lib/booking-display";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function num(formData: FormData, key: string, fallback = 0): number {
  const v = Number(formData.get(key));
  return Number.isFinite(v) ? v : fallback;
}

function slugifyName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "guest"
  );
}

async function getOrCreateWalkin(name: string) {
  const email = `import-${slugifyName(name)}@import.playplayplay.local`;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data: { email, name } });
}

async function resolveTargetUser(formData: FormData) {
  const memberUserId = str(formData, "memberUserId");
  if (memberUserId) return memberUserId;
  const walkinName = str(formData, "walkinName");
  if (walkinName) {
    const u = await getOrCreateWalkin(walkinName);
    return u.id;
  }
  return null;
}

function revalidate(slug: string, date: string) {
  revalidatePath(`/admin/${slug}/board`);
  revalidatePath(`/t/${slug}/board`);
  revalidatePath(`/t/${slug}`);
  void date;
}

async function ensureWindow(
  activity: { startAt: Date; endAt: Date },
  startTime: string,
  endTime: string,
) {
  let startAt = activity.startAt;
  let endAt = activity.endAt;
  if (startTime && endTime) {
    startAt = combineActivityDateWithTime(activity.startAt, startTime);
    endAt = combineActivityDateWithTime(activity.startAt, endTime);
  }
  if (startAt >= endAt) throw new Error("結束時間需晚於開始時間");
  if (startAt < activity.startAt || endAt > activity.endAt) {
    throw new Error("個人時段需在活動時間內");
  }
  return { startAt, endAt };
}

export async function adminAddBooking(formData: FormData) {
  const slug = str(formData, "tenantSlug");
  const date = str(formData, "date");
  const { tenant } = await requireTenantStaff(slug);
  const activityId = str(formData, "activityId");

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, tenantId: tenant.id },
  });
  if (!activity) throw new Error("找不到活動");

  const userId = await resolveTargetUser(formData);
  if (!userId) throw new Error("請選擇會員或輸入臨打姓名");

  const partySize = Math.max(1, num(formData, "partySize", 1));
  const racketRental = Math.min(partySize, Math.max(0, num(formData, "racketRental", 0)));
  const { startAt, endAt } = await ensureWindow(
    activity,
    str(formData, "startTime"),
    str(formData, "endTime"),
  );

  await prisma.booking.upsert({
    where: { activityId_userId: { activityId, userId } },
    create: {
      activityId,
      userId,
      status: "CONFIRMED",
      partySize,
      startAt,
      endAt,
      racketRental,
    },
    update: {
      status: "CONFIRMED",
      cancelledAt: null,
      partySize,
      startAt,
      endAt,
      racketRental,
    },
  });

  revalidate(slug, date);
}

export async function adminUpdateBooking(formData: FormData) {
  const slug = str(formData, "tenantSlug");
  const date = str(formData, "date");
  const { tenant } = await requireTenantStaff(slug);
  const bookingId = str(formData, "bookingId");

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, activity: { tenantId: tenant.id } },
    include: { activity: true },
  });
  if (!booking) throw new Error("找不到報名");

  const partySize = Math.max(1, num(formData, "partySize", booking.partySize));
  const racketRental = Math.min(
    partySize,
    Math.max(0, num(formData, "racketRental", booking.racketRental)),
  );
  const { startAt, endAt } = await ensureWindow(
    booking.activity,
    str(formData, "startTime"),
    str(formData, "endTime"),
  );

  await prisma.booking.update({
    where: { id: bookingId },
    data: { partySize, racketRental, startAt, endAt, status: "CONFIRMED", cancelledAt: null },
  });

  revalidate(slug, date);
}

export async function adminCancelBooking(formData: FormData) {
  const slug = str(formData, "tenantSlug");
  const date = str(formData, "date");
  const { tenant } = await requireTenantStaff(slug);
  const bookingId = str(formData, "bookingId");

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, activity: { tenantId: tenant.id } },
  });
  if (!booking) throw new Error("找不到報名");

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  revalidate(slug, date);
}

export async function adminMoveBooking(formData: FormData) {
  const slug = str(formData, "tenantSlug");
  const date = str(formData, "date");
  const { tenant } = await requireTenantStaff(slug);
  const bookingId = str(formData, "bookingId");
  const targetActivityId = str(formData, "targetActivityId");

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, activity: { tenantId: tenant.id } },
  });
  if (!booking) throw new Error("找不到報名");
  if (!targetActivityId || targetActivityId === booking.activityId) {
    revalidate(slug, date);
    return;
  }

  const target = await prisma.activity.findFirst({
    where: { id: targetActivityId, tenantId: tenant.id },
  });
  if (!target) throw new Error("找不到目標時段");

  const clash = await prisma.booking.findUnique({
    where: { activityId_userId: { activityId: targetActivityId, userId: booking.userId } },
  });
  if (clash && clash.status === "CONFIRMED") {
    throw new Error("該成員在目標時段已有報名");
  }
  if (clash) {
    await prisma.booking.delete({ where: { id: clash.id } });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      activityId: targetActivityId,
      startAt: target.startAt,
      endAt: target.endAt,
    },
  });

  revalidate(slug, date);
}

export async function adminCancelRental(formData: FormData) {
  const slug = str(formData, "tenantSlug");
  const date = str(formData, "date");
  const { tenant } = await requireTenantStaff(slug);
  const slotId = str(formData, "slotId");

  const slot = await prisma.rentalSlot.findFirst({
    where: { id: slotId, tenantId: tenant.id },
  });
  if (!slot) throw new Error("找不到時段");

  await prisma.$transaction([
    prisma.rentalBooking.updateMany({
      where: { slotId, status: "CONFIRMED" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    }),
    prisma.rentalSlot.update({
      where: { id: slotId },
      data: { status: "OPEN", bookedById: null },
    }),
  ]);

  revalidate(slug, date);
}

export async function adminAssignRental(formData: FormData) {
  const slug = str(formData, "tenantSlug");
  const date = str(formData, "date");
  const { tenant } = await requireTenantStaff(slug);
  const slotId = str(formData, "slotId");

  const slot = await prisma.rentalSlot.findFirst({
    where: { id: slotId, tenantId: tenant.id },
  });
  if (!slot) throw new Error("找不到時段");
  if (slot.status === "BOOKED") throw new Error("此時段已被租借");

  const userId = await resolveTargetUser(formData);
  if (!userId) throw new Error("請選擇會員或輸入承租姓名");
  const racketRental = Math.max(0, num(formData, "racketRental", 0));

  await prisma.$transaction([
    prisma.rentalSlot.update({
      where: { id: slotId },
      data: { status: "BOOKED", bookedById: userId },
    }),
    prisma.rentalBooking.upsert({
      where: { slotId },
      create: { slotId, userId, status: "CONFIRMED", racketRental },
      update: { userId, status: "CONFIRMED", cancelledAt: null, racketRental },
    }),
  ]);

  revalidate(slug, date);
}

export async function adminCreateSlot(formData: FormData) {
  const slug = str(formData, "tenantSlug");
  const date = str(formData, "date");
  const { tenant } = await requireTenantStaff(slug);

  const courtId = str(formData, "courtId");
  const venueId = str(formData, "venueId");
  const kind = str(formData, "kind");
  const startTime = str(formData, "startTime");
  const endTime = str(formData, "endTime");

  if (!courtId || !venueId || !date || !startTime || !endTime) {
    throw new Error("請填寫完整時段資訊");
  }

  const base = new Date(`${date}T12:00:00`);
  const startAt = combineActivityDateWithTime(base, startTime);
  const endAt = combineActivityDateWithTime(base, endTime);
  if (startAt >= endAt) throw new Error("結束時間需晚於開始時間");

  if (kind === "rental") {
    await prisma.rentalSlot.create({
      data: {
        tenantId: tenant.id,
        venueId,
        courtId,
        startAt,
        endAt,
        status: "OPEN",
        cancelHoursBefore: 4,
      },
    });
  } else {
    const capacity = Math.max(1, num(formData, "capacity", 4));
    const title = str(formData, "title") || "球敘";
    await prisma.activity.create({
      data: {
        tenantId: tenant.id,
        venueId,
        courtId,
        type: "OPEN_PLAY",
        status: "PUBLISHED",
        title,
        startAt,
        endAt,
        capacity,
        cancelPolicyType: "HOURS_BEFORE",
        cancelHoursBefore: 4,
      },
    });
  }

  revalidate(slug, date);
}
