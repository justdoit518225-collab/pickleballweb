import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { CancelButton } from "@/components/me/cancel-button";
import { formatActivityDateTime } from "@/lib/format-datetime";
import { buildBookingListMeta } from "@/lib/booking-display";
import { withPrisma } from "@/lib/prisma";

export default async function MeBookingsPage() {
  const session = await auth();
  const userId = session!.user!.id;
  const now = new Date();

  const { bookings, rentals, waitlists } = await withPrisma(async (db) => {
    const bookings = await db.booking.findMany({
      where: { userId, status: "CONFIRMED" },
      include: { activity: { include: { tenant: true, venue: true, court: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const rentals = await db.rentalBooking.findMany({
      where: { userId, status: "CONFIRMED" },
      include: { slot: { include: { court: true, venue: true, tenant: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const waitlists = await db.waitlistEntry.findMany({
      where: { userId, status: "WAITING" },
      include: { activity: { include: { tenant: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { bookings, rentals, waitlists };
  });

  return (
    <div className="space-y-8">
      <section className="bg-white">
        <div className="bg-brand-navy px-6 py-4 text-white">
          <h2 className="text-xl font-extrabold text-white">臨打與活動報名紀錄</h2>
        </div>
        {bookings.length === 0 ? (
          <p className="px-6 py-8 text-base text-[var(--muted)]">目前尚無活動報名紀錄。</p>
        ) : (
          <ul className="space-y-1 bg-[var(--bg)] p-2">
            {bookings.map((b) => {
              const meta = buildBookingListMeta(b);
              const upcoming = b.activity.startAt > now;
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-4 bg-white px-5 py-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-extrabold text-brand-navy">
                        {b.activity.title}
                      </p>
                      {b.partySize > 1 && (
                        <Badge variant="default">{b.partySize} 人同行</Badge>
                      )}
                      {!upcoming && <Badge variant="default">已結束</Badge>}
                    </div>
                    <p className="text-sm font-semibold text-[#1D6D75]">
                      {b.activity.tenant.displayName} · {b.activity.venue.name}
                      {b.activity.court ? ` · ${b.activity.court.name}` : ""}
                    </p>
                    <p className="text-sm text-[var(--muted)] tabular-nums">
                      {formatActivityDateTime(b.activity.startAt)}
                      {meta ? ` · ${meta}` : ""}
                    </p>
                  </div>
                  {upcoming && (
                    <CancelButton
                      path={`/api/activities/${b.activityId}/cancel`}
                      label="取消報名"
                      confirmText={`確定取消「${b.activity.title}」的報名？`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bg-white">
        <div className="bg-[#1B6B73] px-6 py-4 text-white">
          <h2 className="text-xl font-extrabold text-white">整面球場租借紀錄</h2>
        </div>
        {rentals.length === 0 ? (
          <p className="px-6 py-8 text-base text-[var(--muted)]">目前尚無場地租借紀錄。</p>
        ) : (
          <ul className="space-y-1 bg-[var(--bg)] p-2">
            {rentals.map((r) => {
              const upcoming = r.slot.startAt > now;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-4 bg-white px-5 py-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-extrabold text-brand-navy">
                        {r.slot.venue.name} · {r.slot.court.name}
                      </p>
                      {r.racketRental > 0 && (
                        <Badge variant="default">租球拍 × {r.racketRental}</Badge>
                      )}
                      {!upcoming && <Badge variant="default">已結束</Badge>}
                    </div>
                    <p className="text-sm font-semibold text-[#1D6D75]">
                      {r.slot.tenant.displayName}
                    </p>
                    <p className="text-sm text-[var(--muted)] tabular-nums">
                      {r.slot.startAt.toLocaleString("zh-TW")}
                    </p>
                  </div>
                  {upcoming && (
                    <CancelButton
                      path={`/api/rentals/${r.slotId}/cancel`}
                      label="取消租借"
                      confirmText="確定取消此場地租借？"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {waitlists.length > 0 && (
        <section className="bg-brand-lime-soft p-6">
          <h2 className="text-xl font-extrabold text-brand-navy">候補排隊中</h2>
          <ul className="mt-3 space-y-2 text-base font-semibold text-brand-navy tabular-nums">
            {waitlists.map((w) => (
              <li key={w.id} className="bg-white px-4 py-3">
                {w.activity.title}（候補第 {w.position} 位）— {w.activity.tenant.displayName}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
