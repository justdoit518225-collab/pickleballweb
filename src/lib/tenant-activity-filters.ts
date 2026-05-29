import type { Prisma } from "@/generated/prisma/client";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type TenantActivityFilterType = "open-play" | "course" | "dupr";

export const TENANT_ACTIVITY_FILTER_ORDER: TenantActivityFilterType[] = [
  "open-play",
  "course",
  "dupr",
];

export const TENANT_ACTIVITY_FILTER_LABELS: Record<TenantActivityFilterType, string> = {
  "open-play": ACTIVITY_TYPE_LABELS.OPEN_PLAY,
  course: ACTIVITY_TYPE_LABELS.COURSE,
  dupr: ACTIVITY_TYPE_LABELS.DUPR,
};

const publishedUpcomingBase = (tenantId: string) => ({
  tenantId,
  status: "PUBLISHED" as const,
  startAt: { gte: new Date() },
});

/** 前台活動列表查詢條件 */
export function buildTenantActivityWhere(
  tenantId: string,
  type?: string | null,
): Prisma.ActivityWhereInput {
  const where: Prisma.ActivityWhereInput = publishedUpcomingBase(tenantId);

  if (type === "open-play") {
    where.type = "OPEN_PLAY";
    where.requiresDupr = false;
  } else if (type === "course") {
    where.type = "COURSE";
    where.requiresDupr = false;
  } else if (type === "dupr") {
    where.requiresDupr = true;
  }

  return where;
}

/** 依租戶目前已發布、尚未開始的活動，決定要顯示哪些篩選 */
export async function getTenantActivityFilterTypes(
  tenantId: string,
): Promise<TenantActivityFilterType[]> {
  const base = publishedUpcomingBase(tenantId);

  const [openPlay, course, dupr] = await Promise.all([
    prisma.activity.count({
      where: { ...base, type: "OPEN_PLAY", requiresDupr: false },
    }),
    prisma.activity.count({
      where: { ...base, type: "COURSE", requiresDupr: false },
    }),
    prisma.activity.count({ where: { ...base, requiresDupr: true } }),
  ]);

  const available: TenantActivityFilterType[] = [];
  if (openPlay > 0) available.push("open-play");
  if (course > 0) available.push("course");
  if (dupr > 0) available.push("dupr");
  return available;
}

export function isTenantActivityFilterType(
  value: string | undefined,
): value is TenantActivityFilterType {
  return value === "open-play" || value === "course" || value === "dupr";
}
