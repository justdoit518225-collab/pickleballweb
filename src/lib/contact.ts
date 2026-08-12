import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createInboxNotification } from "@/lib/inbox";
import { sendEmail } from "@/lib/email";
import { ROUTES } from "@/lib/constants";

export const CONTACT_GUEST_COOKIE = "ppp_contact_guest";
const MAX_BODY = 2000;
const MAX_NAME = 40;
const MAX_EMAIL = 120;

export function sanitizeContactBody(raw: string) {
  return raw.replace(/\r\n/g, "\n").trim().slice(0, MAX_BODY);
}

export function sanitizeDisplayName(raw: string | null | undefined) {
  const v = (raw ?? "").trim().slice(0, MAX_NAME);
  return v || null;
}

export function sanitizeContactEmail(raw: string | null | undefined) {
  const v = (raw ?? "").trim().slice(0, MAX_EMAIL);
  if (!v) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return v;
}

export async function getOrCreateGuestKey(existing?: string | null) {
  if (existing && existing.length >= 8 && existing.length <= 64) return existing;
  return randomUUID();
}

export async function readGuestKeyFromCookies() {
  const jar = await cookies();
  return jar.get(CONTACT_GUEST_COOKIE)?.value ?? null;
}

export function guestCookieOptions(value: string) {
  return {
    name: CONTACT_GUEST_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  };
}

/** 找訪客／登入者目前的對話串 */
export async function findVisitorThread(opts: {
  userId?: string | null;
  guestKey?: string | null;
}) {
  if (opts.userId) {
    const byUser = await prisma.contactThread.findFirst({
      where: { userId: opts.userId, status: "OPEN" },
      orderBy: { lastMessageAt: "desc" },
    });
    if (byUser) return byUser;
  }
  if (opts.guestKey) {
    return prisma.contactThread.findFirst({
      where: { guestKey: opts.guestKey, status: "OPEN" },
      orderBy: { lastMessageAt: "desc" },
    });
  }
  return null;
}

export async function listThreadMessages(threadId: string) {
  return prisma.contactMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export async function notifyAdminsNewContact(threadId: string, preview: string) {
  const admins = await prisma.user.findMany({
    where: { platformRole: "SUPER_ADMIN" },
    select: { id: true, email: true },
  });
  const origin =
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "https://www.playplayplay.fun";
  const title = "新的站內聯繫訊息";
  const path = ROUTES.platformContactThread(threadId);
  const body = `${preview.slice(0, 160)}\n\n前往回覆：${origin}${path}`;
  await Promise.all(
    admins.map(async (admin) => {
      await createInboxNotification(admin.id, title, `${preview.slice(0, 160)}\n\n前往回覆：${path}`);
      if (admin.email) {
        await sendEmail(admin.email, `[PlayPlayPlay] ${title}`, body);
      }
    }),
  );
  const fallback = process.env.SEED_SUPER_ADMIN_EMAIL?.trim();
  if (fallback && !admins.some((a) => a.email === fallback)) {
    await sendEmail(fallback, `[PlayPlayPlay] ${title}`, body);
  }
}

export async function notifyVisitorAdminReply(opts: {
  userId?: string | null;
  contactEmail?: string | null;
  preview: string;
}) {
  const title = "PlayPlayPlay 已回覆您的訊息";
  const body = opts.preview.slice(0, 400);
  if (opts.userId) {
    await createInboxNotification(opts.userId, title, body);
  }
  if (opts.contactEmail) {
    await sendEmail(opts.contactEmail, `[PlayPlayPlay] ${title}`, body);
  }
}
