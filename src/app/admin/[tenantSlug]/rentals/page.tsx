import Link from "next/link";
import { createRentalSlots } from "@/app/admin/[tenantSlug]/rental-actions";
import { RentalRangeDeleteForm } from "@/components/admin/rental-range-delete-form";
import { RentalSlotsList, type RentalSlotRow } from "@/components/admin/rental-slots-list";
import { requireTenantStaff } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";
import { toDatetimeLocalValue } from "@/lib/datetime";

export default async function AdminRentalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ created?: string; deleted?: string; blocked?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const { created, deleted, blocked, error } = await searchParams;
  const { tenant } = await requireTenantStaff(tenantSlug);

  const courts = await prisma.court.findMany({
    where: { venue: { tenantId: tenant.id, isActive: true }, isActive: true },
    include: { venue: true },
    orderBy: [{ venue: { name: "asc" } }, { sortOrder: "asc" }],
  });

  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 30);

  const [upcoming, slots] = await Promise.all([
    prisma.rentalSlot.count({
      where: { tenantId: tenant.id, startAt: { gte: from, lt: to } },
    }),
    prisma.rentalSlot.findMany({
      where: { tenantId: tenant.id, startAt: { gte: from, lt: to } },
      include: { court: true, venue: true, bookedBy: { select: { email: true, name: true } } },
      orderBy: { startAt: "asc" },
      take: 100,
    }),
  ]);

  const courtOptions = courts.map((c) => ({
    id: c.id,
    label: `${c.venue.name} · ${c.name}`,
  }));

  const slotRows: RentalSlotRow[] = slots.map((s) => ({
    id: s.id,
    startLabel: s.startAt.toLocaleString("zh-TW"),
    venueName: s.venue.name,
    courtName: s.court.name,
    status: s.status,
    bookedByLabel: s.bookedBy ? (s.bookedBy.name ?? s.bookedBy.email) : null,
  }));

  const today = toDatetimeLocalValue(from).slice(0, 10);
  const monthLater = toDatetimeLocalValue(to).slice(0, 10);

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        未來 30 天共 {upcoming} 個時段 ·{" "}
        <Link href={ROUTES.tenantRentals(tenantSlug)} className="text-emerald-600">
          前台月曆
        </Link>
      </p>
      {created && <p className="text-sm text-emerald-600">已新增 {created} 個開放時段</p>}
      {deleted && <p className="text-sm text-emerald-600">已刪除 {deleted} 個時段</p>}
      {blocked && <p className="text-sm text-amber-700">已封鎖 {blocked} 個時段</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <form
        action={createRentalSlots.bind(null, tenantSlug)}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
      >
        <h2 className="font-semibold text-slate-800">批次建立開放時段</h2>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">球場（可多選）</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {courts.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="courtIds" value={c.id} className="rounded" />
                {c.venue.name} · {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">開始日期</label>
            <input type="date" name="startDate" required defaultValue={today} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">結束日期</label>
            <input type="date" name="endDate" required defaultValue={monthLater} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">每日開始</label>
            <input type="time" name="slotStart" required defaultValue="08:00" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">每日結束</label>
            <input type="time" name="slotEnd" required defaultValue="10:00" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">取消：開始前幾小時</label>
            <input type="number" name="cancelHoursBefore" min={0} defaultValue={4} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
          建立時段
        </button>
      </form>

      <RentalRangeDeleteForm
        tenantSlug={tenantSlug}
        courts={courtOptions}
        defaultStartDate={today}
        defaultEndDate={monthLater}
      />

      <section>
        <h2 className="font-semibold text-slate-800">近期時段</h2>
        <p className="mt-1 text-sm text-slate-500">
          顯示未來 30 天內最多 100 筆；可勾選後批量刪除／封鎖，或使用上方「依區間批量刪除」。
        </p>
        <RentalSlotsList tenantSlug={tenantSlug} slots={slotRows} />
      </section>
    </div>
  );
}
