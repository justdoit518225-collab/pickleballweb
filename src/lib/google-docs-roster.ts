/**
 * 双打賽程：把報名名單追加到 Google 文件（透過 Apps Script Webhook）
 *
 * 環境變數：
 * - GOOGLE_DOCS_ROSTER_WEBHOOK_URL：Apps Script 部署的 Web App URL
 * - GOOGLE_DOCS_ROSTER_SECRET：選填，與 Script 內 SECRET 一致
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

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false as const,
      skipped: false as const,
      error: `Google Doc 寫入失敗（${res.status}）${text ? `: ${text.slice(0, 200)}` : ""}`,
    };
  }

  return { ok: true as const, skipped: false as const, timestamp, count: cleaned.length };
}
