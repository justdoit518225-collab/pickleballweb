import {
  buildBookingListMeta,
  formatPartyHeadLabel,
  formatRacketLabel,
} from "@/lib/booking-display";
import { resolveMemberDisplay } from "@/lib/member-display";
import { prisma } from "@/lib/prisma";

export function dayBounds(day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export type BoardDropInEntry = {
  index: number;
  displayName: string;
  meta: string | null;
};

export type BoardDropInBlock = {
  kind: "drop-in";
  id: string;
  title: string;
  windowLabel: string;
  capacity: number;
  headCount: number;
  entries: BoardDropInEntry[];
  activityHref: string;
  startAt: string;
  endAt: string;
  isFull: boolean;
  requiresDupr: boolean;
  hasJoined: boolean;
  joinedPartySize: number;
};

export type BoardRentalBlock = {
  kind: "rental";
  id: string;
  windowLabel: string;
  renterName: string | null;
  racketLabel: string | null;
  status: "OPEN" | "BOOKED";
  startAt: string;
  endAt: string;
  isMine: boolean;
};

export type BoardCourtSection = {
  courtId: string;
  courtName: string;
  venueName: string;
  blocks: (BoardDropInBlock | BoardRentalBlock)[];
};

export async function getDayBoard(
  tenantId: string,
  tenantSlug: string,
  day: Date,
  viewerId?: string,
): Promise<{ courts: BoardCourtSection[]; dateLabel: string }> {
  const { start: dayStart, end: dayEnd } = dayBounds(day);

  const [activities, rentals, courts, memberships] = await Promise.all([
    prisma.activity.findMany({
      where: {
        tenantId,
        status: "PUBLISHED",
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
      select: { userId: true, nickname: true, avatarUrl: true },
    }),
  ]);

  const membershipMap = new Map(memberships.map((m) => [m.userId, m]));

  const courtMap = new Map<string, BoardCourtSection>();
  for (const court of courts) {
    courtMap.set(court.id, {
      courtId: court.id,
      courtName: court.name,
      venueName: court.venue.name,
      blocks: [],
    });
  }

  const fmtWindow = (start: Date, end: Date) => {
    const t = (d: Date) =>
      d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${t(start)}-${t(end)}`;
  };

  for (const act of activities) {
    const courtId = act.courtId;
    if (!courtId || !courtMap.has(courtId)) continue;

    const headCount = act.bookings.reduce((n, b) => n + b.partySize, 0);
    const entries: BoardDropInEntry[] = act.bookings.map((b, i) => {
      const d = resolveMemberDisplay(b.user, membershipMap.get(b.userId));
      return {
        index: i + 1,
        displayName: formatPartyHeadLabel(b.partySize, d.displayName),
        meta: buildBookingListMeta(b),
      };
    });

    const myBooking = viewerId
      ? act.bookings.find((b) => b.userId === viewerId)
      : undefined;

    courtMap.get(courtId)!.blocks.push({
      kind: "drop-in",
      id: act.id,
      title: act.title,
      windowLabel: fmtWindow(act.startAt, act.endAt),
      capacity: act.capacity,
      headCount,
      entries,
      activityHref: `/t/${tenantSlug}/activities/${act.id}`,
      startAt: act.startAt.toISOString(),
      endAt: act.endAt.toISOString(),
      isFull: headCount >= act.capacity,
      requiresDupr: act.requiresDupr,
      hasJoined: Boolean(myBooking),
      joinedPartySize: myBooking?.partySize ?? 0,
    });
  }

  for (const slot of rentals) {
    if (!courtMap.has(slot.courtId)) {
      courtMap.set(slot.courtId, {
        courtId: slot.courtId,
        courtName: slot.court.name,
        venueName: slot.venue.name,
        blocks: [],
      });
    }

    const booking = slot.rentalBooking;
    const renter =
      slot.status === "BOOKED" && slot.bookedBy
        ? resolveMemberDisplay(slot.bookedBy, membershipMap.get(slot.bookedBy.id)).displayName
        : null;

    courtMap.get(slot.courtId)!.blocks.push({
      kind: "rental",
      id: slot.id,
      windowLabel: fmtWindow(slot.startAt, slot.endAt),
      renterName: renter,
      racketLabel: booking ? formatRacketLabel(booking.racketRental) : null,
      status: slot.status === "BOOKED" ? "BOOKED" : "OPEN",
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      isMine: Boolean(
        viewerId && slot.status === "BOOKED" && slot.bookedById === viewerId,
      ),
    });
  }

  for (const section of courtMap.values()) {
    section.blocks.sort((a, b) => {
      const labelA = a.kind === "drop-in" ? a.windowLabel : a.windowLabel;
      const labelB = b.kind === "drop-in" ? b.windowLabel : b.windowLabel;
      return labelA.localeCompare(labelB, "zh-TW");
    });
  }

  const dateLabel = dayStart.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return {
    courts: courts.map((c) => courtMap.get(c.id)!),
    dateLabel,
  };
}
