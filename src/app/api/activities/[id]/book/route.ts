import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { bookActivity, BookingError } from "@/lib/booking-service";
import { notifyUser } from "@/lib/notifications";
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

  let partySize: number | undefined;
  try {
    const body = (await _request.json()) as { partySize?: number };
    if (body.partySize != null) partySize = Number(body.partySize);
  } catch {
    partySize = undefined;
  }

  try {
    const booking = await bookActivity(id, session.user.id, { partySize });
    const activity = await prisma.activity.findUnique({ where: { id } });
    if (activity) {
      const headNote =
        booking.partySize > 1 ? `（${booking.partySize} 人）` : "";
      await notifyUser(
        session.user.id,
        activity.tenantId,
        "booking_self",
        `【PlayPlayPlay】您已報名「${activity.title}」${headNote}\n${activity.startAt.toLocaleString("zh-TW")}`,
      );
      const others = await prisma.booking.findMany({
        where: { activityId: id, status: "CONFIRMED", userId: { not: session.user.id } },
        select: { userId: true },
      });
      for (const o of others) {
        await notifyUser(
          o.userId,
          activity.tenantId,
          "roster_change",
          `【PlayPlayPlay】「${activity.title}」有新成員報名`,
        );
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "預約失敗" }, { status: 500 });
  }
}
