import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BookingError } from "@/lib/booking-service";
import { joinWaitlist, leaveWaitlist } from "@/lib/waitlist-service";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };

  try {
    if (body.action === "leave") {
      await leaveWaitlist(id, session.user.id);
      return NextResponse.json({ ok: true });
    }

    const entry = await joinWaitlist(id, session.user.id);
    const activity = await prisma.activity.findUnique({ where: { id } });
    if (activity) {
      await notifyUser(
        session.user.id,
        activity.tenantId,
        "booking_self",
        `【PlayPlayPlay】您已加入「${activity.title}」候補（第 ${entry.position} 位）`,
      );
    }
    return NextResponse.json({ ok: true, position: entry.position });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "候補失敗" }, { status: 500 });
  }
}
