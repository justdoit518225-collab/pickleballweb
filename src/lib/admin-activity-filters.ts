import type { Prisma } from "@/generated/prisma/client";

export type AdminActivityFilterParams = {
  type?: string;
  status?: string;
  when?: string;
  venue?: string;
  q?: string;
};

const LIST_LIMIT = 50;

export function buildAdminActivityWhere(
  tenantId: string,
  params: AdminActivityFilterParams,
): Prisma.ActivityWhereInput {
  const where: Prisma.ActivityWhereInput = { tenantId };
  const now = new Date();

  if (params.type === "open-play") {
    where.type = "OPEN_PLAY";
    where.requiresDupr = false;
  } else if (params.type === "course") {
    where.type = "COURSE";
    where.requiresDupr = false;
  } else if (params.type === "dupr") {
    where.requiresDupr = true;
  }

  if (params.status === "draft") where.status = "DRAFT";
  else if (params.status === "published") where.status = "PUBLISHED";
  else if (params.status === "cancelled") where.status = "CANCELLED";

  const when = params.when ?? "upcoming";
  if (when === "upcoming") where.startAt = { gte: now };
  else if (when === "past") where.startAt = { lt: now };

  if (params.venue) where.venueId = params.venue;

  const q = params.q?.trim();
  if (q) where.title = { contains: q, mode: "insensitive" };

  return where;
}

export function adminActivityOrderBy(
  when?: string,
): Prisma.ActivityOrderByWithRelationInput {
  return when === "past"
    ? { startAt: "desc" }
    : { startAt: "asc" };
}

export { LIST_LIMIT };

export function activityStatusLabel(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "已發布";
    case "DRAFT":
      return "草稿";
    case "CANCELLED":
      return "已取消";
    default:
      return status;
  }
}

/** 活動狀態 Badge 樣式（不與球敘／課程／DUPR 類型色重複） */
export function activityStatusBadgeVariant(
  status: string,
): "published" | "draft" | "cancelled" | "default" {
  switch (status) {
    case "PUBLISHED":
      return "published";
    case "DRAFT":
      return "draft";
    case "CANCELLED":
      return "cancelled";
    default:
      return "default";
  }
}
