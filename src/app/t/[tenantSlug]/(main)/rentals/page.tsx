import Link from "next/link";
import { auth } from "@/auth";
import { RentalCalendar, type RentalSlotView } from "@/components/rental/rental-calendar";
import { ROUTES } from "@/lib/constants";
import { withPrisma } from "@/lib/prisma";
import { getTenantRentalWindow } from "@/lib/rental-service";
import { notFound, redirect } from "next/navigation";

export default async function TenantRentalsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await auth();
  const { from, to } = getTenantRentalWindow();

  const data = await withPrisma(async (db) => {
    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug, isActive: true },
      include: {
        venues: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });
    if (!tenant) return null;

    const slots = await db.rentalSlot.findMany({
      where: {
        tenantId: tenant.id,
        startAt: { gte: from, lt: to },
      },
      include: {
        court: true,
        venue: true,
        bookedBy: { select: { id: true, name: true } },
        rentalBooking: { where: { status: "CONFIRMED" } },
      },
      orderBy: [{ courtId: "asc" }, { startAt: "asc" }],
    });

    return { tenant, slots };
  });

  if (!data) notFound();
  const { tenant, slots } = data;

  if (slots.length === 0) {
    redirect(ROUTES.tenant(tenantSlug));
  }

  const views: RentalSlotView[] = slots.map((s) => ({
    id: s.id,
    courtId: s.courtId,
    courtName: s.court.name,
    venueName: s.venue.name,
    startAt: s.startAt.toISOString(),
    endAt: s.endAt.toISOString(),
    status: s.status,
    isMine: session?.user?.id === s.bookedById && s.rentalBooking?.status === "CONFIRMED",
    cancelHoursBefore: s.cancelHoursBefore,
  }));

  return (
    <div>
      <section className="bg-brand-navy py-10 text-white sm:py-12">
        <div className="page-wrap">
          <Link
            href={ROUTES.tenant(tenantSlug)}
            className="text-xs font-bold text-brand-lime hover:underline"
          >
            ← 返回 {tenant.displayName}
          </Link>
          <h1 className="type-head mt-3 text-white">場地租借（30 天時段表）</h1>
          <p className="mt-2 text-sm text-white/80">
            未來 30 天各球場開放租借時段一覽，支援橫向捲動與球拍加租。
          </p>
        </div>
      </section>

      <div className="page-wrap py-12">
        <RentalCalendar slots={views} loggedIn={Boolean(session?.user)} />
      </div>
    </div>
  );
}
