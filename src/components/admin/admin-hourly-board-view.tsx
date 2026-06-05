import {
  adminAddBooking,
  adminAssignRental,
  adminCancelBooking,
  adminCancelRental,
  adminCreateSlot,
  adminMoveBooking,
  adminUpdateBooking,
} from "@/app/admin/[tenantSlug]/board/actions";
import type {
  AdminHourlyCell,
  AdminHourlyCourtColumn,
  AdminMemberOption,
  AdminMoveTarget,
} from "@/lib/hourly-board";
import { LOHO_BOARD_HOUR_END, LOHO_BOARD_HOUR_START } from "@/lib/hourly-board";

const inputCls =
  "rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs";
const btnCls =
  "rounded-lg bg-brand-navy px-2 py-1 text-xs font-medium text-white hover:opacity-90";
const subtleBtn =
  "rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50";

function HiddenCtx({
  tenantSlug,
  date,
}: {
  tenantSlug: string;
  date: string;
}) {
  return (
    <>
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="date" value={date} />
    </>
  );
}

function hourToTime(h: number, end = false): string {
  const v = end ? (h >= LOHO_BOARD_HOUR_END - 1 ? 24 : h + 1) : h;
  return `${String(v).padStart(2, "0")}:00`;
}

function MemberOrWalkin({ members }: { members: AdminMemberOption[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <select name="memberUserId" className={inputCls} defaultValue="">
        <option value="">會員</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name}
          </option>
        ))}
      </select>
      <input type="text" name="walkinName" placeholder="姓名" className={`${inputCls} w-20`} />
    </div>
  );
}

