import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { appendRosterToGoogleDoc } from "@/lib/google-docs-roster";

function alertEmail() {
  return (
    process.env.GOOGLE_DOCS_ROSTER_ALERT_EMAIL?.trim() ||
    process.env.SEED_SUPER_ADMIN_EMAIL?.trim() ||
    "justdoit518225@gmail.com"
  );
}

async function notifyRosterSaveFailure(error: string, names: string[]) {
  const to = alertEmail();
  if (!to) {
    console.error("[save-roster] 失敗但未設定告警信箱:", error);
    return;
  }

  const roster = names.map((n, i) => `${i + 1}. ${n}`).join("\n");
  const text = [
    "雙打賽程報名名單寫入 Google 試算表失敗。",
    "",
    `時間：${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`,
    `錯誤：${error}`,
    `人數：${names.length}`,
    "",
    "名單：",
    roster || "(空)",
  ].join("\n");

  await sendEmail(to, "[PlayPlayPlay] 雙打賽程名單寫入失敗", text);
}

export async function POST(request: Request) {
  let names: string[] = [];
  try {
    const body = (await request.json()) as { names?: unknown };
    if (Array.isArray(body.names)) {
      names = body.names.filter((n): n is string => typeof n === "string");
    }
  } catch {
    // 不把錯誤細節回給前端
    return NextResponse.json({ ok: true, saved: false });
  }

  try {
    const result = await appendRosterToGoogleDoc(names);
    if (result.skipped) {
      return NextResponse.json({ ok: true, saved: false });
    }
    if (!result.ok) {
      await notifyRosterSaveFailure(result.error ?? "未知錯誤", names);
      return NextResponse.json({ ok: true, saved: false });
    }
    return NextResponse.json({
      ok: true,
      saved: true,
      timestamp: result.timestamp,
      count: result.count,
    });
  } catch (e) {
    console.error(e);
    await notifyRosterSaveFailure(
      e instanceof Error ? e.message : "寫入 Google 試算表時發生錯誤",
      names,
    );
    return NextResponse.json({ ok: true, saved: false });
  }
}
