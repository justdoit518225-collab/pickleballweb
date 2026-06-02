"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

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

/** 批次建立租借時段 */
export async function createRentalSlots(tenantSlug: string, formData: FormData) {
  const { tenant, userId } = await assertStaff(tenantSlug);

  const courtIds = formData.getAll("courtIds") as string[];
  const startDate = String(formData.get("startDate"));
  const endDate = String(formData.get("endDate"));
  const slotStart = String(formData.get("slotStart")); // HH:mm
  const slotEnd = String(formData.get("slotEnd"));
  const cancelHoursBefore = Number(formData.get("cancelHoursBefore") ?? 4);

  if (!courtIds.length || !startDate || !endDate) {
    redirect(`/admin/${tenantSlug}/rentals?error=${encodeURIComponent("請填寫完整")}`);
  }

  const courts = await prisma.court.findMany({
    where: { id: { in: courtIds }, venue: { tenantId: tenant.id } },
    include: { venue: true },
  });

  const from = new Date(startDate);
  const to = new Date(endDate);
  const [sh, sm] = slotStart.split(":").map(Number);
  const [eh, em] = slotEnd.split(":").map(Number);

  const toCreate: {
    tenantId: string;
    venueId: string;
    courtId: string;
    startAt: Date;
    endAt: Date;
    cancelHoursBefore: number;
    createdById: string;
  }[] = [];

  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    for (const court of courts) {
      const startAt = new Date(d);
      startAt.setHours(sh, sm, 0, 0);
      const endAt = new Date(d);
      endAt.setHours(eh, em, 0, 0);
      if (endAt <= startAt) continue;

      const conflict = await prisma.rentalSlot.findFirst({
        where: {
          courtId: court.id,
          status: { not: "BLOCKED" },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });
      if (conflict) continue;

      toCreate.push({
        tenantId: tenant.id,
        venueId: court.venueId,
        courtId: court.id,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        cancelHoursBefore,
        createdById: userId,
      });
    }
  }

  if (toCreate.length > 0) {
    await prisma.rentalSlot.createMany({ data: toCreate });
  }

  revalidatePath(ROUTES.tenantRentals(tenantSlug));
  revalidatePath(`/admin/${tenantSlug}/rentals`);
  redirect(`/admin/${tenantSlug}/rentals?created=${toCreate.length}`);
}

export async function blockRentalSlot(tenantSlug: string, slotId: string) {
  const { tenant } = await assertStaff(tenantSlug);
  await prisma.rentalSlot.updateMany({
    where: { id: slotId, tenantId: tenant.id, status: "OPEN" },
    data: { status: "BLOCKED" },
  });
  revalidatePath(ROUTES.tenantRentals(tenantSlug));
  revalidatePath(`/admin/${tenantSlug}/rentals`);
}

export async function deleteRentalSlot(tenantSlug: string, slotId: string) {
  const { tenant } = await assertStaff(tenantSlug);
  await prisma.rentalSlot.deleteMany({
    where: { id: slotId, tenantId: tenant.id, status: { in: ["OPEN", "BLOCKED"] } },
  });
  revalidatePath(ROUTES.tenantRentals(tenantSlug));
  revalidatePath(`/admin/${tenantSlug}/rentals`);
}

function rentalsAdminPath(tenantSlug: string, query?: Record<string, string | number>) {
  const base = `/admin/${tenantSlug}/rentals`;
  if (!query || Object.keys(query).length === 0) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) params.set(k, String(v));
  return `${base}?${params.toString()}`;
}

/** 勾選多筆：封鎖 OPEN 時段 */
export async function bulkBlockRentalSlots(tenantSlug: string, formData: FormData) {
  const { tenant } = await assertStaff(tenantSlug);
  const slotIds = formData.getAll("slotIds").filter((v): v is string => typeof v === "string");
  if (!slotIds.length) {
    redirect(rentalsAdminPath(tenantSlug, { error: "請至少勾選一個時段" }));
  }

  const { count } = await prisma.rentalSlot.updateMany({
    where: { id: { in: slotIds }, tenantId: tenant.id, status: "OPEN" },
    data: { status: "BLOCKED" },
  });

  revalidatePath(ROUTES.tenantRentals(tenantSlug));
  revalidatePath(`/admin/${tenantSlug}/rentals`);
  redirect(rentalsAdminPath(tenantSlug, { blocked: count }));
}

/** 勾選多筆：刪除 OPEN / BLOCKED（不含已預約 BOOKED） */
export async function bulkDeleteRentalSlots(tenantSlug: string, formData: FormData) {
  const { tenant } = await assertStaff(tenantSlug);
  const slotIds = formData.getAll("slotIds").filter((v): v is string => typeof v === "string");
  if (!slotIds.length) {
    redirect(rentalsAdminPath(tenantSlug, { error: "請至少勾選一個時段" }));
  }

  const { count } = await prisma.rentalSlot.deleteMany({
    where: {
      id: { in: slotIds },
      tenantId: tenant.id,
      status: { in: ["OPEN", "BLOCKED"] },
    },
  });

  revalidatePath(ROUTES.tenantRentals(tenantSlug));
  revalidatePath(`/admin/${tenantSlug}/rentals`);
  redirect(rentalsAdminPath(tenantSlug, { deleted: count }));
}

/** 依日期區間與球場刪除未預約的 OPEN / BLOCKED 時段 */
export async function deleteRentalSlotsInRange(tenantSlug: string, formData: FormData) {
  const { tenant } = await assertStaff(tenantSlug);

  const courtIds = formData.getAll("courtIds").filter((v): v is string => typeof v === "string");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  if (!courtIds.length || !startDate || !endDate) {
    redirect(rentalsAdminPath(tenantSlug, { error: "請選擇球場與日期區間" }));
  }

  const from = new Date(startDate);
  from.setHours(0, 0, 0, 0);
  const to = new Date(endDate);
  to.setHours(23, 59, 59, 999);
  if (to < from) {
    redirect(rentalsAdminPath(tenantSlug, { error: "結束日期不可早於開始日期" }));
  }

  const courts = await prisma.court.findMany({
    where: { id: { in: courtIds }, venue: { tenantId: tenant.id } },
    select: { id: true },
  });
  if (!courts.length) {
    redirect(rentalsAdminPath(tenantSlug, { error: "找不到所選球場" }));
  }

  const { count } = await prisma.rentalSlot.deleteMany({
    where: {
      tenantId: tenant.id,
      courtId: { in: courts.map((c) => c.id) },
      startAt: { gte: from, lte: to },
      status: { in: ["OPEN", "BLOCKED"] },
    },
  });

  revalidatePath(ROUTES.tenantRentals(tenantSlug));
  revalidatePath(`/admin/${tenantSlug}/rentals`);
  redirect(rentalsAdminPath(tenantSlug, { deleted: count }));
}
