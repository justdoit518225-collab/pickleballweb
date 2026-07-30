/**
 * 雙打賽程：把報名名單追加到 Google 試算表／文件（透過 Apps Script Webhook）
 *
 * 環境變數：
 * - GOOGLE_DOCS_ROSTER_WEBHOOK_URL：Apps Script 部署的 Web App URL
 * - GOOGLE_DOCS_ROSTER_SECRET：選填，與 Script 內 SECRET 一致
 *
 * 若目標是 Google 試算表，請在 Apps Script 使用 SpreadsheetApp（見 docs/DOUBLES_ROSTER_GOOGLE_DOC.md）
 *
 * 注意：Apps Script ContentService 會先處理 POST，再 302 到
 * script.googleusercontent.com；轉址網址只接受 GET（用來取回傳內容）。
 * 對 Location 再 POST 會得到 HTTP 405。
 */
export async function appendRosterToGoogleDoc(names: string[]) {
  const webhookUrl = process.env.GOOGLE_DOCS_ROSTER_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return { ok: false as const, skipped: true as const, error: "未設定 GOOGLE_DOCS_ROSTER_WEBHOOK_URL" };
  }

  if (!isAppsScriptWebAppUrl(webhookUrl)) {
    return {
      ok: false as const,
      skipped: false as const,
      error:
        "GOOGLE_DOCS_ROSTER_WEBHOOK_URL 格式不對，請貼「網頁應用程式」URL（script.google.com/macros/s/.../exec）",
    };
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

function isAppsScriptWebAppUrl(url: string) {
  try {
    const u = new URL(url);
    return (
      u.hostname === "script.google.com" &&
      u.pathname.includes("/macros/s/") &&
      u.pathname.endsWith("/exec")
    );
  } catch {
    return false;
  }
}

async function postToAppsScript(url: string, payload: object): Promise<string> {
  const body = JSON.stringify(payload);
  // text/plain：Apps Script 仍可從 e.postData.contents 讀 JSON 字串
  const headers = { "Content-Type": "text/plain;charset=utf-8" };

  let res = await fetch(url, {
    method: "POST",
    headers,
    body,
    redirect: "manual",
  });

  // 第一次 POST 已執行 doPost；302 的 Location 只用 GET 取回傳內容
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (!location) {
      throw new Error(`Apps Script 轉址但沒有 Location（${res.status}）`);
    }
    res = await fetch(location, {
      method: "GET",
      redirect: "follow",
    });
  }

  const text = await res.text();
  if (!res.ok) {
    const hint =
      res.status === 405
        ? "（常見原因：Webhook URL 不是 /exec，或對轉址誤用 POST）"
        : "";
    throw new Error(`Apps Script HTTP ${res.status}${hint}: ${text.slice(0, 120)}`);
  }
  return text;
}
