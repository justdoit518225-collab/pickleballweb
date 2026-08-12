"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/authz";
import {
  notifyVisitorAdminReply,
  sanitizeContactBody,
} from "@/lib/contact";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function replyContactThread(threadId: string, formData: FormData) {
  const session = await requireSuperAdmin();
  const body = sanitizeContactBody(String(formData.get("body") ?? ""));
  if (!body) {
    redirect(`${ROUTES.platformContactThread(threadId)}?error=empty`);
  }

  const thread = await prisma.contactThread.findUnique({ where: { id: threadId } });
  if (!thread) redirect(ROUTES.platformContact);

  const message = await prisma.contactMessage.create({
    data: {
      threadId,
      body,
      senderKind: "ADMIN",
      senderUserId: session.user!.id,
    },
  });

  await prisma.contactThread.update({
    where: { id: threadId },
    data: {
      lastMessageAt: message.createdAt,
      visitorUnread: { increment: 1 },
      adminUnread: 0,
      status: "OPEN",
    },
  });

  await notifyVisitorAdminReply({
    userId: thread.userId,
    contactEmail: thread.contactEmail,
    preview: body,
  });

  revalidatePath(ROUTES.platformContact);
  revalidatePath(ROUTES.platformContactThread(threadId));
  redirect(ROUTES.platformContactThread(threadId));
}

export async function closeContactThread(threadId: string) {
  await requireSuperAdmin();
  await prisma.contactThread.update({
    where: { id: threadId },
    data: { status: "CLOSED", adminUnread: 0 },
  });
  revalidatePath(ROUTES.platformContact);
  revalidatePath(ROUTES.platformContactThread(threadId));
  redirect(ROUTES.platformContact);
}

export async function reopenContactThread(threadId: string) {
  await requireSuperAdmin();
  await prisma.contactThread.update({
    where: { id: threadId },
    data: { status: "OPEN" },
  });
  revalidatePath(ROUTES.platformContact);
  revalidatePath(ROUTES.platformContactThread(threadId));
  redirect(ROUTES.platformContactThread(threadId));
}
