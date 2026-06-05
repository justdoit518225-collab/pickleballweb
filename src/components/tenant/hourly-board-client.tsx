"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toTimeInputValue } from "@/lib/booking-display";
import { formatBoardHourWindow } from "@/lib/venue-timezone";
import type {
  HourlyCell,
  HourlyCellKind,
  HourlyCourtColumn,
  HourlyDropIn,
} from "@/lib/hourly-board";
import { ROUTES } from "@/lib/constants";

type BookingKind = "drop-in" | "rental";

type ModalState =
  | {
      mode: "booking-confirm";
      courtId: string;
      courtName: string;
      startHour: number;
      endHour: number;
      initialKind?: BookingKind;
    }
  | null;

function getCell(col: HourlyCourtColumn, hour: number) {
  return col.cells.find((c) => c.hour === hour)!;
}

function isRentalOpenCell(cell: HourlyCell) {
  return Boolean(cell.rental?.rentalOpen);
}

function hoursInRange(a: number, b: number) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const out: number[] = [];
  for (let h = lo; h <= hi; h++) out.push(h);
  return out;
}

function hourLabel(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function endHourLabel(endExclusive: number) {
  return endExclusive >= 24 ? "24:00" : hourLabel(endExclusive);
}

function resolveRentalSlotIds(
  col: HourlyCourtColumn,
  startHour: number,
  endHourInclusive: number,
): { ok: true; slotIds: string[] } | { ok: false; message: string } {
  if (endHourInclusive < startHour) {
    return { ok: false, message: "結束時間需晚於開始時間" };
  }
  const slotIds: string[] = [];
  for (const h of hoursInRange(startHour, endHourInclusive)) {
    const cell = getCell(col, h);
    if (!isRentalOpenCell(cell)) {
      return { ok: false, message: `${hourLabel(h)} 無法租用，請縮短或調整時間` };
    }
    slotIds.push(cell.rental!.slotId);
  }
  return { ok: true, slotIds };
}

function isDropInBookableCell(cell: HourlyCell) {
  return Boolean(
    cell.dropIn?.bookable && !cell.dropIn.isFull && !cell.dropIn.hasJoined,
  );
}

function getBookingOptions(
  col: HourlyCourtColumn,
  startHour: number,
  endHourInclusive: number,
) {
  if (endHourInclusive < startHour) {
    return { canDropIn: false, dropIn: null as HourlyDropIn | null, canRent: false };
  }

  let dropIn: HourlyDropIn | null = null;
  let canDropIn = true;
  let canRent = true;

  for (const h of hoursInRange(startHour, endHourInclusive)) {
    const cell = getCell(col, h);
    if (isDropInBookableCell(cell)) {
      if (!dropIn) {
        dropIn = cell.dropIn!;
      } else if (dropIn.activityId !== cell.dropIn!.activityId) {
        canDropIn = false;
      }
    } else {
      canDropIn = false;
    }
    if (!isRentalOpenCell(cell)) {
      canRent = false;
    }
  }

  return { canDropIn, dropIn, canRent };
}

function pickDefaultKind(
  options: ReturnType<typeof getBookingOptions>,
  preferred?: BookingKind,
): BookingKind | null {
  if (preferred === "drop-in" && options.canDropIn) return "drop-in";
  if (preferred === "rental" && options.canRent) return "rental";
  if (options.canDropIn) return "drop-in";
  if (options.canRent) return "rental";
  return null;
}

const kindStyles: Record<HourlyCellKind, string> = {
  empty: "border-slate-100 bg-slate-50/80 text-slate-400",
  "drop-in": "border-brand-teal/30 bg-brand-lime-soft/30 text-brand-navy",
  rental: "border-slate-200 bg-white text-slate-800",
  dual: "border-violet-200 bg-violet-50/50 text-slate-800",
  course: "border-blue-200 bg-blue-50/80 text-blue-900",
  dupr: "border-indigo-200 bg-indigo-50/80 text-indigo-900",
};

export function HourlyBoardClient({
  tenantSlug,
  dateLabel,
  columns,
  hours,
  loggedIn,
}: {
  tenantSlug: string;
  dateLabel: string;
  columns: HourlyCourtColumn[];
  hours: { hour: number; label: string }[];
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openBookingConfirm(
    courtId: string,
    courtName: string,
    startHour: number,
    endHour: number,
    initialKind?: BookingKind,
  ) {
    setError(null);
    setModal({
      mode: "booking-confirm",
      courtId,
      courtName,
      startHour,
      endHour,
      initialKind,
    });
  }

  async function callApi(path: string, body?: object) {
    setLoading(true);
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "操作失敗");
      return false;
    }
    setModal(null);
    router.refresh();
    return true;
  }

  function onCellClick(cell: HourlyCell, col: HourlyCourtColumn) {
    setError(null);
    const courtName = col.courtName;
    if (cell.kind === "empty") return;
    if (cell.kind === "course") return;
    if (cell.kind === "dupr") {
      if (cell.dropIn?.activityId) {
        window.location.href = ROUTES.tenantActivity(tenantSlug, cell.dropIn.activityId);
      }
      return;
    }
    if (!loggedIn) return;

    if (cell.kind === "dual" && cell.dropIn && cell.rental) {
      if (cell.dropIn.hasJoined) {
        void callApi(`/api/activities/${cell.dropIn.activityId}/cancel`);
        return;
      }
      if (cell.rental.isMineRental) {
        void callApi(`/api/rentals/${cell.rental.slotId}/cancel`);
        return;
      }
      openBookingConfirm(col.courtId, courtName, cell.hour, cell.hour);
      return;
    }

    if (cell.kind === "drop-in" && cell.dropIn) {
      if (cell.dropIn.hasJoined) {
        void callApi(`/api/activities/${cell.dropIn.activityId}/cancel`);
        return;
      }
      if (cell.dropIn.isFull) return;
      openBookingConfirm(col.courtId, courtName, cell.hour, cell.hour, "drop-in");
      return;
    }

    if (cell.kind === "rental" && cell.rental) {
      if (cell.rental.isMineRental) {
        void callApi(`/api/rentals/${cell.rental.slotId}/cancel`);
        return;
      }
      if (cell.rental.rentalOpen) {
        openBookingConfirm(col.courtId, courtName, cell.hour, cell.hour, "rental");
      }
    }
  }

  function cellClickable(cell: HourlyCell): boolean {
    if (cell.kind === "empty" || cell.kind === "course") return false;
    if (cell.kind === "dupr") return true;
    if (!loggedIn) return false;
    if (cell.kind === "dual") return Boolean(cell.dropIn?.bookable || cell.rental?.rentalOpen || cell.rental?.isMineRental);
    if (cell.kind === "drop-in" && cell.dropIn) {
      return cell.dropIn.hasJoined || !cell.dropIn.isFull;
    }
    if (cell.kind === "rental" && cell.rental) {
      return cell.rental.rentalOpen || cell.rental.isMineRental;
    }
    return false;
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-slate-500">{dateLabel}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">今日球場</h1>
        <p className="mt-1 text-sm text-slate-600">
          營業 09:00–24:00 · A → B → C。
          <span className="text-brand-teal">臨打</span>格可報名並查看名單；
          <span className="text-slate-700">租場</span>格可包場；兩者皆有時確認頁可切換。
        </p>
      </header>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 w-16 border-r border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-medium text-slate-500">
                時段
              </th>
              {columns.map((c) => (
                <th
                  key={c.courtId}
                  className="min-w-[148px] px-2 py-2 text-center text-sm font-bold text-brand-navy"
                >
                  {c.courtName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map(({ hour, label }) => (
              <tr key={hour} className="border-b border-slate-100 last:border-0">
                <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-2 py-1 text-xs font-medium tabular-nums text-slate-500">
                  {label}
                </td>
                {columns.map((col) => {
                  const cell = col.cells.find((c) => c.hour === hour)!;
                  const bookable =
                    loggedIn &&
                    (isRentalOpenCell(cell) || isDropInBookableCell(cell));
                  return (
                    <td key={col.courtId} className="p-1">
                      <button
                        type="button"
                        disabled={!cellClickable(cell) && !bookable}
                        onClick={() => onCellClick(cell, col)}
                        className={`flex min-h-[56px] w-full flex-col items-stretch rounded-lg border px-2 py-1.5 text-left transition hover:ring-2 hover:ring-brand-teal/40 disabled:cursor-default disabled:hover:ring-0 ${kindStyles[cell.kind]}`}
                      >
                        <CellContent cell={cell} loggedIn={loggedIn} bookable={bookable} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loggedIn && (
        <p className="text-center text-sm text-slate-600">
          <Link href="/login" className="font-medium text-brand-navy underline">
            登入
          </Link>
          後可報名臨打或租場
        </p>
      )}

      {modal?.mode === "booking-confirm" && (() => {
        const col = columns.find((c) => c.courtId === modal.courtId);
        if (!col) return null;
        return (
          <BookingConfirmModal
            courtName={modal.courtName}
            column={col}
            boardHours={hours.map((h) => h.hour)}
            initialStartHour={modal.startHour}
            initialEndHour={modal.endHour}
            initialKind={modal.initialKind}
            loading={loading}
            error={error}
            onClose={() => setModal(null)}
            onDropInSubmit={(activityId, body) =>
              callApi(`/api/activities/${activityId}/book`, body)
            }
            onRentalSubmit={(body) => callApi("/api/rentals/book-range", body)}
          />
        );
      })()}
    </div>
  );
}

function DropInRoster({
  dropIn,
  compact = false,
  maxItems,
}: {
  dropIn: HourlyDropIn;
  compact?: boolean;
  maxItems?: number;
}) {
  const limit = maxItems ?? (compact ? 2 : dropIn.entries.length);
  const shown = dropIn.entries.slice(0, limit);
  const rest = dropIn.entries.length - shown.length;

  return (
    <div className={compact ? "mt-0.5" : "mt-2"}>
      <p
        className={`font-medium text-brand-navy ${compact ? "text-[10px]" : "text-xs"}`}
      >
        臨打名單 {dropIn.headCount}/{dropIn.capacity} 人
        {dropIn.isFull ? " · 已滿" : ""}
      </p>
      {shown.length === 0 ? (
        <p className={`text-slate-400 ${compact ? "text-[10px]" : "text-xs"}`}>尚無報名</p>
      ) : (
        <ul className={`mt-0.5 space-y-0.5 ${compact ? "text-[10px]" : "text-xs"} text-slate-600`}>
          {shown.map((entry, i) => (
            <li key={`${entry.displayName}-${i}`} className="truncate">
              {entry.displayName}
              {entry.meta ? <span className="text-slate-400"> · {entry.meta}</span> : null}
            </li>
          ))}
          {rest > 0 && <li className="text-slate-400">還有 {rest} 人…</li>}
        </ul>
      )}
    </div>
  );
}

function CellContent({
  cell,
  loggedIn,
  bookable,
}: {
  cell: HourlyCell;
  loggedIn: boolean;
  bookable?: boolean;
}) {
  if (cell.kind === "empty") {
    return <span className="text-xs text-slate-400">—</span>;
  }

  if (cell.kind === "course" && cell.dropIn) {
    return (
      <>
        <span className="text-[10px] font-semibold text-blue-700">課程</span>
        <span className="text-xs font-medium">{cell.dropIn.label}</span>
        <span className="text-[10px] text-blue-600/80">僅供查看</span>
      </>
    );
  }

  if (cell.kind === "dupr" && cell.dropIn) {
    return (
      <>
        <span className="text-[10px] font-semibold text-indigo-700">DUPR</span>
        <span className="text-xs font-medium">{cell.dropIn.label}</span>
      </>
    );
  }

  if (cell.kind === "dual" && cell.dropIn && cell.rental) {
    return (
      <>
        <span className="text-[10px] font-semibold text-violet-700">臨打＋租場</span>
        <DropInRoster dropIn={cell.dropIn} compact maxItems={2} />
        <span className="mt-0.5 text-xs text-slate-600">
          租場 {cell.rental.isBooked ? cell.rental.label : "可租"}
        </span>
        {loggedIn && bookable && (
          <span className="mt-1 text-[10px] font-medium text-violet-700">點擊預約 →</span>
        )}
      </>
    );
  }

  if (cell.kind === "drop-in" && cell.dropIn) {
    return (
      <>
        <span className="text-[10px] font-semibold text-brand-teal">臨打</span>
        <span className="text-xs font-medium">{cell.dropIn.label}</span>
        <DropInRoster dropIn={cell.dropIn} compact maxItems={3} />
        {loggedIn && cell.dropIn.hasJoined && (
          <span className="text-[10px] text-brand-teal">已報名·點取消</span>
        )}
        {loggedIn && !cell.dropIn.hasJoined && bookable && (
          <span className="text-[10px] text-emerald-700">點擊報名 →</span>
        )}
      </>
    );
  }

  if (cell.kind === "rental" && cell.rental) {
    return (
      <>
        <span className="text-[10px] font-semibold text-slate-600">租場</span>
        <span className="text-xs font-medium">{cell.rental.label}</span>
        <span className="text-[10px] text-slate-400">此格僅開放租場</span>
        {loggedIn && cell.rental.rentalOpen && (
          <span className="text-[10px] text-emerald-700">
            {bookable ? "點擊租場，確認頁可調時間" : "點擊租場"}
          </span>
        )}
        {loggedIn && cell.rental.isMineRental && (
          <span className="text-[10px] text-slate-500">點擊取消</span>
        )}
      </>
    );
  }

  return null;
}

function ModalShell({
  title,
  subtitle,
  loading,
  error,
  onClose,
  children,
  onSubmit,
  submitLabel,
  submitDisabled,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel: string;
  submitDisabled?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400">
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-4">{children}</div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
            關閉
          </button>
          <button
            type="button"
            disabled={loading || submitDisabled}
            onClick={onSubmit}
            className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "處理中…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingConfirmModal({
  courtName,
  column,
  boardHours,
  initialStartHour,
  initialEndHour,
  initialKind,
  loading,
  error,
  onClose,
  onDropInSubmit,
  onRentalSubmit,
}: {
  courtName: string;
  column: HourlyCourtColumn;
  boardHours: number[];
  initialStartHour: number;
  initialEndHour: number;
  initialKind?: BookingKind;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onDropInSubmit: (
    activityId: string,
    body: {
      partySize: number;
      startTime: string;
      endTime: string;
      racketRental: number;
    },
  ) => void;
  onRentalSubmit: (body: { slotIds: string[]; racketRental: number }) => void;
}) {
  const [startHour, setStartHour] = useState(initialStartHour);
  const [endHour, setEndHour] = useState(initialEndHour);
  const [kind, setKind] = useState<BookingKind>(() => {
    const opts = getBookingOptions(column, initialStartHour, initialEndHour);
    return pickDefaultKind(opts, initialKind) ?? "rental";
  });
  const [partySize, setPartySize] = useState(1);
  const [racketRental, setRacketRental] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const options = getBookingOptions(column, startHour, endHour);
  const { canDropIn, dropIn, canRent } = options;

  const boardEndHour = 24;
  const maxStartHour = boardHours[boardHours.length - 1] ?? boardEndHour - 1;
  const endExclusiveOptions: number[] = [];
  for (let h = startHour + 1; h <= boardEndHour; h++) {
    endExclusiveOptions.push(h);
  }

  const hourCount = Math.max(0, endHour - startHour + 1);
  const windowLabel = formatBoardHourWindow(startHour, endHour);
  const displayError = localError ?? error;
  const remaining = dropIn ? Math.max(1, dropIn.capacity - dropIn.headCount) : 1;
  const activeKind =
    kind === "drop-in" && canDropIn
      ? "drop-in"
      : kind === "rental" && canRent
        ? "rental"
        : canDropIn
          ? "drop-in"
          : canRent
            ? "rental"
            : null;

  useEffect(() => {
    if (activeKind && activeKind !== kind) {
      setKind(activeKind);
    }
  }, [activeKind, kind]);

  useEffect(() => {
    if (partySize > remaining) {
      setPartySize(remaining);
    }
  }, [partySize, remaining]);

  function handleStartChange(nextStart: number) {
    setStartHour(nextStart);
    if (endHour < nextStart) setEndHour(nextStart);
    setLocalError(null);
  }

  function handleEndExclusiveChange(endExclusive: number) {
    setEndHour(endExclusive - 1);
    setLocalError(null);
  }

  function handleSubmit() {
    if (!activeKind) {
      setLocalError("此時段無法預約臨打或租場，請調整時間");
      return;
    }

    if (activeKind === "rental") {
      const resolved = resolveRentalSlotIds(column, startHour, endHour);
      if (!resolved.ok) {
        setLocalError(resolved.message);
        return;
      }
      onRentalSubmit({ slotIds: resolved.slotIds, racketRental });
      return;
    }

    if (!dropIn) {
      setLocalError("找不到臨打活動，請調整時間");
      return;
    }

    const startTime = hourLabel(startHour);
    const endTime = endHourLabel(endHour + 1);
    const minTime = toTimeInputValue(dropIn.startAt);
    const maxTime = toTimeInputValue(dropIn.endAt);
    if (startTime < minTime || endTime > maxTime) {
      setLocalError(`臨打開放時段為 ${minTime}–${maxTime}，請調整時間`);
      return;
    }

    onDropInSubmit(dropIn.activityId, {
      partySize,
      startTime,
      endTime,
      racketRental,
    });
  }

  const submitLabel =
    activeKind === "drop-in"
      ? partySize > 1
        ? `確認報名 ${partySize} 人`
        : "確認報名臨打"
      : hourCount > 1
        ? `確認租場 ${hourCount} 小時`
        : "確認租場";

  return (
    <ModalShell
      title="確認預約"
      subtitle={`${courtName} · ${windowLabel}`}
      loading={loading}
      error={displayError}
      onClose={onClose}
      submitLabel={submitLabel}
      onSubmit={handleSubmit}
      submitDisabled={!activeKind}
    >
      {canDropIn && canRent ? (
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => {
              setKind("drop-in");
              setLocalError(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeKind === "drop-in"
                ? "bg-brand-teal text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            臨打
            {dropIn?.detail ? (
              <span className="mt-0.5 block text-[10px] font-normal opacity-90">
                {dropIn.detail}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => {
              setKind("rental");
              setLocalError(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeKind === "rental"
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            租場
            <span className="mt-0.5 block text-[10px] font-normal opacity-90">整面球場</span>
          </button>
        </div>
      ) : activeKind === "drop-in" && dropIn ? (
        <div className="space-y-2">
          <p className="rounded-lg bg-brand-lime-soft/40 px-3 py-2 text-sm text-brand-navy">
            臨打 · {dropIn.label}
          </p>
          <DropInRoster dropIn={dropIn} />
        </div>
      ) : activeKind === "rental" ? (
        <div className="space-y-2">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">租場 · 整面球場預約</p>
          {!canDropIn && (
            <p className="text-xs text-slate-500">
              此時段目前僅開放租場。臨打需館方在後台開放，或聯繫櫃台。
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-amber-700">此時段目前無法預約，請調整開始或結束時間。</p>
      )}

      <p className="text-sm text-slate-600">
        可調整時段（每小時一格）。目前為 <strong>{windowLabel}</strong>
        {hourCount > 1 ? `，共 ${hourCount} 小時` : ""}。
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">開始時間</label>
          <select
            value={startHour}
            onChange={(e) => handleStartChange(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            {boardHours
              .filter((h) => h <= maxStartHour)
              .map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">結束時間</label>
          <select
            value={endHour + 1}
            onChange={(e) => handleEndExclusiveChange(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            {endExclusiveOptions.map((h) => (
              <option key={h} value={h}>
                {endHourLabel(h)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeKind === "drop-in" && (
        <div>
          <label className="block text-sm font-medium text-slate-700">人數</label>
          <select
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            {Array.from({ length: remaining }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} 人
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">租借球拍（支）</label>
        <select
          value={racketRental}
          onChange={(e) => setRacketRental(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value={0}>不需要</option>
          {(activeKind === "drop-in"
            ? Array.from({ length: partySize }, (_, i) => i + 1)
            : [1, 2, 3, 4]
          ).map((n) => (
            <option key={n} value={n}>
              {n} 支
            </option>
          ))}
        </select>
      </div>
    </ModalShell>
  );
}
