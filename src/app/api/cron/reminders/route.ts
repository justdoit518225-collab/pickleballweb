import { NextResponse } from "next/server";
import { sendActivityReminders } from "@/lib/reminders";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendActivityReminders();
  return NextResponse.json({ ok: true, ...result });
}