function AdminCellPanel({
  cell,
  court,
  ctx,
}: {
  cell: AdminHourlyCell;
  court: AdminHourlyCourtColumn;
  ctx: {
    tenantSlug: string;
    date: string;
    members: AdminMemberOption[];
    moveTargets: AdminMoveTarget[];
  };
}) {
  const { tenantSlug, date, members, moveTargets } = ctx;

  if (cell.kind === "empty") {
    return (
      <details className="text-xs">
        <summary className="cursor-pointer text-brand-navy">開放時段</summary>
        <form action={adminCreateSlot} className="mt-1 flex flex-wrap items-end gap-1">
          <HiddenCtx tenantSlug={tenantSlug} date={date} />
          <input type="hidden" name="courtId" value={court.courtId} />
          <input type="hidden" name="venueId" value={court.venueId} />
          <input type="hidden" name="startTime" value={hourToTime(cell.hour)} />
          <input type="hidden" name="endTime" value={hourToTime(cell.hour, true)} />
          <select name="kind" className={inputCls} defaultValue="open-play">
            <option value="open-play">臨打</option>
            <option value="rental">租場</option>
          </select>
          <input type="number" name="capacity" defaultValue={4} min={1} className={`${inputCls} w-12`} title="臨打容量" />
          <button type="submit" className={btnCls}>
            建立
          </button>
        </form>
      </details>
    );
  }

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-brand-navy">管理</summary>
      <div className="mt-1 space-y-2">
        {cell.dropIn && (
          <div className="rounded border border-brand-teal/20 bg-brand-lime-soft/20 p-1.5">
            <p className="font-medium text-brand-navy">
              臨打 · {cell.dropIn.label}
              {!cell.dropIn.bookable && "（課程）"}
            </p>
            {cell.dropIn.bookings.length > 0 ? (
              <ul className="mt-1 space-y-1">
                {cell.dropIn.bookings.map((b) => (
                  <li key={b.bookingId} className="rounded bg-white/80 p-1">
                    <span className="font-medium">{b.displayName}</span>
                    {b.partySize > 1 && ` +${b.partySize - 1}`}
                    <div className="mt-1 flex flex-wrap gap-1">
                      <form action={adminCancelBooking}>
                        <HiddenCtx tenantSlug={tenantSlug} date={date} />
                        <input type="hidden" name="bookingId" value={b.bookingId} />
                        <button type="submit" className={subtleBtn}>
                          取消
                        </button>
                      </form>
                    </div>
                    <form action={adminUpdateBooking} className="mt-1 flex flex-wrap gap-1">
                      <HiddenCtx tenantSlug={tenantSlug} date={date} />
                      <input type="hidden" name="bookingId" value={b.bookingId} />
                      <input type="number" name="partySize" defaultValue={b.partySize} min={1} className={`${inputCls} w-10`} />
                      <input type="time" name="startTime" defaultValue={b.startTime} className={inputCls} />
                      <input type="time" name="endTime" defaultValue={b.endTime} className={inputCls} />
                      <button type="submit" className={btnCls}>
                        改
                      </button>
                    </form>
                    <form action={adminMoveBooking} className="mt-1 flex gap-1">
                      <HiddenCtx tenantSlug={tenantSlug} date={date} />
                      <input type="hidden" name="bookingId" value={b.bookingId} />
                      <select name="targetActivityId" className={inputCls} defaultValue={cell.dropIn!.activityId}>
                        {moveTargets.map((t) => (
                          <option key={t.activityId} value={t.activityId}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className={subtleBtn}>
                        換場
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">尚無報名</p>
            )}
            {cell.dropIn.bookable && (
              <form action={adminAddBooking} className="mt-1 space-y-1 border-t border-brand-teal/20 pt-1">
                <HiddenCtx tenantSlug={tenantSlug} date={date} />
                <input type="hidden" name="activityId" value={cell.dropIn.activityId} />
                <input type="hidden" name="startTime" value={hourToTime(cell.hour)} />
                <input type="hidden" name="endTime" value={hourToTime(cell.hour, true)} />
                <MemberOrWalkin members={members} />
                <div className="flex gap-1">
                  <input type="number" name="partySize" defaultValue={1} min={1} className={`${inputCls} w-10`} />
                  <button type="submit" className={btnCls}>
                    代訂臨打
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {cell.rental && (
          <div className="rounded border border-slate-200 bg-slate-50 p-1.5">
            <p className="font-medium">
              租場 · {cell.rental.isBooked ? cell.rental.label : "可租"}
            </p>
            {cell.rental.isBooked ? (
              <form action={adminCancelRental} className="mt-1">
                <HiddenCtx tenantSlug={tenantSlug} date={date} />
                <input type="hidden" name="slotId" value={cell.rental.slotId} />
                <button type="submit" className={subtleBtn}>
                  釋出租場
                </button>
              </form>
            ) : (
              <form action={adminAssignRental} className="mt-1 space-y-1">
                <HiddenCtx tenantSlug={tenantSlug} date={date} />
                <input type="hidden" name="slotId" value={cell.rental.slotId} />
                <MemberOrWalkin members={members} />
                <button type="submit" className={btnCls}>
                  代訂租場
                </button>
              </form>
            )}
          </div>
        )}

        <form action={adminCreateSlot} className="flex flex-wrap items-end gap-1 border-t border-slate-100 pt-1">
          <HiddenCtx tenantSlug={tenantSlug} date={date} />
          <input type="hidden" name="courtId" value={court.courtId} />
          <input type="hidden" name="venueId" value={court.venueId} />
          <input type="hidden" name="startTime" value={hourToTime(cell.hour)} />
          <input type="hidden" name="endTime" value={hourToTime(cell.hour, true)} />
          <span className="text-slate-400">＋</span>
          <select name="kind" className={inputCls}>
            <option value="open-play">臨打</option>
            <option value="rental">租場</option>
          </select>
          <button type="submit" className={subtleBtn}>
            加開
          </button>
        </form>
      </div>
    </details>
  );
}

function cellSummary(cell: AdminHourlyCell): string {
  if (cell.kind === "empty") return "—";
  const parts: string[] = [];
  if (cell.dropIn) {
    parts.push(
      cell.dropIn.bookable
        ? `臨打 ${cell.dropIn.headCount}/${cell.dropIn.capacity}`
        : `課程 ${cell.dropIn.label}`,
    );
  }
  if (cell.rental) {
    parts.push(cell.rental.isBooked ? `租:${cell.rental.label}` : "租:可租");
  }
  return parts.join(" · ") || "—";
}

function cellBg(cell: AdminHourlyCell): string {
  if (cell.kind === "empty") return "bg-slate-50";
  if (cell.kind === "course") return "bg-blue-50/80";
  if (cell.kind === "dupr") return "bg-indigo-50/80";
  if (cell.kind === "dual") return "bg-violet-50/50";
  if (cell.kind === "drop-in") return "bg-brand-lime-soft/25";
  if (cell.kind === "rental") return "bg-white";
  return "bg-white";
}

export function AdminHourlyBoardView({
  tenantSlug,
  date,
  dateLabel,
  columns,
  hours,
  members,
  moveTargets,
}: {
  tenantSlug: string;
  date: string;
  dateLabel: string;
  columns: AdminHourlyCourtColumn[];
  hours: { hour: number; label: string }[];
  members: AdminMemberOption[];
  moveTargets: AdminMoveTarget[];
}) {
  const ctx = { tenantSlug, date, members, moveTargets };

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-slate-500">{dateLabel}</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">當日看板（管理）</h2>
        <p className="mt-1 text-sm text-slate-600">
          營業 {String(LOHO_BOARD_HOUR_START).padStart(2, "0")}:00–24:00，與前台相同每小時表。空白格可開放時段；點「管理」改報名。
        </p>
      </header>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 w-14 border-r border-slate-200 bg-slate-50 px-1 py-2 text-xs text-slate-500">
                時
              </th>
              {columns.map((c) => (
                <th key={c.courtId} className="min-w-[180px] px-1 py-2 text-center font-bold text-brand-navy">
                  {c.courtName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map(({ hour, label }) => (
              <tr key={hour} className="border-b border-slate-100 align-top">
                <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-1 py-1 text-xs tabular-nums text-slate-500">
                  {label}
                </td>
                {columns.map((col) => {
                  const cell = col.cells.find((c) => c.hour === hour)!;
                  return (
                    <td key={col.courtId} className={`p-1 ${cellBg(cell)}`}>
                      <p className="text-[11px] font-medium leading-tight text-slate-800">
                        {cellSummary(cell)}
                      </p>
                      <AdminCellPanel cell={cell} court={col} ctx={ctx} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
