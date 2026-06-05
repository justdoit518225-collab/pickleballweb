import { sumPartySize } from "@/lib/activity-capacity";
import {
  buildBookingListMeta,
  formatPartyHeadLabel,
} from "@/lib/booking-display";
import { resolveMemberDisplay } from "@/lib/member-display";
import { prisma } from "@/lib/prisma";
import { dayBounds } from "@/lib/day-board";
import { toTimeInputValue } from "@/lib/booking-display";
import {
  overlapsHourInTaipei,
  slotStartsInTaipeiHour,
} from "@/lib/venue-timezone";

/** 樂活板橋營業時段：09:00–24:00（含 9，不含 24 → 最後一格為 23:00–24:00） */
export const LOHO_BOARD_HOUR_START = 9;
export const LOHO_BOARD_HOUR_END = 24;

export type HourlyCellKind = "empty" | "drop-in" | "rental" | "dual" | "course" | "dupr";

export type HourlyDropInEntry = {
  displayName: string;
  partySize: number;
  meta: string | null;
};

export type HourlyDropIn = {
  activityId: string;
  label: string;
  detail: string | null;
  entries: HourlyDropInEntry[];
  startAt: string;
  endAt: string;
  capacity: number;
  headCount: number;
  isFull: boolean;
  requiresDupr: boolean;
  hasJoined: boolean;
  joinedPartySize: number;
  /** 一般會員可否在格子上報名（課程／DUPR 專場為 false） */
  bookable: boolean;
};

export type HourlyRental = {
  slotId: string;
  label: string;
  detail: string | null;
  startAt: string;
  endAt: string;
  rentalOpen: boolean;
  isMineRental: boolean;
  isBooked: boolean;
};

export type HourlyCell = {
  hour: number;
  kind: HourlyCellKind;
  dropIn: HourlyDropIn | null;
  rental: HourlyRental | null;
};

export type HourlyCourtColumn = {
  courtId: string;
  courtName: string;
  venueId: string;
  cells: HourlyCell[];
};

export type AdminHourlyBooking = {
  bookingId: string;
  userId: string;
  displayName: string;
  partySize: number;
  racketRental: number;
  startTime: string;
  endTime: string;
};

export type AdminHourlyDropIn = HourlyDropIn & {
  bookings: AdminHourlyBooking[];
};

export type AdminHourlyCell = {
  hour: number;
  kind: HourlyCellKind;
  dropIn: AdminHourlyDropIn | null;
  rental: HourlyRental | null;
};

export type AdminHourlyCourtColumn = {
  courtId: string;
  courtName: string;
  venueId: string;
  cells: AdminHourlyCell[];
};

export type AdminMemberOption = { userId: string; name: string };
export type AdminMoveTarget = { activityId: string; label: string };

type ActivityRow = Awaited<
  ReturnType<typeof fetchBoardActivities>
>[number];
type RentalRow = Awaited<ReturnType<typeof fetchBoardRentals>>[number];

function pickRentalForCell(
  rentals: RentalRow[],
  courtId: string,
  day: Date,
  hour: number,
): RentalRow | undefined {
  const exact = rentals.find(
    (r) => r.courtId === courtId && slotStartsInTaipeiHour(r.startAt, day, hour),
  );
  if (exact) return exact;
  return rentals.find(
    (r) => r.courtId === courtId && overlapsHourInTaipei(r.startAt, r.endAt, day, hour),
  );
}

/** A 場 → B 場 → C 場 */
export function sortLohoCourts<T extends { name: string; sortOrder: number }>(
  courts: T[],
): T[] {
  const rank = (name: string) => {
    if (/A/.test(name)) return 0;
    if (/B/.test(name)) return 1;
    if (/C/.test(name)) return 2;
    return name.charCodeAt(0);
  };
  return [...courts].sort((a, b) => rank(a.name) - rank(b.name) || a.sortOrder - b.sortOrder);
}

export function hourlyLabels(): { hour: number; label: string }[] {
  const out: { hour: number; label: string }[] = [];
  for (let h = LOHO_BOARD_HOUR_START; h < LOHO_BOARD_HOUR_END; h++) {
    out.push({
      hour: h,
      label: `${String(h).padStart(2, "0")}:00`,
    });
  }
  return out;
}

