"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatBoardHourWindow } from "@/lib/venue-timezone";
import type {
  HourlyCell,
  HourlyCellKind,
  HourlyCourtColumn,
  HourlyDropIn,
  HourlyRental,
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

function resolveDropInActivities(
  col: HourlyCourtColumn,
  startHour: number,
  endHourInclusive: number,
):
  | {
      ok: true;
      activityIds: string[];
      dropIn: HourlyDropIn;
      minRemaining: number;
      hourCount: number;
    }
  | { ok: false; message: string } {
  if (endHourInclusive < startHour) {
    return { ok: false, message: "結束時間需晚於開始時間" };
  }

  const activityIds: string[] = [];
  let dropIn: HourlyDropIn | null = null;
  let minRemaining = Number.POSITIVE_INFINITY;

  for (const h of hoursInRange(startHour, endHourInclusive)) {
    const cell = getCell(col, h);
    if (!isDropInBookableCell(cell)) {
      return { ok: false, message: `${hourLabel(h)} 無法報名臨打，請縮短或調整時間` };
    }
    const d = cell.dropIn!;
    activityIds.push(d.activityId);
    if (!dropIn) dropIn = d;
    minRemaining = Math.min(minRemaining, d.capacity - d.headCount);
  }

  return {
    ok: true,
    activityIds,
    dropIn: dropIn!,
    minRemaining,
    hourCount: activityIds.length,
  };
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

  function onDropInClick(cell: HourlyCell, col: HourlyCourtColumn) {
    if (!loggedIn || !cell.dropIn) return;
    setError(null);
    if (cell.dropIn.hasJoined) {
      void callApi(`/api/activities/${cell.dropIn.activityId}/cancel`);
      return;
    }
    if (!cell.dropIn.bookable || cell.dropIn.isFull) return;
    openBookingConfirm(col.courtId, col.courtName, cell.hour, cell.hour, "drop-in");
  }

  function onRentalClick(cell: HourlyCell, col: HourlyCourtColumn) {
    if (!loggedIn || !cell.rental) return;
    setError(null);
    if (cell.rental.isMineRental) {
      void callApi(`/api/rentals/${cell.rental.slotId}/cancel`);
      return;
    }
    if (!cell.rental.rentalOpen) return;
    openBookingConfirm(col.courtId, col.courtName, cell.hour, cell.hour, "rental");
  }

  function onSpecialCellClick(cell: HourlyCell) {
    if (cell.kind === "dupr" && cell.dropIn?.activityId) {
      window.location.href = ROUTES.tenantActivity(tenantSlug, cell.dropIn.activityId);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-slate-500">{dateLabel}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">今日球場</h1>
        <p className="mt-1 text-sm text-slate-600">
          營業 09:00–24:00 · A → B → C。每格左側為
          <span className="text-brand-teal">臨打</span>、右側為
          <span className="text-slate-700">租場</span>；確認頁可調整多小時。
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
                  className="min-w-[220px] px-2 py-2 text-center text-sm font-bold text-brand-navy"
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
                  return (
                    <td key={col.courtId} className="p-1">
                      <CourtCell
                        cell={cell}
                        loggedIn={loggedIn}
                        onDropInClick={() => onDropInClick(cell, col)}
                        onRentalClick={() => onRentalClick(cell, col)}
                        onSpecialClick={() => onSpecialCellClick(cell)}
                      />
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
            onDropInSubmit={(body) => callApi("/api/activities/book-range", body)}
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

function CourtCell({
  cell,
  loggedIn,
  onDropInClick,
  onRentalClick,
  onSpecialClick,
}: {
  cell: HourlyCell;
  loggedIn: boolean;
  onDropInClick: () => void;
  onRentalClick: () => void;
  onSpecialClick: () => void;
}) {
  if (cell.kind === "empty") {
    return (
      <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-slate-100 bg-slate-50/80 px-2 text-xs text-slate-400">
        —
      </div>
    );
  }

  if (cell.kind === "course" && cell.dropIn) {
    return (
      <div className={`min-h-[80px] rounded-lg border px-2 py-1.5 ${kindStyles.course}`}>
        <span className="text-[10px] font-semibold text-blue-700">課程</span>
        <span className="block text-xs font-medium">{cell.dropIn.label}</span>
        <span className="text-[10px] text-blue-600/80">僅供查看</span>
      </div>
    );
  }

  if (cell.kind === "dupr" && cell.dropIn) {
    return (
      <button
        type="button"
        onClick={onSpecialClick}
        className={`min-h-[80px] w-full rounded-lg border px-2 py-1.5 text-left transition hover:ring-2 hover:ring-indigo-300 ${kindStyles.dupr}`}
      >
        <span className="text-[10px] font-semibold text-indigo-700">DUPR</span>
        <span className="block text-xs font-medium">{cell.dropIn.label}</span>
      </button>
    );
  }

  const showDropIn = Boolean(cell.dropIn);
  const showRental = Boolean(cell.rental);

  return (
    <div
      className={`flex min-h-[80px] w-full divide-x overflow-hidden rounded-lg border ${kindStyles[cell.kind]}`}
    >
      <DropInHalf
        dropIn={showDropIn ? cell.dropIn : null}
        loggedIn={loggedIn}
        onClick={onDropInClick}
      />
      <RentalHalf
        rental={showRental ? cell.rental : null}
        loggedIn={loggedIn}
        onClick={onRentalClick}
      />
    </div>
  );
}

function DropInHalf({
  dropIn,
  loggedIn,
  onClick,
}: {
  dropIn: HourlyDropIn | null;
  loggedIn: boolean;
  onClick: () => void;
}) {
  const canBook = Boolean(dropIn?.bookable && !dropIn.isFull && !dropIn.hasJoined);
  const canCancel = Boolean(loggedIn && dropIn?.hasJoined);
  const interactive = canBook || canCancel;

  if (!dropIn) {
    return (
      <div className="flex min-w-0 flex-1 flex-col justify-center bg-slate-50/50 px-1.5 py-1 text-[10px] text-slate-300">
        臨打
        <span className="mt-0.5">—</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!interactive && !loggedIn}
      onClick={interactive ? onClick : undefined}
      className={`flex min-w-0 flex-1 flex-col items-stretch px-1.5 py-1 text-left transition ${
        interactive ? "cursor-pointer bg-brand-lime-soft/25 hover:bg-brand-lime-soft/45" : "bg-brand-lime-soft/15"
      } disabled:cursor-default`}
    >
      <span className="text-[10px] font-semibold text-brand-teal">臨打</span>
      <DropInRoster dropIn={dropIn} compact maxItems={2} />
      {loggedIn && dropIn.hasJoined && (
        <span className="mt-auto text-[10px] font-medium text-brand-teal">已報名·點取消</span>
      )}
      {loggedIn && canBook && (
        <span className="mt-auto text-[10px] text-emerald-700">點擊報名 →</span>
      )}
      {dropIn.isFull && !dropIn.hasJoined && (
        <span className="mt-auto text-[10px] text-amber-700">已滿</span>
      )}
    </button>
  );
}

function RentalHalf({
  rental,
  loggedIn,
  onClick,
}: {
  rental: HourlyRental | null;
  loggedIn: boolean;
  onClick: () => void;
}) {
  const canBook = Boolean(rental?.rentalOpen);
  const canCancel = Boolean(loggedIn && rental?.isMineRental);
  const interactive = canBook || canCancel;

  if (!rental) {
    return (
      <div className="flex min-w-0 flex-1 flex-col justify-center bg-slate-50/50 px-1.5 py-1 text-[10px] text-slate-300">
        租場
        <span className="mt-0.5">—</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!interactive && !loggedIn}
      onClick={interactive ? onClick : undefined}
      className={`flex min-w-0 flex-1 flex-col items-stretch px-1.5 py-1 text-left transition ${
        interactive ? "cursor-pointer bg-white hover:bg-slate-50" : "bg-white/80"
      } disabled:cursor-default`}
    >
      <span className="text-[10px] font-semibold text-slate-600">租場</span>
      <span className="text-xs font-medium">{rental.label}</span>
      {rental.isBooked && !rental.isMineRental && (
        <span className="text-[10px] text-slate-500">已被預約</span>
      )}
      {loggedIn && canBook && (
        <span className="mt-auto text-[10px] text-emerald-700">點擊租場 →</span>
      )}
      {loggedIn && canCancel && (
        <span className="mt-auto text-[10px] text-slate-500">點擊取消</span>
      )}
    </button>
  );
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
  onDropInSubmit: (body: {
    activityIds: string[];
    partySize: number;
    racketRental: number;
  }) => void;
  onRentalSubmit: (body: { slotIds: string[]; racketRental: number }) => void;
}) {
  const [startHour, setStartHour] = useState(initialStartHour);
  const [endHour, setEndHour] = useState(initialEndHour);
  const [kind, setKind] = useState<BookingKind>(initialKind ?? "drop-in");
  const [partySize, setPartySize] = useState(1);
  const [racketRental, setRacketRental] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const dropInResult = resolveDropInActivities(column, startHour, endHour);
  const rentalResult = resolveRentalSlotIds(column, startHour, endHour);
  const canDropIn = dropInResult.ok;
  const canRent = rentalResult.ok;
  const dropIn = dropInResult.ok ? dropInResult.dropIn : null;
  const dropInHourCount = dropInResult.ok ? dropInResult.hourCount : 0;

  const boardEndHour = 24;
  const maxStartHour = boardHours[boardHours.length - 1] ?? boardEndHour - 1;
  const endExclusiveOptions: number[] = [];
  for (let h = startHour + 1; h <= boardEndHour; h++) {
    endExclusiveOptions.push(h);
  }

  const hourCount = Math.max(0, endHour - startHour + 1);
  const windowLabel = formatBoardHourWindow(startHour, endHour);
  const displayError = localError ?? error;
  const remaining = dropInResult.ok
    ? Math.max(1, dropInResult.minRemaining)
    : 1;
  const activeKind =
    kind === "drop-in" && canDropIn
      ? "drop-in"
      : kind === "rental" && canRent
        ? "rental"
        : null;

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
      if (!rentalResult.ok) {
        setLocalError(rentalResult.message);
        return;
      }
      onRentalSubmit({ slotIds: rentalResult.slotIds, racketRental });
      return;
    }

    if (!dropInResult.ok) {
      setLocalError(dropInResult.message);
      return;
    }

    onDropInSubmit({
      activityIds: dropInResult.activityIds,
      partySize,
      racketRental,
    });
  }

  const submitLabel =
    activeKind === "drop-in"
      ? partySize > 1
        ? dropInHourCount > 1
          ? `確認報名 ${partySize} 人 · ${dropInHourCount} 小時`
          : `確認報名 ${partySize} 人`
        : dropInHourCount > 1
          ? `確認報名臨打 ${dropInHourCount} 小時`
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
            {canDropIn ? (
              <span className="mt-0.5 block text-[10px] font-normal opacity-90">
                {dropInHourCount > 1 ? `可連續 ${dropInHourCount} 小時` : "可報名"}
              </span>
            ) : (
              <span className="mt-0.5 block text-[10px] font-normal opacity-90">此範圍不可報名</span>
            )}
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
            <span className="mt-0.5 block text-[10px] font-normal opacity-90">
              {canRent ? (hourCount > 1 ? `可連續 ${hourCount} 小時` : "整面球場") : "此範圍不可租"}
            </span>
          </button>
        </div>
      ) : activeKind === "drop-in" && dropIn ? (
        <div className="space-y-2">
          <p className="rounded-lg bg-brand-lime-soft/40 px-3 py-2 text-sm text-brand-navy">
            臨打 · {dropIn.label}
            {dropInHourCount > 1 ? `（${dropInHourCount} 個時段）` : ""}
          </p>
          <DropInRoster dropIn={dropIn} />
        </div>
      ) : activeKind === "rental" ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          租場 · 整面球場預約
          {hourCount > 1 ? `（${hourCount} 小時）` : ""}
        </p>
      ) : kind === "drop-in" && !canDropIn ? (
        <p className="text-sm text-amber-700">
          所選時段中有無法報名臨打的格子，請縮短範圍或改選租場。
        </p>
      ) : kind === "rental" && !canRent ? (
        <p className="text-sm text-amber-700">
          所選時段中有無法租用的格子，請縮短範圍或改選臨打。
        </p>
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
