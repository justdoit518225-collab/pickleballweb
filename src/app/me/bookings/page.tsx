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
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-800">
          臨打 / 活動報名
        </h2>
        {bookings.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">尚無活動報名</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {bookings.map((b) => {
              const meta = buildBookingListMeta(b);
              const upcoming = b.activity.startAt > now;
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{b.activity.title}</p>
                      {b.partySize > 1 && (
                        <Badge variant="default">{b.partySize} 人</Badge>
                      )}
                      {!upcoming && <Badge variant="default">已結束</Badge>}
                    </div>
                    <p className="text-sm text-slate-500">
                      {b.activity.tenant.displayName} · {b.activity.venue.name}
                      {b.activity.court ? ` · ${b.activity.court.name}` : ""}
                    </p>
                    <p className="text-sm text-slate-500">
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

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-800">
          場地租借
        </h2>
        {rentals.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">尚無租借紀錄</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rentals.map((r) => {
              const upcoming = r.slot.startAt > now;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">
                        {r.slot.venue.name} · {r.slot.court.name}
                      </p>
                      {r.racketRental > 0 && (
                        <Badge variant="default">球拍×{r.racketRental}</Badge>
                      )}
                      {!upcoming && <Badge variant="default">已結束</Badge>}
                    </div>
                    <p className="text-sm text-slate-500">
                      {r.slot.tenant.displayName}
                    </p>
                    <p className="text-sm text-slate-500">
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
        <section className="rounded-xl border border-amber-100 bg-amber-50/50 p-5">
          <h2 className="font-semibold text-amber-900">候補中</h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {waitlists.map((w) => (
              <li key={w.id}>
                {w.activity.title}（第 {w.position} 位）— {w.activity.tenant.displayName}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
