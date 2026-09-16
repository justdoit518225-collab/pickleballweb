import { auth } from "@/auth";
import { PADDLE_DEAL_TENANT_SLUG, ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type PaddleDealPriceContext = {
  showMemberPrice: boolean;
  dealClubSlug: string;
  dealClubName: string;
  /** 未入會 CTA 連結 */
  joinHref: string;
  /** 未入會 CTA 文案 */
  joinCtaLabel: string;
};

/**
 * 球拍優惠 CTA：
 * - 未登入 → 登入頁（登入後回到邀請碼／俱樂部入口）
 * - 已登入但未入會 → 私人館邀請碼頁／公開館首頁
 */
export async function getPaddleDealPriceContext(): Promise<PaddleDealPriceContext> {
  const slug = PADDLE_DEAL_TENANT_SLUG;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayName: true, visibility: true },
  });

  const dealClubName = tenant?.displayName ?? "俱樂部";
  /** 加入目標：私人館一律走邀請碼頁 */
  const joinTargetHref =
    !tenant || tenant.visibility === "PRIVATE"
      ? ROUTES.tenantAccess(slug)
      : ROUTES.tenant(slug);

  if (!tenant) {
    return {
      showMemberPrice: false,
      dealClubSlug: slug,
      dealClubName,
      joinHref: ROUTES.loginWithCallback(joinTargetHref),
      joinCtaLabel: "登入並加入俱樂部取得優惠價格",
    };
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      showMemberPrice: false,
      dealClubSlug: slug,
      dealClubName,
      joinHref: ROUTES.loginWithCallback(joinTargetHref),
      joinCtaLabel: "登入並加入俱樂部取得優惠價格",
    };
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: { tenantId: tenant.id, userId },
    },
    select: { isBanned: true },
  });

  const isMember = Boolean(membership && !membership.isBanned);

  return {
    showMemberPrice: isMember,
    dealClubSlug: slug,
    dealClubName,
    joinHref: joinTargetHref,
    joinCtaLabel: "加入俱樂部取得優惠價格",
  };
}
