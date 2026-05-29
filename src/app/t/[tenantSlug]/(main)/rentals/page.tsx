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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href={ROUTES.tenant(tenantSlug)} className="text-sm text-emerald-600">
        ← {tenant.displayName}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-800">場地租借</h1>
      <p className="mt-2 text-sm text-slate-600">未來 30 天各球場時段一覽（可橫向捲動）</p>
      <div className="mt-8">
        <RentalCalendar slots={views} loggedIn={Boolean(session?.user)} />
      </div>
    </div>
  );
}
