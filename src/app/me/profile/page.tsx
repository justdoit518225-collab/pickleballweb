import { auth } from "@/auth";
import { MembershipProfileForm } from "@/components/me/membership-profile-form";
import { resolveMemberDisplay } from "@/lib/member-display";
import { prisma } from "@/lib/prisma";

export default async function MeProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id;

  const [memberships, accountUser] = await Promise.all([
    prisma.tenantMembership.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, image: true },
    }),
  ]);

  const loginFallbackName = accountUser?.name ?? session!.user!.name ?? "會員";
  const accountForDisplay = {
    id: userId,
    name: accountUser?.name ?? session!.user!.name ?? null,
    image: accountUser?.image ?? session!.user!.image ?? null,
  };

  return (
    <div className="space-y-6">
      {saved && <p className="text-sm text-brand-teal">已儲存</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {memberships.length === 0 ? (
        <p className="text-sm text-slate-500">尚無場館會員資料，預約任一活動後會自動建立</p>
      ) : (
        <div className="space-y-6">
          {memberships.map((m) => {
            const display = resolveMemberDisplay(accountForDisplay, m);
            const nicknameDefault = m.nickname ?? "";

            return (
              <MembershipProfileForm
                key={m.id}
                membershipId={m.id}
                tenantId={m.tenantId}
                tenantName={m.tenant.displayName}
                nicknameDefault={nicknameDefault}
                avatarPreviewUrl={display.avatarUrl}
                loginFallbackName={loginFallbackName}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
