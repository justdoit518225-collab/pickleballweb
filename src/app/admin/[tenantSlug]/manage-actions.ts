"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFitbookStore } from "@/lib/fitbook";
import {
  clearTenantFitbookCookie,
  FitbookSessionError,
  saveTenantFitbookCookie,
} from "@/lib/fitbook-session";
import { notifyUser } from "@/lib/notifications";
import { hashAccessCode } from "@/lib/tenant-access";
import { prisma } from "@/lib/prisma";
import { requireTenantStaff } from "@/lib/authz";
import { isTenantRoleKey, ROUTES, type TenantRoleKey } from "@/lib/constants";
import { toSlug, venueSlugFromInputs } from "@/lib/slug";

async function assertStaff(tenantSlug: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) redirect("/");
  const isSuper = session.user.platformRole === "SUPER_ADMIN";
  const staff = await prisma.tenantStaffRole.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id },
  });
  if (!isSuper && !staff) redirect("/");
  return { tenant, userId: session.user.id };
}

async function assertTenantAdmin(tenantSlug: string) {
  const { isTenantAdmin, tenant, session } = await requireTenantStaff(tenantSlug);
  if (!isTenantAdmin) redirect(ROUTES.tenantAdmin(tenantSlug));
  return { tenant, userId: session.user!.id! };
}

/** 變更後是否會讓俱樂部沒有任何場館管理員 */
async function leavesNoTenantAdmin(tenantId: string, userId: string, nextRole: TenantRoleKey | null) {
  const admins = await prisma.tenantStaffRole.findMany({
    where: { tenantId, role: "TENANT_ADMIN" },
    select: { userId: true },
  });
  const remaining = new Set(admins.map((a) => a.userId));
  if (nextRole !== "TENANT_ADMIN") remaining.delete(userId);
  return remaining.size === 0;
}

function staffError(tenantSlug: string, message: string): never {
  redirect(`${ROUTES.tenantAdminStaff(tenantSlug)}?error=${encodeURIComponent(message)}`);
}

export async function createVenue(tenantSlug: string, formData: FormData) {
  const { tenant } = await assertStaff(tenantSlug);
  const name = String(formData.get("name") ?? "").trim();
  const englishName = String(formData.get("slug") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!name) {
    redirect(`${ROUTES.tenantAdminVenues(tenantSlug)}?error=${encodeURIComponent("請填寫場館名稱")}`);
  }

  let slug = venueSlugFromInputs(englishName, name);
  const taken = await prisma.venue.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug } },
  });
  if (taken) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  await prisma.venue.create({ data: { tenantId: tenant.id, name, slug, address } });
  revalidatePath(ROUTES.tenantAdminVenues(tenantSlug));
  redirect(`${ROUTES.tenantAdminVenues(tenantSlug)}?saved=1`);
}

