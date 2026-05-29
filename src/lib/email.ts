/** 選填 SMTP；未設定時僅記錄於主控台 */
export async function sendEmail(to: string, subject: string, text: string) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.info("[Email stub]", to, subject, text.slice(0, 80));
    return { sent: false };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@playplayplay.app",
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (e) {
    console.error("[Email failed]", e);
    return { sent: false };
  }
}
