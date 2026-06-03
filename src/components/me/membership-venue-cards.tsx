import Link from "next/link";
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
      <p className="mt-3 text-sm text-slate-500">預約任一場館活動後會自動加入該館會員</p>
    );
  }

  return (
    <ul className="mt-4 grid gap-4 sm:grid-cols-2">
      {memberships.map((m) => {
        const display = resolveMemberDisplay(accountUser, m);
        const initial = m.tenant.displayName.trim().charAt(0) || "場";

        return (
          <li
            key={m.id}
            className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-sm transition hover:border-brand-teal/50 hover:shadow-md"
          >
            <div className="h-1.5 bg-gradient-to-r from-brand-navy to-brand-teal" />
            <div className="p-4">
              <div className="flex items-start gap-3">
                {m.tenant.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.tenant.logoUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-lg font-bold text-white"
                    aria-hidden
                  >
                    {initial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold leading-tight text-slate-900">
                    {m.tenant.displayName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    會員暱稱：{display.displayName}
                  </p>
                </div>
                <Avatar src={display.avatarUrl} name={display.displayName} size="sm" />
              </div>

              {m.tenant.description && (
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{m.tenant.description}</p>
              )}

              <p className="mt-2 text-xs text-slate-400">
                加入於 {m.joinedAt.toLocaleDateString("zh-TW")}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={ROUTES.tenant(m.tenant.slug)}
                  className="rounded-lg bg-brand-navy px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  前往場館
                </Link>
                <Link
                  href={ROUTES.tenantActivities(m.tenant.slug)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  活動列表
                </Link>
                <Link
                  href={ROUTES.meProfile}
                  className="rounded-lg border border-brand-teal/30 bg-brand-lime-soft/30 px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-brand-lime-soft/50"
                >
                  編輯暱稱／頭像
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
