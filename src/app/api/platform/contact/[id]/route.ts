import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listThreadMessages,
  postAdminReply,
  sanitizeContactBody,
  toContactMessageDto,
} from "@/lib/contact";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.platformRole !== "SUPER_ADMIN") {
    return { session: null as typeof session, error: NextResponse.json({ error: "沒有權限" }, { status: 403 }) };
  }
  return { session, error: null };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const thread = await prisma.contactThread.findUnique({ where: { id } });
  if (!thread) {
    return NextResponse.json({ error: "找不到對話" }, { status: 404 });
  }

  const messages = await listThreadMessages(id);
  if (thread.adminUnread > 0) {
    await prisma.contactThread.update({
      where: { id },
      data: { adminUnread: 0 },
    });
  }

  return NextResponse.json({
    thread: {
      id: thread.id,
      status: thread.status,
      displayName: thread.displayName,
      contactEmail: thread.contactEmail,
      adminUnread: 0,
    },
    messages: messages.map(toContactMessageDto),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdmin();
  if (error || !session?.user?.id) return error ?? NextResponse.json({ error: "沒有權限" }, { status: 403 });

  const { id } = await params;
  const json = (await req.json().catch(() => null)) as { body?: string } | null;
  const body = sanitizeContactBody(json?.body ?? "");
  if (!body) {
    return NextResponse.json({ error: "請輸入回覆內容" }, { status: 400 });
  }

  const result = await postAdminReply({
    threadId: id,
    body,
    adminUserId: session.user.id,
  });
  if (!result) {
    return NextResponse.json({ error: "找不到對話" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    message: toContactMessageDto(result.message),
    thread: {
      id: result.thread.id,
      status: result.thread.status,
    },
  });
}
