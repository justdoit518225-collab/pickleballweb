import { NextResponse } from "next/server";
import { appendRosterToGoogleDoc } from "@/lib/google-docs-roster";

export async function POST(request: Request) {
  let names: string[] = [];
  try {
    const body = (await request.json()) as { names?: unknown };
    if (Array.isArray(body.names)) {
      names = body.names.filter((n): n is string => typeof n === "string");
    }
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  try {
    const result = await appendRosterToGoogleDoc(names);
    if (result.skipped) {
      return NextResponse.json({
        ok: true,
        saved: false,
        message: "尚未設定 Google 文件 webhook，已略過存檔",
      });
    }
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      saved: true,
      timestamp: result.timestamp,
      count: result.count,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "寫入 Google 文件時發生錯誤" }, { status: 500 });
  }
}
