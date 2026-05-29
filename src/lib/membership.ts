import { prisma } from "@/lib/prisma";

/** 新加入場館時，以帳號名稱／頭像（含 LINE 登入）作為預設會員資料 */
export async function getAccountProfileDefaults(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, image: true },
  });
  return {
    nickname: user?.name?.trim() || null,
    avatarUrl: user?.image?.trim() || null,
  };
}

/** 預約、候補、租借時自動加入租戶會員；首次建立時帶入登入暱稱與頭像 */
export async function ensureTenantMembership(tenantId: string, userId: string) {
  const defaults = await getAccountProfileDefaults(userId);

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: {
      tenantId,
      userId,
      nickname: defaults.nickname,
      avatarUrl: defaults.avatarUrl,
    },
    update: {},
  });

  await prisma.notificationPreference.upsert({
    where: { userId_tenantId: { userId, tenantId } },
    create: { userId, tenantId },
    update: {},
  });
}
