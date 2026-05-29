import type { Prisma } from "@/generated/prisma/client";

export const MEMBER_PAGE_SIZES = [10, 25, 50, 100] as const;
export type MemberPageSize = (typeof MEMBER_PAGE_SIZES)[number];

export const DEFAULT_MEMBER_PAGE_SIZE: MemberPageSize = 25;
export type MemberListView = "paginate" | "scroll";

export type AdminMembersListParams = {
  page: number;
  pageSize: MemberPageSize;
  view: MemberListView;
  q: string;
};

export function parseAdminMembersListParams(searchParams: {
  page?: string;
  pageSize?: string;
  view?: string;
  q?: string;
}): AdminMembersListParams {
  const view: MemberListView = searchParams.view === "scroll" ? "scroll" : "paginate";
  const pageSizeNum = Number(searchParams.pageSize);
  const pageSize = MEMBER_PAGE_SIZES.includes(pageSizeNum as MemberPageSize)
    ? (pageSizeNum as MemberPageSize)
    : DEFAULT_MEMBER_PAGE_SIZE;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = searchParams.q?.trim() ?? "";
  return { page, pageSize, view, q };
}

export function buildMemberWhere(
  tenantId: string,
  q: string,
): Prisma.TenantMembershipWhereInput {
  const where: Prisma.TenantMembershipWhereInput = { tenantId };
  if (q) {
    where.OR = [
      { nickname: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

export function memberListSkip(page: number, pageSize: number, view: MemberListView) {
  if (view === "scroll") return 0;
  return (page - 1) * pageSize;
}
