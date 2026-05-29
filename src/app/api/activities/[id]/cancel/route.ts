import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelBooking, BookingError } from "@/lib/booking-service";
import { notifyUser } from "@/lib/notifications";
import { promoteWaitlist } from "@/lib/waitlist-service";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { activity } = await cancelBooking(id, session.user.id);
    await notifyUser(
      session.user.id,
      activity.tenantId,
      "booking_cancel",
      `【PlayPlayPlay】您已取消「${activity.title}」的預約`,
    );

    const promoted = await promoteWaitlist(id);
    if (promoted) {
      await notifyUser(
        promoted.userId,
        activity.tenantId,
        "waitlist_promoted",
        `【PlayPlayPlay】候補成功！您已加入「${activity.title}」`,
      );
    }

    const others = await prisma.booking.findMany({
      where: { activityId: id, status: "CONFIRMED" },
      select: { userId: true },
    });
    for (const o of others) {
      await notifyUser(
        o.userId,
        activity.tenantId,
        "roster_change",
        `【PlayPlayPlay】「${activity.title}」有名單變動（有人取消）`,
      );
    }

    return NextResponse.json({ ok: true, promoted: Boolean(promoted) });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "取消失敗" }, { status: 500 });
  }
}
