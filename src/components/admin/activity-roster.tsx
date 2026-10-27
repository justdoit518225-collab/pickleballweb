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
    <div className="grid gap-4 md:grid-cols-2">
      <section className="bg-white p-6">
        <h3 className="text-[16px] font-black text-brand-navy">
          已報名（{sumPartySize(bookings)} 人 · {bookings.length} 筆）
        </h3>
        <ul className="mt-4 space-y-2">
          {bookings.map((b) => {
            const d = resolveMemberDisplay(b.user, map.get(b.userId));
            const label = formatPartyHeadLabel(b.partySize, d.displayName);
            const meta = buildBookingListMeta(b);
            return (
              <li key={b.id} className="flex items-start gap-2.5 bg-[var(--bg)] p-3 text-[14px]">
                <Avatar src={d.avatarUrl} name={label} size="sm" />
                <div>
                  <span className="font-bold text-brand-navy">{label}</span>
                  {meta && <p className="text-[14px] text-[var(--muted)]">{meta}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="bg-white p-6">
        <h3 className="text-[16px] font-black text-[#9A5B00]">候補 ({waitlist.length})</h3>
        <ul className="mt-4 space-y-2">
          {waitlist.map((w) => {
            const d = resolveMemberDisplay(w.user, map.get(w.userId));
            return (
              <li key={w.id} className="flex items-center gap-2.5 bg-[#FFF4E5] p-3 text-[14px] font-bold text-[#9A5B00]">
                <span className="font-mono text-[14px] font-black">#{w.position}</span>
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