async function fetchBoardActivities(tenantId: string, dayStart: Date, dayEnd: Date) {
  return prisma.activity.findMany({
    where: {
      tenantId,
      status: "PUBLISHED",
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
    include: {
      court: true,
      bookings: {
        where: { status: "CONFIRMED" },
        include: { user: true },
      },
    },
    orderBy: { startAt: "asc" },
  });
}

async function fetchBoardRentals(tenantId: string, dayStart: Date, dayEnd: Date) {
  return prisma.rentalSlot.findMany({
    where: {
      tenantId,
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
      status: { in: ["OPEN", "BOOKED"] },
    },
    include: {
      bookedBy: { select: { id: true, name: true, image: true } },
      rentalBooking: { where: { status: "CONFIRMED" } },
    },
  });
}

function buildDropIn(
  act: ActivityRow,
  membershipMap: Map<string, { userId: string; nickname: string | null; avatarUrl: string | null }>,
  viewerId?: string,
): HourlyDropIn {
  const headCount = sumPartySize(act.bookings);
  const myBooking = viewerId
    ? act.bookings.find((b) => b.userId === viewerId)
    : undefined;
  const isCourse = act.type === "COURSE";
  const isDupr = act.requiresDupr;
  const bookable = act.type === "OPEN_PLAY" && !isDupr;
  const names = act.bookings
    .slice(0, 2)
    .map((b) => resolveMemberDisplay(b.user, membershipMap.get(b.userId)).displayName)
    .join("、");

  const entries: HourlyDropInEntry[] = act.bookings.map((b) => {
    const d = resolveMemberDisplay(b.user, membershipMap.get(b.userId));
    return {
      displayName: formatPartyHeadLabel(b.partySize, d.displayName),
      partySize: b.partySize,
      meta: buildBookingListMeta({
        startAt: b.startAt ?? act.startAt,
        endAt: b.endAt ?? act.endAt,
        racketRental: b.racketRental,
      }),
    };
  });

  return {
    activityId: act.id,
    label: act.title.replace(/^\[匯入\]\s*/, ""),
    detail: bookable
      ? `${headCount}/${act.capacity} 人${names ? ` · ${names}` : ""}`
      : null,
    entries,
    startAt: act.startAt.toISOString(),
    endAt: act.endAt.toISOString(),
    capacity: act.capacity,
    headCount,
    isFull: headCount >= act.capacity,
    requiresDupr: isDupr,
    hasJoined: Boolean(myBooking),
    joinedPartySize: myBooking?.partySize ?? 0,
    bookable,
  };
}

function buildRental(
  rental: RentalRow,
  membershipMap: Map<string, { userId: string; nickname: string | null; avatarUrl: string | null }>,
  viewerId?: string,
): HourlyRental {
  const renter =
    rental.status === "BOOKED" && rental.bookedBy
      ? resolveMemberDisplay(rental.bookedBy, membershipMap.get(rental.bookedBy.id))
          .displayName
      : null;
  const isBooked = rental.status === "BOOKED";

  return {
    slotId: rental.id,
    label: isBooked ? (renter ?? "已租") : "可租",
    detail: !isBooked ? "可租場" : null,
    startAt: rental.startAt.toISOString(),
    endAt: rental.endAt.toISOString(),
    rentalOpen: !isBooked,
    isMineRental: Boolean(viewerId && rental.bookedById === viewerId && isBooked),
    isBooked,
  };
}

function resolveKind(
  dropIn: HourlyDropIn | null,
  rental: HourlyRental | null,
): HourlyCellKind {
  if (!dropIn && !rental) return "empty";
  if (dropIn && !dropIn.bookable) {
    return dropIn.requiresDupr ? "dupr" : "course";
  }
  if (dropIn?.bookable && rental) return "dual";
  if (dropIn?.bookable) return "drop-in";
  if (rental) return "rental";
  return "empty";
}

function buildCell(
  hour: number,
  act: ActivityRow | undefined,
  rental: RentalRow | undefined,
  membershipMap: Map<string, { userId: string; nickname: string | null; avatarUrl: string | null }>,
  viewerId?: string,
  forUser = true,
): HourlyCell {
  const dropIn = act ? buildDropIn(act, membershipMap, viewerId) : null;
  const rentalInfo = rental ? buildRental(rental, membershipMap, viewerId) : null;
  const kind = resolveKind(dropIn, rentalInfo);

  const hideRentalOnCourse =
    forUser && dropIn && !dropIn.bookable;

  return {
    hour,
    kind,
    dropIn,
    rental: hideRentalOnCourse ? null : rentalInfo,
  };
}

async function loadBoardContext(tenantId: string, day: Date) {
  const { start: dayStart, end: dayEnd } = dayBounds(day);
  const [activities, rentals, courts, memberships] = await Promise.all([
    fetchBoardActivities(tenantId, dayStart, dayEnd),
    fetchBoardRentals(tenantId, dayStart, dayEnd),
    prisma.court.findMany({
      where: { venue: { tenantId, isActive: true }, isActive: true },
      include: { venue: true },
    }),
    prisma.tenantMembership.findMany({
      where: { tenantId },
      select: {
        userId: true,
        nickname: true,
        avatarUrl: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  const membershipMap = new Map(memberships.map((m) => [m.userId, m]));
  const sortedCourts = sortLohoCourts(courts);
  const hours = hourlyLabels();

  return { dayStart, activities, rentals, sortedCourts, hours, membershipMap, memberships };
}

export async function getHourlyBoard(tenantId: string, day: Date, viewerId?: string) {
  const ctx = await loadBoardContext(tenantId, day);

  const columns: HourlyCourtColumn[] = ctx.sortedCourts.map((court) => ({
    courtId: court.id,
    courtName: court.name,
    venueId: court.venueId,
    cells: ctx.hours.map(({ hour }) => {
      const act = ctx.activities.find(
        (a) =>
          a.courtId === court.id &&
          overlapsHourInTaipei(a.startAt, a.endAt, day, hour),
      );
      const rental = pickRentalForCell(ctx.rentals, court.id, day, hour);
      return buildCell(hour, act, rental, ctx.membershipMap, viewerId, true);
    }),
  }));

  const dateLabel = ctx.dayStart.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return { columns, hours: ctx.hours, dateLabel };
}

export async function getAdminHourlyBoard(tenantId: string, day: Date) {
  const ctx = await loadBoardContext(tenantId, day);

  const moveTargets: AdminMoveTarget[] = [];
  for (const act of ctx.activities) {
    if (act.type !== "OPEN_PLAY" || !act.courtId) continue;
    const w = `${toTimeInputValue(act.startAt)}-${toTimeInputValue(act.endAt)}`;
    moveTargets.push({
      activityId: act.id,
      label: `${act.court?.name ?? ""} ${w} ${act.title}`.trim(),
    });
  }

  const members: AdminMemberOption[] = ctx.memberships
    .map((m) => ({
      userId: m.userId,
      name: m.nickname ?? m.user.name ?? "會員",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));

  const columns: AdminHourlyCourtColumn[] = ctx.sortedCourts.map((court) => ({
    courtId: court.id,
    courtName: court.name,
    venueId: court.venueId,
    cells: ctx.hours.map(({ hour }) => {
      const act = ctx.activities.find(
        (a) =>
          a.courtId === court.id &&
          overlapsHourInTaipei(a.startAt, a.endAt, day, hour),
      );
      const rental = pickRentalForCell(ctx.rentals, court.id, day, hour);
      const base = buildCell(hour, act, rental, ctx.membershipMap, undefined, false);

      let dropIn: AdminHourlyDropIn | null = null;
      if (base.dropIn && act) {
        const bookings: AdminHourlyBooking[] = act.bookings.map((b) => {
          const d = resolveMemberDisplay(b.user, ctx.membershipMap.get(b.userId));
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
        dropIn = { ...base.dropIn, bookings };
      }

      return {
        hour: base.hour,
        kind: base.kind,
        dropIn,
        rental: base.rental,
      };
    }),
  }));

  const dateLabel = ctx.dayStart.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return { columns, hours: ctx.hours, dateLabel, members, moveTargets };
}
