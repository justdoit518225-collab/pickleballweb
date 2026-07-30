/**
 * 雙打賽程：把報名名單追加到 Google 文件（透過 Apps Script Webhook）
 *
 * 環境變數：
 * - GOOGLE_DOCS_ROSTER_WEBHOOK_URL：Apps Script 部署的 Web App URL
 * - GOOGLE_DOCS_ROSTER_SECRET：選填，與 Script 內 SECRET 一致
 *
 * 注意：Apps Script 常回 302，若自動 follow 會把 POST 變 GET、body 遺失。
 * 因此改為 manual redirect，並對 Location 再發一次 POST。
 */
export async function appendRosterToGoogleDoc(names: string[]) {
  const webhookUrl = process.env.GOOGLE_DOCS_ROSTER_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return { ok: false as const, skipped: true as const, error: "未設定 GOOGLE_DOCS_ROSTER_WEBHOOK_URL" };
  }

  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return { ok: false as const, skipped: false as const, error: "名單為空" };
  }

  const timestamp = new Date().toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const payload = {
    secret: process.env.GOOGLE_DOCS_ROSTER_SECRET ?? "",
    timestamp,
    names: cleaned,
    count: cleaned.length,
  };

  try {
    const text = await postToAppsScript(webhookUrl, payload);
    let data: { ok?: boolean; error?: string } = {};
    try {
      data = JSON.parse(text) as { ok?: boolean; error?: string };
    } catch {
      console.error("[google-docs-roster] non-JSON response:", text.slice(0, 300));
      return {
        ok: false as const,
        skipped: false as const,
        error: "Google Script 回應不是 JSON，請確認已部署 doPost 且權限為「所有人」",
      };
    }

    if (!data.ok) {
      return {
        ok: false as const,
        skipped: false as const,
        error: data.error ? `Google Doc 寫入失敗：${data.error}` : "Google Doc 寫入失敗",
      };
    }

    return { ok: true as const, skipped: false as const, timestamp, count: cleaned.length };
  } catch (e) {
    console.error("[google-docs-roster]", e);
    return {
      ok: false as const,
      skipped: false as const,
      error: e instanceof Error ? e.message : "寫入 Google 文件時發生錯誤",
    };
  }
}

async function postToAppsScript(url: string, payload: object): Promise<string> {
  const body = JSON.stringify(payload);
  const headers = { "Content-Type": "application/json" };

  let res = await fetch(url, {
    method: "POST",
    headers,
    body,
    redirect: "manual",
  });

  // Apps Script：script.google.com → script.googleusercontent.com
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (!location) {
      throw new Error(`Apps Script 轉址但沒有 Location（${res.status}）`);
    }
    res = await fetch(location, {
      method: "POST",
      headers,
      body,
      redirect: "follow",
    });
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Apps Script HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return text;
}
