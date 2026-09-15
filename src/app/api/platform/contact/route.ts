import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listAdminInboxThreads } from "@/lib/contact";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (session?.user?.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const threads = await listAdminInboxThreads();
  const unread = threads.reduce((sum, t) => sum + t.adminUnread, 0);
  return NextResponse.json({ unread, threads });
}
