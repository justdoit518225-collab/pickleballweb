"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { buildActivityOccurrences, resolveBatchCancelDeadline } from "@/lib/activity-batch";
import { toDatetimeLocalValue } from "@/lib/datetime";
import {
  activityBaseFormSchema,
  activityFormSchema,
  normalizeActivityInput,
  readActivityBaseFields,
  toActivityData,
  toActivityFormInput,
} from "@/lib/validations/activity";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

function parseForm(formData: FormData) {
  const result = activityFormSchema.safeParse({
    ...readActivityBaseFields(formData),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
  });
  if (!result.success) {
    throw new ZodError(result.error.issues);
  }
  return normalizeActivityInput(result.data);
}

function parseBaseForm(formData: FormData) {
  const result = activityBaseFormSchema.safeParse(readActivityBaseFields(formData));
  if (!result.success) {
    throw new ZodError(result.error.issues);
  }
  return result.data;
}

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

function redirectNewActivityError(tenantSlug: string, type: string | null, message: string) {
  const typeQuery =
    type === "COURSE" || type === "course"
      ? "type=course&"
      : type === "OPEN_PLAY" || type === "open-play"
        ? "type=open-play&"
        : type === "dupr"
          ? "type=dupr&"
          : "";
  redirect(`/admin/${tenantSlug}/activities/new?${typeQuery}error=${encodeURIComponent(message)}`);
}

export async function createActivity(tenantSlug: string, formData: FormData) {
  const { tenant, userId } = await assertStaff(tenantSlug);
  const batchEnabled = formData.get("batchEnabled") === "on";

  try {
    if (batchEnabled) {
      const base = parseBaseForm(formData);
      const startDate = String(formData.get("batchStartDate") ?? "");
      const endDate = String(formData.get("batchEndDate") ?? "");
      const repeatDays = formData.getAll("repeatDays").map((d) => Number(d));
      const slotStart = String(formData.get("batchSlotStart") ?? "");
      const slotEnd = String(formData.get("batchSlotEnd") ?? "");

      if (!startDate || !endDate || repeatDays.length === 0 || !slotStart || !slotEnd) {
        redirectNewActivityError(tenantSlug, base.type, "請填寫批次建立的日期、星期與時段");
      }

      const occurrences = buildActivityOccurrences({
        startDate,
        endDate,
        repeatDays,
        slotStart,
        slotEnd,
      });

      if (occurrences.length === 0) {
        redirectNewActivityError(tenantSlug, base.type, "此區間內沒有符合的場次，請檢查日期與星期");
      }

      if (occurrences.length > 60) {
        redirectNewActivityError(tenantSlug, base.type, "單次最多建立 60 場，請縮短日期區間");
      }

      const deadlineAtStart = formData.getAll("batchDeadlineAtStart").includes("on");
      const batchDeadlineDaysBefore = Number(formData.get("batchCancelDeadlineDaysBefore") ?? 0);
      const batchDeadlineTime = String(formData.get("batchCancelDeadlineTime") ?? "18:00");

      await prisma.$transaction(async (tx) => {
        for (const { startAt, endAt } of occurrences) {
          const startLocal = toDatetimeLocalValue(startAt);
          const endLocal = toDatetimeLocalValue(endAt);
          const cancelDeadlineAt =
            base.cancelPolicyType === "DEADLINE"
              ? resolveBatchCancelDeadline(startAt, {
                  atStart: deadlineAtStart,
                  daysBefore: batchDeadlineDaysBefore,
                  time: batchDeadlineTime,
                })
              : base.cancelDeadlineAt;

          const parsed = toActivityFormInput(
            { ...base, cancelDeadlineAt },
            startLocal,
            endLocal,
          );
          await tx.activity.create({
            data: {
              tenantId: tenant.id,
              ...toActivityData(parsed, userId),
            },
          });
        }
      });

      revalidatePath(ROUTES.tenant(tenantSlug));
      revalidatePath(ROUTES.tenantAdmin(tenantSlug));
      redirect(
        `/admin/${tenantSlug}?batchCreated=${occurrences.length}`,
      );
    }

    const parsed = parseForm(formData);
    const activity = await prisma.activity.create({
      data: {
        tenantId: tenant.id,
        ...toActivityData(parsed, userId),
      },
    });

    revalidatePath(ROUTES.tenant(tenantSlug));
    revalidatePath(ROUTES.tenantAdmin(tenantSlug));
    redirect(`/admin/${tenantSlug}/activities/${activity.id}/edit?created=1`);
  } catch (e) {
    if (e instanceof ZodError) {
      const type = String(formData.get("type") ?? "");
      redirectNewActivityError(
        tenantSlug,
        type,
        e.issues[0]?.message ?? "驗證失敗",
      );
    }
    throw e;
  }
}

export async function updateActivity(
  tenantSlug: string,
  activityId: string,
  formData: FormData,
) {
  const { tenant } = await assertStaff(tenantSlug);

  const existing = await prisma.activity.findFirst({
    where: { id: activityId, tenantId: tenant.id },
  });
  if (!existing) redirect(`/admin/${tenantSlug}?error=${encodeURIComponent("活動不存在")}`);

  try {
    const parsed = parseForm(formData);
    await prisma.activity.update({
      where: { id: activityId },
      data: toActivityData(parsed, existing.createdById ?? undefined),
    });

    revalidatePath(ROUTES.tenant(tenantSlug));
    revalidatePath(ROUTES.tenantActivities(tenantSlug));
    revalidatePath(ROUTES.tenantActivity(tenantSlug, activityId));
    revalidatePath(ROUTES.tenantAdmin(tenantSlug));
    redirect(`/admin/${tenantSlug}/activities/${activityId}/edit?saved=1`);
  } catch (e) {
    if (e instanceof ZodError) {
      redirect(
        `/admin/${tenantSlug}/activities/${activityId}/edit?error=${encodeURIComponent(e.issues[0]?.message ?? "驗證失敗")}`,
      );
    }
    throw e;
  }
}

export async function duplicateActivity(tenantSlug: string, activityId: string) {
  const { tenant, userId } = await assertStaff(tenantSlug);

  const existing = await prisma.activity.findFirst({
    where: { id: activityId, tenantId: tenant.id },
  });
  if (!existing) redirect(`/admin/${tenantSlug}?error=${encodeURIComponent("活動不存在")}`);

  const copy = await prisma.activity.create({
    data: {
      tenantId: existing.tenantId,
      venueId: existing.venueId,
      courtId: existing.courtId,
      type: existing.type,
      status: "DRAFT",
      title: `${existing.title}（複製）`,
      description: existing.description,
      startAt: existing.startAt,
      endAt: existing.endAt,
      capacity: existing.capacity,
      cancelPolicyType: existing.cancelPolicyType,
      cancelHoursBefore: existing.cancelHoursBefore,
      cancelDeadlineAt: existing.cancelDeadlineAt,
      requiresDupr: existing.requiresDupr,
      duprEventName: existing.duprEventName,
      createdById: userId,
    },
  });

  revalidatePath(ROUTES.tenantAdmin(tenantSlug));
  redirect(`/admin/${tenantSlug}/activities/${copy.id}/edit?created=1`);
}

export async function deleteActivity(tenantSlug: string, activityId: string) {
  const { tenant } = await assertStaff(tenantSlug);

  await prisma.activity.deleteMany({
    where: { id: activityId, tenantId: tenant.id },
  });

  revalidatePath(ROUTES.tenantAdmin(tenantSlug));
  redirect(`/admin/${tenantSlug}`);
}
