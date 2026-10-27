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
      {saved && (
        <p className="bg-brand-lime-soft px-4 py-3 text-sm font-bold text-brand-navy">
          已儲存個人資料
        </p>
      )}
      {error && (
        <p className="bg-rose-100 px-4 py-3 text-sm font-bold text-rose-900">
          {error}
        </p>
      )}

      {memberships.length === 0 ? (
        <div className="bg-white p-8">
          <p className="text-base text-[var(--muted)]">
            尚無場館會員資料，預約任一俱樂部活動後會自動建立專屬名片。
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
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