export async function createCourt(tenantSlug: string, formData: FormData) {
  const { tenant } = await assertStaff(tenantSlug);
  const venueId = String(formData.get("venueId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!venueId || !name) {
    redirect(`${ROUTES.tenantAdminVenues(tenantSlug)}?error=${encodeURIComponent("請填寫球場名稱")}`);
  }

  const venue = await prisma.venue.findFirst({ where: { id: venueId, tenantId: tenant.id } });
  if (!venue) redirect(ROUTES.tenantAdmin(tenantSlug));

  await prisma.court.create({ data: { venueId, name } });
  revalidatePath(ROUTES.tenantAdminVenues(tenantSlug));
  redirect(`${ROUTES.tenantAdminVenues(tenantSlug)}?saved=1`);
}

export async function updateVenue(tenantSlug: string, venueId: string, formData: FormData) {
  const { tenant } = await assertStaff(tenantSlug);
  const venue = await prisma.venue.findFirst({ where: { id: venueId, tenantId: tenant.id } });
  if (!venue) redirect(ROUTES.tenantAdmin(tenantSlug));

  const name = String(formData.get("name") ?? "").trim();
  const englishName = String(formData.get("slug") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!name) {
    redirect(
      `${ROUTES.tenantAdminVenues(tenantSlug)}?error=${encodeURIComponent("請填寫場館名稱")}`,
    );
  }

  let slug = venue.slug;
  if (englishName) {
    const next = toSlug(englishName);
    if (!next) {
      redirect(
        `${ROUTES.tenantAdminVenues(tenantSlug)}?error=${encodeURIComponent("英文名稱僅能使用小寫英文、數字與連字號")}`,
      );
    }
    const taken = await prisma.venue.findFirst({
      where: { tenantId: tenant.id, slug: next, NOT: { id: venueId } },
    });
    if (taken) {
      redirect(
        `${ROUTES.tenantAdminVenues(tenantSlug)}?error=${encodeURIComponent("此英文名稱已被其他場館使用")}`,
      );
    }
    slug = next;
  }

  await prisma.venue.update({
    where: { id: venueId },
    data: { name, slug, address },
  });
  revalidatePath(ROUTES.tenantAdminVenues(tenantSlug));
  redirect(`${ROUTES.tenantAdminVenues(tenantSlug)}?saved=1`);
}

export async function updateCourt(tenantSlug: string, courtId: string, formData: FormData) {
  const { tenant } = await assertStaff(tenantSlug);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect(
      `${ROUTES.tenantAdminVenues(tenantSlug)}?error=${encodeURIComponent("請填寫球場名稱")}`,
    );
  }

  const court = await prisma.court.findFirst({
    where: { id: courtId, venue: { tenantId: tenant.id } },
  });
  if (!court) redirect(ROUTES.tenantAdmin(tenantSlug));

  const duplicate = await prisma.court.findFirst({
    where: { venueId: court.venueId, name, NOT: { id: courtId } },
  });
  if (duplicate) {
    redirect(
      `${ROUTES.tenantAdminVenues(tenantSlug)}?error=${encodeURIComponent("此場館已有同名球場")}`,
    );
  }

  await prisma.court.update({ where: { id: courtId }, data: { name } });
  revalidatePath(ROUTES.tenantAdminVenues(tenantSlug));
  redirect(`${ROUTES.tenantAdminVenues(tenantSlug)}?saved=1`);
}

async function revalidateVenuePaths(tenantSlug: string) {
  revalidatePath(ROUTES.tenant(tenantSlug));
  revalidatePath(ROUTES.tenantAdmin(tenantSlug));
  revalidatePath(ROUTES.tenantAdminVenues(tenantSlug));
  revalidatePath(ROUTES.tenantAdminRentals(tenantSlug));
  revalidatePath(ROUTES.tenantActivities(tenantSlug));
}

export async function deactivateVenue(tenantSlug: string, venueId: string) {
  const { tenant } = await assertStaff(tenantSlug);
  const venue = await prisma.venue.findFirst({ where: { id: venueId, tenantId: tenant.id } });
  if (!venue) redirect(ROUTES.tenantAdmin(tenantSlug));

  await prisma.$transaction(async (tx) => {
    await tx.venue.update({ where: { id: venueId }, data: { isActive: false } });
    await tx.court.updateMany({ where: { venueId }, data: { isActive: false } });
  });

  await revalidateVenuePaths(tenantSlug);
  redirect(`${ROUTES.tenantAdminVenues(tenantSlug)}?saved=1`);
}

export async function reactivateVenue(tenantSlug: string, venueId: string) {
  const { tenant } = await assertStaff(tenantSlug);
  const venue = await prisma.venue.findFirst({ where: { id: venueId, tenantId: tenant.id } });
  if (!venue) redirect(ROUTES.tenantAdmin(tenantSlug));

  await prisma.$transaction(async (tx) => {
    await tx.venue.update({ where: { id: venueId }, data: { isActive: true } });
    await tx.court.updateMany({ where: { venueId }, data: { isActive: true } });
  });

  await revalidateVenuePaths(tenantSlug);
  redirect(`${ROUTES.tenantAdminVenues(tenantSlug)}?saved=1`);
}

export async function deleteVenue(tenantSlug: string, venueId: string) {
  const { tenant } = await assertStaff(tenantSlug);
  const venue = await prisma.venue.findFirst({ where: { id: venueId, tenantId: tenant.id } });
  if (!venue) redirect(ROUTES.tenantAdmin(tenantSlug));

  const [activityCount, rentalCount] = await Promise.all([
    prisma.activity.count({ where: { venueId } }),
    prisma.rentalSlot.count({ where: { venueId } }),
  ]);

  if (activityCount > 0 || rentalCount > 0) {
    redirect(
      `${ROUTES.tenantAdminVenues(tenantSlug)}?error=${encodeURIComponent("此場館已有活動或租借紀錄，請改用「停用場館」")}`,
    );
  }

  await prisma.venue.delete({ where: { id: venueId } });
  await revalidateVenuePaths(tenantSlug);
  redirect(`${ROUTES.tenantAdminVenues(tenantSlug)}?saved=1`);
}

