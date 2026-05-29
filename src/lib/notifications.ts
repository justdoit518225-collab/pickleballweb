import { createInboxNotification } from "@/lib/inbox";
import { sendEmail } from "@/lib/email";
import { sendLineMessage } from "@/lib/line";
import { prisma } from "@/lib/prisma";

type NotifyKind =
  | "booking_self"
  | "booking_cancel"
  | "roster_change"
  | "activity_change"
  | "reminder"
  | "rental_booking"
  | "rental_cancel"
  | "waitlist_promoted";

const kindToField: Record<
  NotifyKind,
  keyof {
    notifyBookingSelf: boolean;
    notifyBookingCancel: boolean;
    notifyRosterChange: boolean;
    notifyActivityChange: boolean;
    notifyReminder: boolean;
    notifyRentalBooking: boolean;
  }
> = {
  booking_self: "notifyBookingSelf",
  booking_cancel: "notifyBookingCancel",
  roster_change: "notifyRosterChange",
  activity_change: "notifyActivityChange",
  reminder: "notifyReminder",
  rental_booking: "notifyRentalBooking",
  rental_cancel: "notifyRentalBooking",
  waitlist_promoted: "notifyBookingSelf",
};

export async function notifyUser(
  userId: string,
  tenantId: string,
  kind: NotifyKind,
  message: string,
) {
  await createInboxNotification(userId, "PlayPlayPlay", message, tenantId);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.email) {
    await sendEmail(user.email, "PlayPlayPlay 通知", message);
  }

  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });

  if (!pref?.masterEnabled) return;
  const field = kindToField[kind];
  if (field && !pref[field]) return;

  if (pref.lineLinked && pref.lineUserId) {
    await sendLineMessage(pref.lineUserId, message);
  }
}

export async function linkLineFromProvider(userId: string, lineUserId: string) {
  const memberships = await prisma.tenantMembership.findMany({
    where: { userId },
    select: { tenantId: true },
  });

  const tenantIds =
    memberships.length > 0
      ? memberships.map((m) => m.tenantId)
      : (
          await prisma.tenant.findMany({ where: { isActive: true }, select: { id: true } })
        ).map((t) => t.id);

  for (const tenantId of tenantIds) {
    await prisma.notificationPreference.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      create: {
        userId,
        tenantId,
        lineLinked: true,
        lineUserId,
      },
      update: { lineLinked: true, lineUserId },
    });
  }
}
