import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { formatActivityDateTime } from "@/lib/format-datetime";
import { withPrisma } from "@/lib/prisma";

export default async function MeBookingsPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const { bookings, rentals, waitlists } = await withPrisma(async (db) => {
    const bookings = await db.booking.findMany({
      where: { userId },
      include: { activity: { include: { tenant: true, venue: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const rentals = await db.rentalBooking.findMany({
      where: { userId, status: "CONFIRMED" },
      include: { slot: { include: { court: true, venue: true, tenant: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
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
          活動預約
        </h2>
        {bookings.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">尚無活動預約</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"
              >
                <div>
                  <p className="font-medium text-slate-800">{b.activity.title}</p>
                  <p className="text-sm text-slate-500">
                    {b.activity.tenant.displayName} · {b.activity.venue.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatActivityDateTime(b.activity.startAt)}
                  </p>
                </div>
                <Badge variant={b.status === "CONFIRMED" ? "success" : "default"}>
                  {b.status === "CONFIRMED" ? "已報名" : "已取消"}
                </Badge>
              </li>
            ))}
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
            {rentals.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <p className="font-medium text-slate-800">
                  {r.slot.venue.name} · {r.slot.court.name}
                </p>
                <p className="text-sm text-slate-500">
                  {r.slot.startAt.toLocaleString("zh-TW")}
                </p>
              </li>
            ))}
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
