import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
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

async function latestThread(where: { userId?: string; guestKey?: string }) {
  return prisma.contactThread.findFirst({
    where,
    orderBy: { lastMessageAt: "desc" },
  });
}

async function mergeThreadInto(fromId: string, intoId: string) {
  if (fromId === intoId) return;
  const [from, into] = await Promise.all([
    prisma.contactThread.findUnique({ where: { id: fromId } }),
    prisma.contactThread.findUnique({ where: { id: intoId } }),
  ]);
  if (!from || !into) return;

  await prisma.contactMessage.updateMany({
    where: { threadId: fromId },
    data: { threadId: intoId },
  });

  // 先清掉來源的唯一鍵，避免 unique(userId/guestKey) 衝突
  await prisma.contactThread.update({
    where: { id: fromId },
    data: { userId: null, guestKey: null },
  });

  await prisma.contactThread.update({
    where: { id: intoId },
    data: {
      lastMessageAt:
        from.lastMessageAt > into.lastMessageAt
          ? from.lastMessageAt
          : into.lastMessageAt,
      adminUnread: into.adminUnread + from.adminUnread,
      visitorUnread: into.visitorUnread + from.visitorUnread,
      status: into.status === "OPEN" || from.status === "OPEN" ? "OPEN" : "CLOSED",
      displayName: into.displayName || from.displayName,
      contactEmail: into.contactEmail || from.contactEmail,
      userId: into.userId || from.userId,
      guestKey: into.guestKey || from.guestKey,
    },
  });
  await prisma.contactThread.delete({ where: { id: fromId } });
}

/** 找訪客／登入者的唯一對話串（每位使用者對管理員只有一則） */
export async function findVisitorThread(opts: {
  userId?: string | null;
  guestKey?: string | null;
}) {
  const userId = opts.userId ?? null;
  const guestKey = opts.guestKey ?? null;
  const byUser = userId ? await latestThread({ userId }) : null;
  const byGuest = guestKey ? await latestThread({ guestKey }) : null;

  if (byUser && byGuest && byUser.id !== byGuest.id) {
    await mergeThreadInto(byGuest.id, byUser.id);
    return prisma.contactThread.findUnique({ where: { id: byUser.id } });
  }

  const thread = byUser ?? byGuest;
  if (thread && userId && !thread.userId) {
    try {
      return await prisma.contactThread.update({
        where: { id: thread.id },
        data: { userId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await latestThread({ userId });
        if (existing) {
          await mergeThreadInto(thread.id, existing.id);
          return prisma.contactThread.findUnique({ where: { id: existing.id } });
        }
      } else {
        throw error;
      }
    }
  }
  return thread;
}

export async function mergeDuplicateContactThreads() {
  const threads = await prisma.contactThread.findMany({
    select: { id: true, userId: true, guestKey: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const byUser = new Map<string, string[]>();
  const byGuest = new Map<string, string[]>();
  for (const t of threads) {
    if (t.userId) {
      const list = byUser.get(t.userId) ?? [];
      list.push(t.id);
      byUser.set(t.userId, list);
    }
    if (t.guestKey) {
      const list = byGuest.get(t.guestKey) ?? [];
      list.push(t.id);
      byGuest.set(t.guestKey, list);
    }
  }
  for (const ids of [...byUser.values(), ...byGuest.values()]) {
    if (ids.length < 2) continue;
    const keep = ids[0];
    for (const extra of ids.slice(1)) {
      await mergeThreadInto(extra, keep);
    }
  }
}

export async function getOrCreateVisitorThread(opts: {
  userId?: string | null;
  guestKey?: string | null;
  displayName?: string | null;
  contactEmail?: string | null;
}) {
  const userId = opts.userId ?? null;
  const guestKey = opts.guestKey ?? null;

  let byUser = userId ? await latestThread({ userId }) : null;
  let byGuest = guestKey ? await latestThread({ guestKey }) : null;

  if (byUser && byGuest && byUser.id !== byGuest.id) {
    await mergeThreadInto(byGuest.id, byUser.id);
    byGuest = null;
    byUser = await prisma.contactThread.findUnique({ where: { id: byUser.id } });
  }

  let thread = byUser ?? byGuest;
  if (!thread) {
    try {
      thread = await prisma.contactThread.create({
        data: {
          userId: userId ?? undefined,
          guestKey: userId ? undefined : guestKey ?? undefined,
          displayName: opts.displayName,
          contactEmail: opts.contactEmail,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        thread = await findVisitorThread({ userId, guestKey });
      } else {
        throw error;
      }
    }
  }

  if (!thread) {
    thread = await findVisitorThread({ userId, guestKey });
  }
  if (!thread) {
    throw new Error("無法建立聯繫對話");
  }

  const patch: {
    displayName?: string;
    contactEmail?: string;
    userId?: string;
    guestKey?: string;
    status?: "OPEN";
  } = {};
  if (opts.displayName) patch.displayName = opts.displayName;
  if (opts.contactEmail) patch.contactEmail = opts.contactEmail;
  if (userId && !thread.userId) patch.userId = userId;
  if (guestKey && !thread.guestKey && !userId) patch.guestKey = guestKey;
  if (thread.status === "CLOSED") patch.status = "OPEN";
  if (Object.keys(patch).length) {
    try {
      thread = await prisma.contactThread.update({
        where: { id: thread.id },
        data: patch,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await findVisitorThread({ userId, guestKey });
        if (existing && existing.id !== thread.id) {
          await mergeThreadInto(thread.id, existing.id);
          thread = existing;
        } else if (existing) {
          thread = existing;
        }
      } else {
        throw error;
      }
    }
  }
  return thread;
}

export function contactThreadWho(t: {
  displayName: string | null;
  contactEmail: string | null;
  user?: { name: string | null; email: string | null } | null;
}) {
  return t.displayName || t.user?.name || t.contactEmail || t.user?.email || "訪客";
}

export async function listAdminInboxThreads() {
  const threads = await prisma.contactThread.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
        select: { id: true, body: true, senderKind: true, createdAt: true },
      },
    },
  });
  return threads.map((t) => {
    const last = t.messages[t.messages.length - 1];
    return {
      id: t.id,
      who: contactThreadWho(t),
      preview: last?.body ?? null,
      lastFromAdmin: last?.senderKind === "ADMIN",
      status: t.status,
      adminUnread: t.adminUnread,
      lastMessageAt: t.lastMessageAt.toISOString(),
      messages: t.messages.map(toContactMessageDto),
    };
  });
}

export function toContactMessageDto(m: {
  id: string;
  body: string;
  senderKind: "VISITOR" | "ADMIN";
  createdAt: Date;
}) {
  return {
    id: m.id,
    body: m.body,
    senderKind: m.senderKind,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function postAdminReply(opts: {
  threadId: string;
  body: string;
  adminUserId: string;
}) {
  const thread = await prisma.contactThread.findUnique({
    where: { id: opts.threadId },
  });
  if (!thread) return null;

  const message = await prisma.contactMessage.create({
    data: {
      threadId: opts.threadId,
      body: opts.body,
      senderKind: "ADMIN",
      senderUserId: opts.adminUserId,
    },
  });

  const updated = await prisma.contactThread.update({
    where: { id: opts.threadId },
    data: {
      lastMessageAt: message.createdAt,
      visitorUnread: { increment: 1 },
      adminUnread: 0,
      status: "OPEN",
    },
  });

  void notifyVisitorAdminReply({
    userId: thread.userId,
    contactEmail: thread.contactEmail,
    preview: opts.body,
  }).catch((err) => {
    console.error("[contact] notify visitor failed", err);
  });

  return { message, thread: updated };
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
