import { auth } from "@/auth";
import { PADDLE_DEAL_TENANT_SLUG, ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type PaddleDealPriceContext = {
  showMemberPrice: boolean;
  dealClubSlug: string;
  dealClubName: string;
  /** 未入會 CTA 連結：公開館進首頁；私人館進邀請碼頁 */
  joinHref: string;
};

export async function getPaddleDealPriceContext(): Promise<PaddleDealPriceContext> {
  const slug = PADDLE_DEAL_TENANT_SLUG;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayName: true, visibility: true },
  });

  const dealClubName = tenant?.displayName ?? "俱樂部";
  const accessHref =
    tenant?.visibility === "PRIVATE"
      ? ROUTES.tenantAccess(slug)
      : ROUTES.tenant(slug);

  if (!tenant) {
    return {
      showMemberPrice: false,
      dealClubSlug: slug,
      dealClubName,
      joinHref: ROUTES.loginWithCallback(accessHref),
    };
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      showMemberPrice: false,
      dealClubSlug: slug,
      dealClubName,
      joinHref: ROUTES.loginWithCallback(accessHref),
    };
  }

  const joinHref = accessHref;

  const membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: { tenantId: tenant.id, userId },
    },
    select: { isBanned: true },
  });

  return {
    showMemberPrice: Boolean(membership && !membership.isBanned),
    dealClubSlug: slug,
    dealClubName,
    joinHref,
  };
}
