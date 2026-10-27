import Link from "next/link";
import { LeaveClubButton } from "@/components/me/leave-club-button";
import { Avatar } from "@/components/ui/avatar";
import { resolveMemberDisplay } from "@/lib/member-display";
import { ROUTES } from "@/lib/constants";

export type MembershipVenueCard = {
  id: string;
  tenantId: string;
  nickname: string | null;
  avatarUrl: string | null;
  joinedAt: Date;
  tenant: {
    slug: string;
    displayName: string;
    logoUrl: string | null;
    description: string | null;
  };
};

export function MembershipVenueCards({
  memberships,
  accountUser,
}: {
  memberships: MembershipVenueCard[];
  accountUser: { id: string; name: string | null; image: string | null };
}) {
  if (memberships.length === 0) {
    return (
      <p className="mt-4 bg-[var(--bg)] p-6 text-base text-[var(--muted)]">
        預約任一場館活動後會自動加入該館會員。
      </p>
    );
  }

  return (
    <ul className="mt-5 grid gap-5 sm:grid-cols-2">
      {memberships.map((m) => {
        const display = resolveMemberDisplay(accountUser, m);
        const initial = m.tenant.displayName.trim().charAt(0) || "場";

        return (
          <li
            key={m.id}
            className="flex flex-col justify-between bg-[var(--bg)] p-6"
          >
            <div>
              <div className="flex items-start gap-3">
                {m.tenant.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.tenant.logoUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 bg-white object-cover"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center bg-brand-navy text-lg font-extrabold text-white"
                    aria-hidden
                  >
                    {initial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-extrabold leading-tight text-brand-navy">
                    {m.tenant.displayName}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[#1D6D75]">
                    會員暱稱：{display.displayName}
                  </p>
                </div>
                <Avatar src={display.avatarUrl} name={display.displayName} size="sm" />
              </div>

              {m.tenant.description && (
                <p className="mt-3 line-clamp-2 text-base text-[var(--muted)]">
                  {m.tenant.description}
                </p>
              )}

              <p className="mt-2 text-xs text-[var(--muted)] tabular-nums">
                加入於 {m.joinedAt.toLocaleDateString("zh-TW")}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={ROUTES.tenant(m.tenant.slug)}
                className="btn-brand px-3.5 py-2 text-sm font-bold text-white"
              >
                前往場館看板 →
              </Link>
              <Link
                href={ROUTES.tenantActivities(m.tenant.slug)}
                className="bg-white px-3.5 py-2 text-sm font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
              >
                活動列表
              </Link>
              <Link
                href={ROUTES.meProfile}
                className="bg-brand-lime-soft px-3.5 py-2 text-sm font-bold text-brand-navy hover:bg-brand-lime"
              >
                編輯暱稱／頭像
              </Link>
              <LeaveClubButton tenantId={m.tenantId} clubName={m.tenant.displayName} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
