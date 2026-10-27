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
  "bg-white px-2 py-1 text-[14px] text-brand-navy";
const btnCls =
  "bg-brand-navy px-2.5 py-1 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy";
const subtleBtn =
  "bg-white px-2.5 py-1 text-[14px] font-bold text-brand-navy hover:bg-[var(--surface-alt)]";

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
      <details className="text-[14px]">
        <summary className="cursor-pointer font-bold text-brand-navy">開放時段</summary>
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
    <details className="text-[14px]">
      <summary className="cursor-pointer font-bold text-brand-navy">管理</summary>
      <div className="mt-1 space-y-2">
        {cell.dropIn && (
          <div className="bg-[var(--bg)] p-2">
            <p className="font-bold text-brand-navy">
              臨打 · {cell.dropIn.label}
              {!cell.dropIn.bookable && "（課程）"}
            </p>
            {cell.dropIn.bookings.length > 0 ? (
              <ul className="mt-1 space-y-1">
                {cell.dropIn.bookings.map((b) => (
                  <li key={b.bookingId} className="bg-white p-2">
                    <span className="font-bold text-brand-navy">{b.displayName}</span>
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
                      <input type="number" name="partySize" defaultValue={b.partySize} min={1} className={`${inputCls} w-12`} />
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
              <p className="text-[var(--muted)]">尚無報名</p>
            )}
            {cell.dropIn.bookable && (
              <form action={adminAddBooking} className="mt-2 space-y-1 border-t border-[var(--line)] pt-2">
                <HiddenCtx tenantSlug={tenantSlug} date={date} />
                <input type="hidden" name="activityId" value={cell.dropIn.activityId} />
                <input type="hidden" name="startTime" value={hourToTime(cell.hour)} />
                <input type="hidden" name="endTime" value={hourToTime(cell.hour, true)} />
                <MemberOrWalkin members={members} />
                <div className="flex gap-1">
                  <input type="number" name="partySize" defaultValue={1} min={1} className={`${inputCls} w-12`} />
                  <button type="submit" className={btnCls}>
                    代訂臨打
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {cell.rental && (
          <div className="bg-[var(--bg)] p-2">
            <p className="font-bold text-brand-navy">
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

        <form action={adminCreateSlot} className="flex flex-wrap items-end gap-1 border-t border-[var(--line)] pt-1">
          <HiddenCtx tenantSlug={tenantSlug} date={date} />
          <input type="hidden" name="courtId" value={court.courtId} />
          <input type="hidden" name="venueId" value={court.venueId} />
          <input type="hidden" name="startTime" value={hourToTime(cell.hour)} />
          <input type="hidden" name="endTime" value={hourToTime(cell.hour, true)} />
          <span className="text-[var(--muted)]">＋</span>
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
  if (cell.kind === "empty") return "bg-[var(--bg)]";
  if (cell.kind === "course") return "bg-[var(--surface-tint)]";
  if (cell.kind === "dupr") return "bg-[var(--surface-tint)]";
  if (cell.kind === "dual") return "bg-[var(--surface-alt)]";
  if (cell.kind === "drop-in") return "bg-brand-lime/30";
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
      <header className="bg-white p-6">
        <p className="text-[14px] font-bold text-[#1B6B73]">{dateLabel}</p>
        <h2 className="mt-1 text-[24px] font-black text-brand-navy">當日看板（管理）</h2>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          營業 {String(LOHO_BOARD_HOUR_START).padStart(2, "0")}:00–24:00，與前台相同每小時表。空白格可開放時段；點「管理」改報名。
        </p>
      </header>

      <div className="overflow-x-auto bg-white">
        <table className="w-full min-w-[720px] border-collapse text-[14px]">
          <thead>
            <tr className="bg-brand-navy text-white">
              <th className="sticky left-0 z-10 w-16 bg-brand-navy px-2 py-2.5 text-[14px] font-black">
                時
              </th>
              {columns.map((c) => (
                <th key={c.courtId} className="min-w-[180px] px-2 py-2.5 text-center font-black">
                  {c.courtName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map(({ hour, label }) => (
              <tr key={hour} className="border-t border-[var(--line)] align-top">
                <td className="sticky left-0 z-10 bg-white px-2 py-2 font-mono text-[14px] font-bold tabular-nums text-brand-navy">
                  {label}
                </td>
                {columns.map((col) => {
                  const cell = col.cells.find((c) => c.hour === hour)!;
                  return (
                    <td key={col.courtId} className={`p-2 ${cellBg(cell)}`}>
                      <p className="text-[14px] font-bold leading-tight text-brand-navy">
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
