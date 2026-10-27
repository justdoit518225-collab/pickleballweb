"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  empty: "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]",
  "drop-in": "border-brand-teal/35 bg-brand-lime-soft/45 text-brand-navy",
  rental: "border-[var(--border)] bg-[var(--surface)] text-brand-navy",
  dual: "border-brand-teal/40 bg-[var(--surface)] text-brand-navy",
  course: "border-brand-teal bg-brand-teal-soft text-brand-navy",
  dupr: "border-brand-navy bg-brand-navy text-white",
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
      router.push(ROUTES.tenantActivity(tenantSlug, cell.dropIn.activityId));
    }
  }

  return (
    <div className="space-y-5" data-ui>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold text-brand-teal tabular-nums">{dateLabel}</p>
          <h2 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">
            今日球場矩陣看板
          </h2>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            營業 09:00–24:00 · 每格左半為
            <span className="mx-1 font-extrabold text-brand-teal">臨打球敘</span>、右半為
            <span className="mx-1 font-extrabold text-brand-navy">整場租借</span>；點擊時段可選擇連續多小時預約。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5 bg-brand-lime-soft px-2.5 py-1 text-brand-navy">
            <span className="h-2.5 w-2.5 bg-brand-teal" /> 臨打可報名
          </span>
          <span className="inline-flex items-center gap-1.5 bg-[var(--surface)] px-2.5 py-1 text-brand-navy">
            <span className="h-2.5 w-2.5 bg-brand-navy" /> 租場可預約
          </span>
          <span className="inline-flex items-center gap-1.5 bg-brand-lime px-2.5 py-1 text-brand-navy">
            已報名 / 我的預約
          </span>
        </div>
      </header>

      <div className="overflow-x-auto border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="bg-brand-navy text-white">
              <th className="sticky left-0 z-10 w-18 border-r border-white/15 bg-brand-navy px-3 py-3 text-left text-xs font-extrabold tracking-wide text-brand-lime">
                時段
              </th>
              {columns.map((c) => (
                <th
                  key={c.courtId}
                  className="min-w-[230px] border-r border-white/15 px-3 py-3 text-center text-sm font-extrabold text-white last:border-r-0"
                >
                  {c.courtName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map(({ hour, label }) => (
              <tr key={hour} className="border-b border-[var(--border)] last:border-0">
                <td className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-extrabold text-brand-navy tabular-nums">
                  {label}
                </td>
                {columns.map((col) => {
                  const cell = col.cells.find((c) => c.hour === hour)!;
                  return (
                    <td key={col.courtId} className="p-1.5">
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
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] p-4 text-sm">
          <span className="font-semibold text-[var(--muted)]">
            登入會員後即可直接在看板上報名臨打或預約整面球場。
          </span>
          <Link href="/login" className="btn-brand">
            Google / LINE 登入 →
          </Link>
        </div>
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
        className={`font-bold text-brand-navy tabular-nums ${compact ? "text-[11px]" : "text-xs"}`}
      >
        名單 {dropIn.headCount}/{dropIn.capacity} 人
        {dropIn.isFull ? " · 已滿" : ""}
      </p>
      {shown.length === 0 ? (
        <p className={`text-[var(--muted)] ${compact ? "text-[10px]" : "text-xs"}`}>尚無報名</p>
      ) : (
        <ul className={`mt-0.5 space-y-0.5 ${compact ? "text-[10px]" : "text-xs"} text-brand-navy/85`}>
          {shown.map((entry, i) => (
            <li key={`${entry.displayName}-${i}`} className="truncate font-medium">
              {entry.displayName}
              {entry.meta ? <span className="text-[var(--muted)]"> · {entry.meta}</span> : null}
            </li>
          ))}
          {rest > 0 && <li className="text-[var(--muted)]">還有 {rest} 人…</li>}
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
      <div className="flex min-h-[82px] items-center justify-center border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--muted)]">
        —
      </div>
    );
  }

  if (cell.kind === "course" && cell.dropIn) {
    return (
      <div className={`min-h-[82px] border px-2.5 py-2 ${kindStyles.course}`}>
        <span className="inline-block bg-brand-teal px-1.5 py-0.5 text-[10px] font-extrabold text-white">
          教練課程
        </span>
        <span className="mt-1 block text-xs font-extrabold text-brand-navy">{cell.dropIn.label}</span>
        <span className="mt-0.5 block text-[10px] font-semibold text-[var(--muted)]">課程專用時段</span>
      </div>
    );
  }

  if (cell.kind === "dupr" && cell.dropIn) {
    return (
      <button
        type="button"
        onClick={onSpecialClick}
        className={`min-h-[82px] w-full border px-2.5 py-2 text-left transition hover:bg-brand-teal ${kindStyles.dupr}`}
      >
        <span className="inline-block bg-brand-lime px-1.5 py-0.5 text-[10px] font-extrabold text-brand-navy">
          DUPR 積分賽
        </span>
        <span className="mt-1 block text-xs font-bold text-white">{cell.dropIn.label}</span>
      </button>
    );
  }

  const showDropIn = Boolean(cell.dropIn);
  const showRental = Boolean(cell.rental);

  return (
    <div
      className={`flex min-h-[82px] w-full divide-x divide-[var(--border)] overflow-hidden border ${kindStyles[cell.kind]}`}
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
      <div className="flex min-w-0 flex-1 flex-col justify-center bg-[var(--bg)] px-2 py-1.5 text-[10px] text-[var(--muted)]/60">
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
      className={`flex min-w-0 flex-1 flex-col items-stretch px-2 py-1.5 text-left transition ${
        dropIn.hasJoined
          ? "bg-brand-lime/45 hover:bg-brand-lime/65"
          : interactive
            ? "cursor-pointer bg-brand-lime-soft/60 hover:bg-brand-lime-soft"
            : "bg-brand-lime-soft/25"
      } disabled:cursor-default`}
    >
      <span className="text-[10px] font-extrabold text-brand-teal">臨打</span>
      <DropInRoster dropIn={dropIn} compact maxItems={2} />
      {loggedIn && dropIn.hasJoined && (
        <span className="mt-auto inline-block bg-brand-lime px-1.5 py-0.5 text-[10px] font-extrabold text-brand-navy">
          已報名 · 點取消
        </span>
      )}
      {loggedIn && canBook && (
        <span className="mt-auto text-[10px] font-extrabold text-brand-teal">點擊報名 →</span>
      )}
      {dropIn.isFull && !dropIn.hasJoined && (
        <span className="mt-auto text-[10px] font-bold text-amber-800">已滿</span>
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
      <div className="flex min-w-0 flex-1 flex-col justify-center bg-[var(--bg)] px-2 py-1.5 text-[10px] text-[var(--muted)]/60">
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
      className={`flex min-w-0 flex-1 flex-col items-stretch px-2 py-1.5 text-left transition ${
        rental.isMineRental
          ? "bg-brand-lime/45 hover:bg-brand-lime/65"
          : interactive
            ? "cursor-pointer bg-[var(--surface)] hover:bg-[var(--surface-alt)]"
            : "bg-[var(--surface)]/80"
      } disabled:cursor-default`}
    >
      <span className="text-[10px] font-extrabold text-[var(--muted)]">租場</span>
      <span className="text-xs font-bold text-brand-navy">{rental.label}</span>
      {rental.isBooked && !rental.isMineRental && (
        <span className="text-[10px] text-[var(--muted)]">已被預約</span>
      )}
      {loggedIn && canBook && (
        <span className="mt-auto text-[10px] font-extrabold text-brand-navy">點擊租場 →</span>
      )}
      {loggedIn && canCancel && (
        <span className="mt-auto inline-block bg-brand-lime px-1.5 py-0.5 text-[10px] font-extrabold text-brand-navy">
          我的租場 · 取消
        </span>
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-4">
          <div>
            <h3 className="text-xl font-extrabold text-brand-navy">{title}</h3>
            <p className="mt-0.5 text-sm font-semibold text-brand-teal tabular-nums">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-sm font-bold text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-brand-navy"
            aria-label="關閉"
          >
            ✕
          </button>
        </div>
        <div className="mt-5 space-y-4">{children}</div>
        {error && <p className="mt-3 bg-rose-100 px-3 py-2 text-sm font-bold text-rose-900">{error}</p>}
        <div className="mt-6 flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-[var(--surface-alt)] px-4 py-2.5 text-sm font-bold text-brand-navy hover:bg-[var(--border)]"
          >
            關閉
          </button>
          <button
            type="button"
            disabled={loading || submitDisabled}
            onClick={onSubmit}
            className="bg-brand-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-teal disabled:opacity-60"
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

  const clampedPartySize = Math.max(1, Math.min(partySize, remaining));

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
      partySize: clampedPartySize,
      racketRental,
    });
  }

  const submitLabel =
    activeKind === "drop-in"
      ? clampedPartySize > 1
        ? dropInHourCount > 1
          ? `確認報名 ${clampedPartySize} 人 · ${dropInHourCount} 小時`
          : `確認報名 ${clampedPartySize} 人`
        : dropInHourCount > 1
          ? `確認報名臨打 ${dropInHourCount} 小時`
          : "確認報名臨打"
      : hourCount > 1
        ? `確認租場 ${hourCount} 小時`
        : "確認租場";

  return (
    <ModalShell
      title="確認預約時段"
      subtitle={`${courtName} · ${windowLabel}`}
      loading={loading}
      error={displayError}
      onClose={onClose}
      submitLabel={submitLabel}
      onSubmit={handleSubmit}
      submitDisabled={!activeKind}
    >
      {canDropIn && canRent ? (
        <div className="grid grid-cols-2 gap-1 bg-[var(--bg)] p-1">
          <button
            type="button"
            onClick={() => {
              setKind("drop-in");
              setLocalError(null);
            }}
            className={`px-3 py-2.5 text-sm font-bold transition ${
              activeKind === "drop-in"
                ? "bg-brand-teal text-white"
                : "text-brand-navy hover:bg-[var(--surface)]"
            }`}
          >
            臨打球敘
            {canDropIn ? (
              <span className="mt-0.5 block text-[10px] font-medium opacity-90">
                {dropInHourCount > 1 ? `可連續 ${dropInHourCount} 小時` : "可報名"}
              </span>
            ) : (
              <span className="mt-0.5 block text-[10px] font-medium opacity-90">此範圍不可報名</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setKind("rental");
              setLocalError(null);
            }}
            className={`px-3 py-2.5 text-sm font-bold transition ${
              activeKind === "rental"
                ? "bg-brand-navy text-white"
                : "text-brand-navy hover:bg-[var(--surface)]"
            }`}
          >
            整場租借
            <span className="mt-0.5 block text-[10px] font-medium opacity-90">
              {canRent ? (hourCount > 1 ? `可連續 ${hourCount} 小時` : "整面球場") : "此範圍不可租"}
            </span>
          </button>
        </div>
      ) : activeKind === "drop-in" && dropIn ? (
        <div className="space-y-2">
          <p className="bg-brand-lime-soft px-3.5 py-2.5 text-sm font-bold text-brand-navy">
            臨打 · {dropIn.label}
            {dropInHourCount > 1 ? `（${dropInHourCount} 個時段）` : ""}
          </p>
          <DropInRoster dropIn={dropIn} />
        </div>
      ) : activeKind === "rental" ? (
        <p className="bg-[var(--surface-alt)] px-3.5 py-2.5 text-sm font-bold text-brand-navy">
          租場 · 整面球場預約
          {hourCount > 1 ? `（${hourCount} 小時）` : ""}
        </p>
      ) : kind === "drop-in" && !canDropIn ? (
        <p className="bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950">
          所選時段中有無法報名臨打的格子，請縮短範圍或改選租場。
        </p>
      ) : kind === "rental" && !canRent ? (
        <p className="bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950">
          所選時段中有無法租用的格子，請縮短範圍或改選臨打。
        </p>
      ) : (
        <p className="bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950">
          此時段目前無法預約，請調整開始或結束時間。
        </p>
      )}

      <p className="text-sm text-[var(--muted)] tabular-nums">
        可調整時段（每小時一格）。目前為 <strong className="text-brand-navy">{windowLabel}</strong>
        {hourCount > 1 ? `，共 ${hourCount} 小時` : ""}。
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-brand-navy">開始時間</label>
          <select
            value={startHour}
            onChange={(e) => handleStartChange(Number(e.target.value))}
            className="mt-1 w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-bold text-brand-navy tabular-nums"
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
          <label className="block text-xs font-bold text-brand-navy">結束時間</label>
          <select
            value={endHour + 1}
            onChange={(e) => handleEndExclusiveChange(Number(e.target.value))}
            className="mt-1 w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-bold text-brand-navy tabular-nums"
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
          <label className="block text-xs font-bold text-brand-navy">報名人數</label>
          <select
            value={clampedPartySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className="mt-1 w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-bold text-brand-navy tabular-nums"
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
        <label className="block text-xs font-bold text-brand-navy">租借球拍（支）</label>
        <select
          value={racketRental}
          onChange={(e) => setRacketRental(Number(e.target.value))}
          className="mt-1 w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-bold text-brand-navy tabular-nums"
        >
          <option value={0}>不需要</option>
          {(activeKind === "drop-in"
            ? Array.from({ length: clampedPartySize }, (_, i) => i + 1)
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
