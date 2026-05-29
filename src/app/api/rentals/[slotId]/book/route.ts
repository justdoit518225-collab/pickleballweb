import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BookingError } from "@/lib/booking-service";
import { bookRentalSlot } from "@/lib/rental-service";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slotId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { slotId } = await params;

  try {
    await bookRentalSlot(slotId, session.user.id);
    const slot = await prisma.rentalSlot.findUnique({
      where: { id: slotId },
      include: { court: true, venue: true },
    });
    if (slot) {
      await notifyUser(
        session.user.id,
        slot.tenantId,
        "rental_booking",
        `【PlayPlayPlay】場地租借成功\n${slot.venue.name} ${slot.court.name}\n${slot.startAt.toLocaleString("zh-TW")}`,
      );
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
