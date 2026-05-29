import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BookingError } from "@/lib/booking-service";
import { cancelRentalBooking } from "@/lib/rental-service";
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
    await cancelRentalBooking(slotId, session.user.id);
    const slot = await prisma.rentalSlot.findUnique({ where: { id: slotId } });
    if (slot) {
      await notifyUser(
        session.user.id,
        slot.tenantId,
        "rental_cancel",
        `【PlayPlayPlay】已取消場地租借\n${slot.startAt.toLocaleString("zh-TW")}`,
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "取消失敗" }, { status: 500 });
  }
}
