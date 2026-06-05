import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { bookActivityRange, BookingError } from "@/lib/booking-service";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  let activityIds: string[] = [];
  let partySize: number | undefined;
  let racketRental: number | undefined;
  try {
    const body = (await request.json()) as {
      activityIds?: string[];
      partySize?: number;
      racketRental?: number;
    };
    activityIds = Array.isArray(body.activityIds) ? body.activityIds.filter(Boolean) : [];
    if (body.partySize != null) partySize = Number(body.partySize);
    if (body.racketRental != null) racketRental = Number(body.racketRental);
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  try {
    await bookActivityRange(activityIds, session.user.id, { partySize, racketRental });
    const activities = await prisma.activity.findMany({
      where: { id: { in: activityIds } },
      orderBy: { startAt: "asc" },
      include: { court: true },
    });
    if (activities.length > 0) {
      const first = activities[0];
      const last = activities[activities.length - 1];
      const fmt = (d: Date) =>
        d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
      const headNote = partySize && partySize > 1 ? `（${partySize} 人）` : "";
      await notifyUser(
        session.user.id,
        first.tenantId,
        "booking_self",
        `【PlayPlayPlay】您已報名臨打${headNote}\n${first.court?.name ?? ""} ${fmt(first.startAt)}-${fmt(last.endAt)}（${activityIds.length} 小時）`,
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