export async function setMemberBanned(tenantSlug: string, userId: string, banned: boolean) {
  const { tenant } = await assertStaff(tenantSlug);
  await prisma.tenantMembership.updateMany({
    where: { tenantId: tenant.id, userId },
    data: { isBanned: banned },
  });
  revalidatePath(ROUTES.tenantAdminMembers(tenantSlug));
  redirect(ROUTES.tenantAdminMembers(tenantSlug));
}

export async function addStaffByEmail(tenantSlug: string, formData: FormData) {
  const { tenant } = await assertTenantAdmin(tenantSlug);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "STAFF");
  if (!isTenantRoleKey(role)) staffError(tenantSlug, "請選擇權限");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) staffError(tenantSlug, "找不到此 Email 使用者，請對方先登入一次");

  const existing = await prisma.tenantStaffRole.findFirst({
    where: { tenantId: tenant.id, userId: user.id },
  });
  if (existing) staffError(tenantSlug, "此帳號已在員工列表，請直接在下方修改權限");

  await prisma.tenantStaffRole.create({
    data: { tenantId: tenant.id, userId: user.id, role },
  });

  revalidatePath(ROUTES.tenantAdminStaff(tenantSlug));
  redirect(`${ROUTES.tenantAdminStaff(tenantSlug)}?saved=added`);
}

export async function updateStaffRole(tenantSlug: string, userId: string, formData: FormData) {
  const { tenant, userId: actorId } = await assertTenantAdmin(tenantSlug);
  const role = String(formData.get("role") ?? "");
  if (!isTenantRoleKey(role)) staffError(tenantSlug, "請選擇權限");
  if (await leavesNoTenantAdmin(tenant.id, userId, role)) {
    staffError(tenantSlug, "至少需保留一位場館管理員");
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenantStaffRole.deleteMany({ where: { tenantId: tenant.id, userId } });
    await tx.tenantStaffRole.create({ data: { tenantId: tenant.id, userId, role } });
  });

  revalidatePath(ROUTES.tenantAdminStaff(tenantSlug));
  if (userId === actorId && role !== "TENANT_ADMIN") redirect(ROUTES.tenantAdmin(tenantSlug));
  redirect(`${ROUTES.tenantAdminStaff(tenantSlug)}?saved=updated`);
}

export async function removeStaff(tenantSlug: string, userId: string) {
  const { tenant, userId: actorId } = await assertTenantAdmin(tenantSlug);
  if (await leavesNoTenantAdmin(tenant.id, userId, null)) {
    staffError(tenantSlug, "至少需保留一位場館管理員");
  }

  await prisma.tenantStaffRole.deleteMany({ where: { tenantId: tenant.id, userId } });

  revalidatePath(ROUTES.tenantAdminStaff(tenantSlug));
  if (userId === actorId) redirect(ROUTES.me);
  redirect(`${ROUTES.tenantAdminStaff(tenantSlug)}?saved=removed`);
}

export async function cancelActivityAsAdmin(tenantSlug: string, activityId: string) {
  const { tenant } = await assertStaff(tenantSlug);
  const activity = await prisma.activity.update({
    where: { id: activityId, tenantId: tenant.id },
    data: { status: "CANCELLED" },
    include: { bookings: { where: { status: "CONFIRMED" }, select: { userId: true } } },
  });

  for (const b of activity.bookings) {
    await notifyUser(
      b.userId,
      tenant.id,
      "activity_change",
      `【PlayPlayPlay】活動「${activity.title}」已由場館取消`,
    );
  }

  revalidatePath(ROUTES.tenantActivity(tenantSlug, activityId));
  revalidatePath(ROUTES.tenantAdmin(tenantSlug));
  redirect(`/admin/${tenantSlug}/activities/${activityId}/edit?cancelled=1`);
}

