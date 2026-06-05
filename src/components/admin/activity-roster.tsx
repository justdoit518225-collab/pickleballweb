import { sumPartySize } from "@/lib/activity-capacity";
import {
  buildBookingListMeta,
  formatPartyHeadLabel,
} from "@/lib/booking-display";
import { resolveMemberDisplay } from "@/lib/member-display";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/avatar";

export async function ActivityRoster({
  activityId,
  tenantId,
}: {
  activityId: string;
  tenantId: string;
}) {
  const [bookings, waitlist] = await Promise.all([
    prisma.booking.findMany({
      where: { activityId, status: "CONFIRMED" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.waitlistEntry.findMany({
      where: { activityId, status: "WAITING" },
      include: { user: true },
      orderBy: { position: "asc" },
    }),
  ]);

  const memberships = await prisma.tenantMembership.findMany({
    where: {
      tenantId,
      userId: { in: [...bookings, ...waitlist].map((x) => x.userId) },
    },
  });
  const map = new Map(memberships.map((m) => [m.userId, m]));

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-semibold text-slate-800">
          已報名（{sumPartySize(bookings)} 人 · {bookings.length} 筆）
        </h3>
        <ul className="mt-3 space-y-2">
          {bookings.map((b) => {
            const d = resolveMemberDisplay(b.user, map.get(b.userId));
            const label = formatPartyHeadLabel(b.partySize, d.displayName);
            const meta = buildBookingListMeta(b);
            return (
              <li key={b.id} className="flex items-start gap-2 text-sm">
                <Avatar src={d.avatarUrl} name={label} size="sm" />
                <div>
                  <span className="font-medium text-slate-800">{label}</span>
                  {meta && <p className="text-xs text-slate-500">{meta}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
        <h3 className="font-semibold text-amber-900">候補 ({waitlist.length})</h3>
        <ul className="mt-3 space-y-2">
          {waitlist.map((w) => {
            const d = resolveMemberDisplay(w.user, map.get(w.userId));
            return (
              <li key={w.id} className="flex items-center gap-2 text-sm text-amber-900">
                <span className="text-xs text-amber-700">#{w.position}</span>
                <Avatar src={d.avatarUrl} name={d.displayName} size="sm" />
                {d.displayName}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
