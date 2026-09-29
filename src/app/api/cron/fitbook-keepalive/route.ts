import { NextResponse } from "next/server";
import { keepAliveFitbookSessions } from "@/lib/fitbook-session";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await keepAliveFitbookSessions();
  return NextResponse.json({ ok: true, results });
}
