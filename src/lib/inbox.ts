import { prisma } from "@/lib/prisma";

export async function createInboxNotification(
  userId: string,
  title: string,
  body: string,
  tenantId?: string,
) {
  return prisma.userNotification.create({
    data: { userId, tenantId, title, body },
  });
}
