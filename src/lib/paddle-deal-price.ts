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

/** 首頁私人俱樂部邀請碼區塊（不暴露 tenant slug） */
const HOME_PRIVATE_JOIN_HREF = `${ROUTES.home}?private=1`;

/**
 * 球拍優惠 CTA：
 * - 未登入 → 登入頁（登入後回首頁輸入邀請碼）
 * - 已登入但未入會 → 首頁邀請碼區塊（不直接連到 /t/{slug}）
 */
export async function getPaddleDealPriceContext(): Promise<PaddleDealPriceContext> {
  const slug = PADDLE_DEAL_TENANT_SLUG;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayName: true, visibility: true },
  });

  const dealClubName = tenant?.displayName ?? "俱樂部";
  /**
   * 私人館：走首頁邀請碼，使用者只需知道邀請碼，不必知道 slug。
   * 公開館：可直接進俱樂部頁。
   */
  const joinTargetHref =
    !tenant || tenant.visibility === "PRIVATE"
      ? HOME_PRIVATE_JOIN_HREF
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
