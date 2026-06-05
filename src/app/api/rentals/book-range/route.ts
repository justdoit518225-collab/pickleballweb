import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BookingError } from "@/lib/booking-service";
import { bookRentalSlotRange } from "@/lib/rental-service";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  let slotIds: string[] = [];
  let racketRental: number | undefined;
  try {
    const body = (await request.json()) as { slotIds?: string[]; racketRental?: number };
    slotIds = Array.isArray(body.slotIds) ? body.slotIds.filter(Boolean) : [];
    if (body.racketRental != null) racketRental = Number(body.racketRental);
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  try {
    await bookRentalSlotRange(slotIds, session.user.id, { racketRental });
    const first = await prisma.rentalSlot.findUnique({
      where: { id: slotIds[0] },
      include: { court: true, venue: true },
    });
    const last = await prisma.rentalSlot.findUnique({
      where: { id: slotIds[slotIds.length - 1] },
    });
    if (first && last) {
      const fmt = (d: Date) =>
        d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
      await notifyUser(
        session.user.id,
        first.tenantId,
        "rental_booking",
        `【PlayPlayPlay】場地租借成功\n${first.venue.name} ${first.court.name}\n${fmt(first.startAt)}-${fmt(last.endAt)}（${slotIds.length} 小時）`,
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
