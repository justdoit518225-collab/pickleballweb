import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

/** 已確認報名佔用的總人數 */
export async function getConfirmedHeadCount(
  activityId: string,
  db: Db = prisma,
  excludeUserId?: string,
): Promise<number> {
  const result = await db.booking.aggregate({
    where: {
      activityId,
      status: "CONFIRMED",
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    _sum: { partySize: true },
  });
  return result._sum.partySize ?? 0;
}

export function sumPartySize(
  bookings: { partySize: number }[],
): number {
  return bookings.reduce((n, b) => n + b.partySize, 0);
}

/** 球敘單次報名人數上限 */
export const MAX_PARTY_SIZE_PER_BOOKING = 12;

export function maxSelectablePartySize(
  capacity: number,
  confirmedHeads: number,
  excludeUserIdHeads = 0,
): number {
  const remaining = capacity - confirmedHeads + excludeUserIdHeads;
  if (remaining <= 0) return 1;
  return Math.min(MAX_PARTY_SIZE_PER_BOOKING, remaining);
}
