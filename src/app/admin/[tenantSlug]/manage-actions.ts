"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { notifyUser } from "@/lib/notifications";
import { hashAccessCode } from "@/lib/tenant-access";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";
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
  const { tenant } = await assertStaff(tenantSlug);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "STAFF") as "TENANT_ADMIN" | "VENUE_MANAGER" | "STAFF";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    redirect(`${ROUTES.tenantAdminStaff(tenantSlug)}?error=${encodeURIComponent("找不到此 Email 使用者，請對方先登入一次")}`);
  }

  const existing = await prisma.tenantStaffRole.findFirst({
    where: { tenantId: tenant.id, userId: user.id, role },
  });
  if (!existing) {
    await prisma.tenantStaffRole.create({
      data: { tenantId: tenant.id, userId: user.id, role },
    });
  }

  revalidatePath(ROUTES.tenantAdminStaff(tenantSlug));
  redirect(`${ROUTES.tenantAdminStaff(tenantSlug)}?saved=1`);
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
  const { tenant } = await assertStaff(tenantSlug);
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
