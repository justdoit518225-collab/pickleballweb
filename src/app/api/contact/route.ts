import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  findVisitorThread,
  getOrCreateGuestKey,
  guestCookieOptions,
  listThreadMessages,
  notifyAdminsNewContact,
  readGuestKeyFromCookies,
  sanitizeContactBody,
  sanitizeContactEmail,
  sanitizeDisplayName,
} from "@/lib/contact";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const guestKey = await readGuestKeyFromCookies();
  const thread = await findVisitorThread({ userId, guestKey });
  if (!thread) {
    return NextResponse.json({ thread: null, messages: [] });
  }

  const messages = await listThreadMessages(thread.id);
  if (thread.visitorUnread > 0) {
    await prisma.contactThread.update({
      where: { id: thread.id },
      data: { visitorUnread: 0 },
    });
  }

  return NextResponse.json({
    thread: {
      id: thread.id,
      displayName: thread.displayName,
      contactEmail: thread.contactEmail,
      status: thread.status,
      visitorUnread: 0,
    },
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      senderKind: m.senderKind,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const json = (await req.json().catch(() => null)) as {
    body?: string;
    displayName?: string;
    contactEmail?: string;
  } | null;

  const body = sanitizeContactBody(json?.body ?? "");
  if (!body) {
    return NextResponse.json({ error: "請輸入訊息內容" }, { status: 400 });
  }

  const displayName = sanitizeDisplayName(json?.displayName);
  const contactEmail = sanitizeContactEmail(json?.contactEmail);
  if (json?.contactEmail?.trim() && !contactEmail) {
    return NextResponse.json({ error: "Email 格式不正確" }, { status: 400 });
  }

  const existingGuest = await readGuestKeyFromCookies();
  const guestKey = userId ? existingGuest : await getOrCreateGuestKey(existingGuest);

  let thread = await findVisitorThread({ userId, guestKey });
  if (!thread) {
    thread = await prisma.contactThread.create({
      data: {
        userId: userId ?? undefined,
        guestKey: userId ? undefined : guestKey,
        displayName:
          displayName ??
          session?.user?.name?.slice(0, 40) ??
          null,
        contactEmail:
          contactEmail ??
          session?.user?.email?.slice(0, 120) ??
          null,
      },
    });
  } else {
    const patch: {
      displayName?: string;
      contactEmail?: string;
      userId?: string;
    } = {};
    if (displayName) patch.displayName = displayName;
    if (contactEmail) patch.contactEmail = contactEmail;
    if (userId && !thread.userId) patch.userId = userId;
    if (Object.keys(patch).length) {
      thread = await prisma.contactThread.update({
        where: { id: thread.id },
        data: patch,
      });
    }
  }

  const message = await prisma.contactMessage.create({
    data: {
      threadId: thread.id,
      body,
      senderKind: "VISITOR",
      senderUserId: userId ?? undefined,
    },
  });

  await prisma.contactThread.update({
    where: { id: thread.id },
    data: {
      lastMessageAt: message.createdAt,
      adminUnread: { increment: 1 },
      status: "OPEN",
      visitorUnread: 0,
    },
  });

  await notifyAdminsNewContact(thread.id, body);

  const res = NextResponse.json({
    ok: true,
    threadId: thread.id,
    message: {
      id: message.id,
      body: message.body,
      senderKind: message.senderKind,
      createdAt: message.createdAt.toISOString(),
    },
  });

  if (!userId) {
    res.cookies.set(guestCookieOptions(guestKey!));
  }

  return res;
}
