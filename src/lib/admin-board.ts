import { resolveMemberDisplay } from "@/lib/member-display";
import { toTimeInputValue } from "@/lib/booking-display";
import { prisma } from "@/lib/prisma";
import { dayBounds } from "@/lib/day-board";

export type AdminBookingEntry = {
  bookingId: string;
  userId: string;
  displayName: string;
  partySize: number;
  racketRental: number;
  startTime: string;
  endTime: string;
};

export type AdminDropIn = {
  kind: "drop-in";
  activityId: string;
  title: string;
  windowLabel: string;
  startTime: string;
  endTime: string;
  capacity: number;
  headCount: number;
  bookings: AdminBookingEntry[];
};

export type AdminRental = {
  kind: "rental";
  slotId: string;
  windowLabel: string;
  status: "OPEN" | "BOOKED";
  renterName: string | null;
  renterUserId: string | null;
  racketRental: number;
};

export type AdminCourtSection = {
  courtId: string;
  courtName: string;
  venueName: string;
  venueId: string;
  blocks: (AdminDropIn | AdminRental)[];
};

export type MoveTarget = { activityId: string; label: string };
export type MemberOption = { userId: string; name: string };

export async function getAdminDayBoard(tenantId: string, day: Date) {
  const { start: dayStart, end: dayEnd } = dayBounds(day);

  const [activities, rentals, courts, memberships] = await Promise.all([
    prisma.activity.findMany({
      where: {
        tenantId,
        type: "OPEN_PLAY",
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      include: {
        court: true,
        venue: true,
        bookings: {
          where: { status: "CONFIRMED" },
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.rentalSlot.findMany({
      where: {
        tenantId,
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
        status: { in: ["OPEN", "BOOKED"] },
      },
      include: {
        court: true,
        venue: true,
        bookedBy: { select: { id: true, name: true, image: true } },
        rentalBooking: { where: { status: "CONFIRMED" } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.court.findMany({
      where: { venue: { tenantId, isActive: true }, isActive: true },
      include: { venue: true },
      orderBy: [{ venue: { name: "asc" } }, { sortOrder: "asc" }],
    }),
    prisma.tenantMembership.findMany({
      where: { tenantId },
      select: { userId: true, nickname: true, avatarUrl: true, user: true },
    }),
  ]);

  const membershipMap = new Map(memberships.map((m) => [m.userId, m]));

  const fmtWindow = (start: Date, end: Date) =>
    `${toTimeInputValue(start)}-${toTimeInputValue(end)}`;

  const courtMap = new Map<string, AdminCourtSection>();
  for (const c of courts) {
    courtMap.set(c.id, {
      courtId: c.id,
      courtName: c.name,
      venueName: c.venue.name,
      venueId: c.venueId,
      blocks: [],
    });
  }

  const moveTargets: MoveTarget[] = [];

  for (const act of activities) {
    if (!act.courtId || !courtMap.has(act.courtId)) continue;
    const headCount = act.bookings.reduce((n, b) => n + b.partySize, 0);
    const bookings: AdminBookingEntry[] = act.bookings.map((b) => {
      const d = resolveMemberDisplay(b.user, membershipMap.get(b.userId));
      return {
        bookingId: b.id,
        userId: b.userId,
        displayName: d.displayName,
        partySize: b.partySize,
        racketRental: b.racketRental,
        startTime: toTimeInputValue(b.startAt ?? act.startAt),
        endTime: toTimeInputValue(b.endAt ?? act.endAt),
      };
    });

    courtMap.get(act.courtId)!.blocks.push({
      kind: "drop-in",
      activityId: act.id,
      title: act.title,
      windowLabel: fmtWindow(act.startAt, act.endAt),
      startTime: toTimeInputValue(act.startAt),
      endTime: toTimeInputValue(act.endAt),
      capacity: act.capacity,
      headCount,
      bookings,
    });

    moveTargets.push({
      activityId: act.id,
      label: `${act.court?.name ?? ""} ${fmtWindow(act.startAt, act.endAt)} ${act.title}`.trim(),
    });
  }

  for (const slot of rentals) {
    if (!courtMap.has(slot.courtId)) continue;
    const renter =
      slot.status === "BOOKED" && slot.bookedBy
        ? resolveMemberDisplay(slot.bookedBy, membershipMap.get(slot.bookedBy.id))
            .displayName
        : null;
    courtMap.get(slot.courtId)!.blocks.push({
      kind: "rental",
      slotId: slot.id,
      windowLabel: fmtWindow(slot.startAt, slot.endAt),
      status: slot.status === "BOOKED" ? "BOOKED" : "OPEN",
      renterName: renter,
      renterUserId: slot.bookedById,
      racketRental: slot.rentalBooking?.racketRental ?? 0,
    });
  }

  for (const section of courtMap.values()) {
    section.blocks.sort((a, b) =>
      a.windowLabel.localeCompare(b.windowLabel, "zh-TW"),
    );
  }

  const members: MemberOption[] = memberships
    .map((m) => ({
      userId: m.userId,
      name: m.nickname ?? m.user.name ?? "會員",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));

  const dateLabel = dayStart.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return {
    courts: courts.map((c) => courtMap.get(c.id)!),
    moveTargets,
    members,
    dateLabel,
  };
}