export async function submitDuprMatchResult(
  tenantSlug: string,
  activityId: string,
  formData: FormData,
) {
  const { tenant, userId } = await assertStaff(tenantSlug);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const payloadRaw = String(formData.get("payload") ?? "").trim();

  let payload: object | undefined;
  if (payloadRaw) {
    try {
      payload = JSON.parse(payloadRaw) as object;
    } catch {
      redirect(
        `/admin/${tenantSlug}/activities/${activityId}/edit?error=${encodeURIComponent("JSON 格式錯誤")}`,
      );
    }
  }

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, tenantId: tenant.id, requiresDupr: true },
  });
  if (!activity) redirect(ROUTES.tenantAdmin(tenantSlug));

  await prisma.duprMatchSubmission.create({
    data: {
      activityId,
      submittedById: userId,
      notes,
      payload,
      status: process.env.DUPR_API_KEY ? "PENDING" : "SYNCED",
      syncedAt: process.env.DUPR_API_KEY ? null : new Date(),
    },
  });

  revalidatePath(`/admin/${tenantSlug}/activities/${activityId}/edit`);
  redirect(`/admin/${tenantSlug}/activities/${activityId}/edit?duprSaved=1`);
}

export async function updateTenantAccessSettings(tenantSlug: string, formData: FormData) {
  const { tenant } = await assertTenantAdmin(tenantSlug);
  const visibility = String(formData.get("visibility"));
  const accessCode = String(formData.get("accessCode") ?? "").trim();

  if (visibility !== "PUBLIC" && visibility !== "PRIVATE") {
    redirect(
      `${ROUTES.tenantAdminSettings(tenantSlug)}?error=${encodeURIComponent("請選擇可見性")}`,
    );
  }

  const current = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenant.id },
    select: { accessCodeHash: true },
  });

  let accessCodeHash = current.accessCodeHash;
  if (accessCode) {
    accessCodeHash = hashAccessCode(accessCode);
  }

  if (visibility === "PRIVATE" && !accessCodeHash) {
    redirect(
      `${ROUTES.tenantAdminSettings(tenantSlug)}?error=${encodeURIComponent("私人俱樂部請設定邀請碼")}`,
    );
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      visibility,
      accessCodeHash: visibility === "PRIVATE" ? accessCodeHash : null,
    },
  });

  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.tenant(tenantSlug));
  revalidatePath(ROUTES.tenantAdminSettings(tenantSlug));
  redirect(`${ROUTES.tenantAdminSettings(tenantSlug)}?saved=1`);
}

function fitbookSettingsRedirect(tenantSlug: string, key: "fbSaved" | "fbError", message: string): never {
  redirect(`${ROUTES.tenantAdminSettings(tenantSlug)}?${key}=${encodeURIComponent(message)}`);
}

export async function saveFitbookCookie(tenantSlug: string, formData: FormData) {
  const { tenant } = await assertTenantAdmin(tenantSlug);
  const store = getFitbookStore(tenantSlug);
  if (!store) fitbookSettingsRedirect(tenantSlug, "fbError", "此俱樂部尚未對應 FitBook 場館");

  let result: Awaited<ReturnType<typeof saveTenantFitbookCookie>>;
  try {
    result = await saveTenantFitbookCookie(tenant.id, store, String(formData.get("cookie") ?? ""));
  } catch (e) {
    if (!(e instanceof FitbookSessionError)) throw e;
    fitbookSettingsRedirect(tenantSlug, "fbError", e.message);
  }

  revalidatePath(ROUTES.tenantAdminSettings(tenantSlug));
  revalidatePath(ROUTES.tenantAdminDuprEvents(tenantSlug));
  fitbookSettingsRedirect(
    tenantSlug,
    "fbSaved",
    result.tested
      ? `已連線 FitBook${result.accountName ? `（帳號：${result.accountName}）` : ""}`
      : "已儲存，但近 7 天 FitBook 沒有場次可測試，將在下次匯入時確認",
  );
}

export async function clearFitbookCookie(tenantSlug: string) {
  const { tenant } = await assertTenantAdmin(tenantSlug);
  await clearTenantFitbookCookie(tenant.id);
  revalidatePath(ROUTES.tenantAdminSettings(tenantSlug));
  revalidatePath(ROUTES.tenantAdminDuprEvents(tenantSlug));
  fitbookSettingsRedirect(tenantSlug, "fbSaved", "已移除 FitBook 連線");
}
