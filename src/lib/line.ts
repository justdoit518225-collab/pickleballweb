/** LINE Messaging API 推播 */
export async function sendLineMessage(lineUserId: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.info("[LINE stub]", lineUserId, text);
    return { sent: false, reason: "no_token" };
  }

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[LINE push failed]", res.status, body);
    return { sent: false, reason: body };
  }

  return { sent: true };
}
