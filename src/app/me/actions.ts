"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { readAvatarDataUrl } from "@/lib/avatar-upload";
import { importDuprProfileFromApi, linkDuprProfile, syncDuprFromApi } from "@/lib/dupr";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";
import { revokeTenantAccess } from "@/lib/tenant-access";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function updateMembershipProfile(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId") ?? "");
  const nicknameRaw = String(formData.get("nickname") ?? "").trim();
  const removeAvatar = formData.get("removeAvatar") === "on";
  const avatarFile = formData.get("avatar");

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, image: true },
  });

  const nickname =
    !nicknameRaw || nicknameRaw === account?.name?.trim()
      ? null
      : nicknameRaw;

  if (!tenantId) redirect(`${ROUTES.meProfile}?error=${encodeURIComponent("請選擇場館")}`);

  let avatarPatch: { avatarUrl?: string | null } = {};
  try {
    if (removeAvatar) {
      avatarPatch = { avatarUrl: null };
    } else if (avatarFile instanceof File && avatarFile.size > 0) {
      avatarPatch = { avatarUrl: await readAvatarDataUrl(avatarFile) };
    }
  } catch (e) {
    redirect(
      `${ROUTES.meProfile}?error=${encodeURIComponent(e instanceof Error ? e.message : "頭像上傳失敗")}`,
    );
  }

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId, userId: user.id } },
    create: { tenantId, userId: user.id, nickname, ...avatarPatch },
    update: { nickname, ...avatarPatch },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  if (tenant) {
    revalidatePath(ROUTES.tenant(tenant.slug));
    revalidatePath(ROUTES.tenantActivities(tenant.slug));
  }

  revalidatePath(ROUTES.me);
  revalidatePath(ROUTES.meProfile);
  redirect(`${ROUTES.meProfile}?saved=1`);
}

const duprSchema = z.object({
  duprId: z.string().min(1),
  duprName: z.string().optional(),
  singlesRating: z.coerce.number().optional(),
  doublesRating: z.coerce.number().optional(),
});

export async function saveDuprProfile(formData: FormData) {
  const user = await requireUser();
  const parsed = duprSchema.safeParse({
    duprId: formData.get("duprId"),
    duprName: formData.get("duprName") || undefined,
    singlesRating: formData.get("singlesRating") || undefined,
    doublesRating: formData.get("doublesRating") || undefined,
  });
  if (!parsed.success) {
    redirect(`${ROUTES.meDupr}?error=${encodeURIComponent("請填寫 DUPR ID")}`);
  }

  await linkDuprProfile(user.id, parsed.data);
  revalidatePath(ROUTES.meDupr);
  redirect(`${ROUTES.meDupr}?saved=1`);
}

export async function importDuprFromApiAction(formData: FormData) {
  const user = await requireUser();
  const duprId = String(formData.get("duprId") ?? "").trim();
  if (!duprId) {
    redirect(`${ROUTES.meDupr}?error=${encodeURIComponent("請先填寫 DUPR ID")}`);
  }

  try {
    await importDuprProfileFromApi(user.id, duprId);
    revalidatePath(ROUTES.meDupr);
    revalidatePath(ROUTES.me);
    redirect(`${ROUTES.meDupr}?imported=1`);
  } catch (e) {
    redirect(
      `${ROUTES.meDupr}?error=${encodeURIComponent(e instanceof Error ? e.message : "帶入失敗")}`,
    );
  }
}

export async function syncDuprAction() {
  const user = await requireUser();
  try {
    const result = await syncDuprFromApi(user.id);
    revalidatePath(ROUTES.meDupr);
    revalidatePath(ROUTES.me);
    const q = result.synced ? "synced=1" : `synced=0&message=${encodeURIComponent(result.message)}`;
    redirect(`${ROUTES.meDupr}?${q}`);
  } catch (e) {
    redirect(
      `${ROUTES.meDupr}?error=${encodeURIComponent(e instanceof Error ? e.message : "同步失敗")}`,
    );
  }
}

export async function updateNotificationPrefs(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!tenantId) redirect(`${ROUTES.meNotifications}?error=${encodeURIComponent("缺少場館")}`);

  const bool = (name: string) => formData.get(name) === "on";

  await prisma.notificationPreference.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId } },
    create: {
      userId: user.id,
      tenantId,
      masterEnabled: bool("masterEnabled"),
      notifyActivityChange: bool("notifyActivityChange"),
      notifyReminder: bool("notifyReminder"),
      notifyBookingSelf: bool("notifyBookingSelf"),
      notifyBookingCancel: bool("notifyBookingCancel"),
      notifyRosterChange: bool("notifyRosterChange"),
      notifyRentalBooking: bool("notifyRentalBooking"),
    },
    update: {
      masterEnabled: bool("masterEnabled"),
      notifyActivityChange: bool("notifyActivityChange"),
      notifyReminder: bool("notifyReminder"),
      notifyBookingSelf: bool("notifyBookingSelf"),
      notifyBookingCancel: bool("notifyBookingCancel"),
      notifyRosterChange: bool("notifyRosterChange"),
      notifyRentalBooking: bool("notifyRentalBooking"),
    },
  });

  revalidatePath(ROUTES.meNotifications);
  redirect(`${ROUTES.meNotifications}?saved=1`);
}

export async function markNotificationRead(notificationId: string) {
  const user = await requireUser();
  await prisma.userNotification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { readAt: new Date() },
  });
  revalidatePath(ROUTES.meInbox);
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await prisma.userNotification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath(ROUTES.meInbox);
}

/** 會員自行退出場館／俱樂部 */
export async function leaveClub(formData: FormData) {
  const user = await requireUser();
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  if (!tenantId) {
    redirect(`${ROUTES.me}?error=${encodeURIComponent("缺少場館")}`);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true, displayName: true },
  });
  if (!tenant) {
    redirect(`${ROUTES.me}?error=${encodeURIComponent("找不到場館")}`);
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
  });
  if (!membership) {
    redirect(`${ROUTES.me}?error=${encodeURIComponent("您不是此場館會員")}`);
  }

  await prisma.$transaction([
    prisma.tenantMembership.delete({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    }),
    prisma.notificationPreference.deleteMany({
      where: { tenantId: tenant.id, userId: user.id },
    }),
  ]);

  await revokeTenantAccess(tenant.slug);

  revalidatePath(ROUTES.me);
  revalidatePath(ROUTES.meProfile);
  revalidatePath(ROUTES.paddles);
  revalidatePath(ROUTES.tenant(tenant.slug));
  redirect(
    `${ROUTES.me}?left=${encodeURIComponent(tenant.displayName)}`,
  );
}
