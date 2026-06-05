"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toTimeInputValue } from "@/lib/booking-display";
import { formatBoardHourWindow } from "@/lib/venue-timezone";
import type {
  HourlyCell,
  HourlyCellKind,
  HourlyCourtColumn,
  HourlyDropIn,
} from "@/lib/hourly-board";
import { ROUTES } from "@/lib/constants";

type ModalState =
  | { mode: "choice"; cell: HourlyCell; courtId: string; courtName: string }
  | { mode: "drop-in"; dropIn: HourlyDropIn; courtName: string }
  | {
      mode: "rental-confirm";
      courtId: string;
      courtName: string;
      startHour: number;
      endHour: number;
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

  function openRentalConfirm(
    courtId: string,
    courtName: string,
    startHour: number,
    endHour: number,
  ) {
    setError(null);
    setModal({
      mode: "rental-confirm",
      courtId,
      courtName,
      startHour,
      endHour,
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
      setModal({ mode: "choice", cell, courtId: col.courtId, courtName });
      return;
    }

    if (cell.kind === "drop-in" && cell.dropIn) {
      if (cell.dropIn.hasJoined) {
        void callApi(`/api/activities/${cell.dropIn.activityId}/cancel`);
        return;
      }
      if (cell.dropIn.isFull) return;
      setModal({ mode: "drop-in", dropIn: cell.dropIn, courtName });
      return;
    }

    if (cell.kind === "rental" && cell.rental) {
      if (cell.rental.isMineRental) {
        void callApi(`/api/rentals/${cell.rental.slotId}/cancel`);
        return;
      }
      if (cell.rental.rentalOpen) {
        openRentalConfirm(col.courtId, courtName, cell.hour, cell.hour);
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
          營業 09:00–24:00 · A → B → C。點租場格後可在確認畫面調整開始／結束時間；臨打仍點格報名。
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
                  const rentOpen = loggedIn && isRentalOpenCell(cell);
                  return (
                    <td key={col.courtId} className="p-1">
                      <button
                        type="button"
                        disabled={!cellClickable(cell) && !rentOpen}
                        onClick={() => onCellClick(cell, col)}
                        className={`flex min-h-[56px] w-full flex-col items-stretch rounded-lg border px-2 py-1.5 text-left transition hover:ring-2 hover:ring-brand-teal/40 disabled:cursor-default disabled:hover:ring-0 ${kindStyles[cell.kind]}`}
                      >
                        <CellContent cell={cell} loggedIn={loggedIn} rentOpen={rentOpen} />
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

      {modal?.mode === "choice" && modal.cell.dropIn && modal.cell.rental && (
        <ChoiceModal
          cell={modal.cell}
          courtName={modal.courtName}
          loading={loading}
          error={error}
          onClose={() => setModal(null)}
          onPickDropIn={() =>
            setModal({ mode: "drop-in", dropIn: modal.cell.dropIn!, courtName: modal.courtName })
          }
          onPickRental={() =>
            openRentalConfirm(
              modal.courtId,
              modal.courtName,
              modal.cell.hour,
              modal.cell.hour,
            )
          }
        />
      )}
      {modal?.mode === "drop-in" && (
        <DropInModal
          dropIn={modal.dropIn}
          courtName={modal.courtName}
          loading={loading}
          error={error}
          onClose={() => setModal(null)}
          onSubmit={(body) =>
            callApi(`/api/activities/${modal.dropIn.activityId}/book`, body)
          }
        />
      )}
      {modal?.mode === "rental-confirm" && (() => {
        const col = columns.find((c) => c.courtId === modal.courtId);
        if (!col) return null;
        return (
          <RentalConfirmModal
            courtName={modal.courtName}
            column={col}
            boardHours={hours.map((h) => h.hour)}
            initialStartHour={modal.startHour}
            initialEndHour={modal.endHour}
            loading={loading}
            error={error}
            onClose={() => setModal(null)}
            onSubmit={(body) => callApi("/api/rentals/book-range", body)}
          />
        );
      })()}
    </div>
  );
}

function CellContent({
  cell,
  loggedIn,
  rentOpen,
}: {
  cell: HourlyCell;
  loggedIn: boolean;
  rentOpen?: boolean;
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
        <span className="text-xs font-medium text-brand-navy">
          臨打 {cell.dropIn.detail ?? cell.dropIn.label}
        </span>
        <span className="text-xs text-slate-600">
          租場 {cell.rental.isBooked ? cell.rental.label : "可租"}
        </span>
        {loggedIn && (
          <span className="mt-1 text-[10px] font-medium text-violet-700">點擊選擇 →</span>
        )}
      </>
    );
  }

  if (cell.kind === "drop-in" && cell.dropIn) {
    return (
      <>
        <span className="text-[10px] font-semibold text-brand-teal">臨打</span>
        <span className="text-xs font-medium">{cell.dropIn.label}</span>
        {cell.dropIn.detail && (
          <span className="text-[10px] opacity-80">{cell.dropIn.detail}</span>
        )}
        {loggedIn && cell.dropIn.hasJoined && (
          <span className="text-[10px] text-brand-teal">已報名·點取消</span>
        )}
      </>
    );
  }

  if (cell.kind === "rental" && cell.rental) {
    return (
      <>
        <span className="text-[10px] font-semibold text-slate-600">租場</span>
        <span className="text-xs font-medium">{cell.rental.label}</span>
        {loggedIn && cell.rental.rentalOpen && (
          <span className="text-[10px] text-emerald-700">
            {rentOpen ? "點擊租場，確認頁可調時間" : "點擊租場"}
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

function ChoiceModal({
  cell,
  courtName,
  loading,
  error,
  onClose,
  onPickDropIn,
  onPickRental,
}: {
  cell: HourlyCell;
  courtName: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onPickDropIn: () => void;
  onPickRental: () => void;
}) {
  const d = cell.dropIn!;
  const r = cell.rental!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-900">選擇預約方式</h3>
        <p className="mt-1 text-sm text-slate-500">{courtName}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 space-y-2">
          {d.bookable && !d.isFull && !d.hasJoined && (
            <button
              type="button"
              disabled={loading}
              onClick={onPickDropIn}
              className="w-full rounded-xl border border-brand-teal/40 bg-brand-lime-soft/40 px-4 py-3 text-left hover:bg-brand-lime-soft/70 disabled:opacity-60"
            >
              <span className="font-semibold text-brand-navy">報名臨打</span>
              <span className="mt-0.5 block text-xs text-slate-600">
                {d.label} · {d.detail}
              </span>
            </button>
          )}
          {d.hasJoined && (
            <p className="text-xs text-brand-teal">您已報名臨打，請在格子上點擊取消</p>
          )}
          {r.rentalOpen && (
            <button
              type="button"
              disabled={loading}
              onClick={onPickRental}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-60"
            >
              <span className="font-semibold text-slate-800">租場</span>
              <span className="mt-0.5 block text-xs text-slate-600">整面球場預約</span>
            </button>
          )}
          {r.isMineRental && (
            <p className="text-xs text-slate-500">您已租場，請在格子上點擊取消</p>
          )}
          {r.isBooked && !r.isMineRental && (
            <p className="text-xs text-slate-500">租場：{r.label}（已被預約）</p>
          )}
        </div>
        <button type="button" onClick={onClose} className="mt-4 w-full text-sm text-slate-500">
          關閉
        </button>
      </div>
    </div>
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
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel: string;
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
            disabled={loading}
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

function DropInModal({
  dropIn,
  courtName,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  dropIn: HourlyDropIn;
  courtName: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (body: {
    partySize: number;
    startTime: string;
    endTime: string;
    racketRental: number;
  }) => void;
}) {
  const minTime = toTimeInputValue(dropIn.startAt);
  const maxTime = toTimeInputValue(dropIn.endAt);
  const remaining = Math.max(1, dropIn.capacity - dropIn.headCount);
  const [partySize, setPartySize] = useState(1);
  const [startTime, setStartTime] = useState(minTime);
  const [endTime, setEndTime] = useState(maxTime);
  const [racketRental, setRacketRental] = useState(0);

  return (
    <ModalShell
      title="報名臨打"
      subtitle={`${courtName} · ${dropIn.label}`}
      loading={loading}
      error={error}
      onClose={onClose}
      submitLabel={partySize > 1 ? `報名 ${partySize} 人` : "確認報名"}
      onSubmit={() => onSubmit({ partySize, startTime, endTime, racketRental })}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">開始</label>
          <input
            type="time"
            value={startTime}
            min={minTime}
            max={maxTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">結束</label>
          <input
            type="time"
            value={endTime}
            min={minTime}
            max={maxTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
      </div>
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
      <div>
        <label className="block text-sm font-medium text-slate-700">球拍</label>
        <select
          value={racketRental}
          onChange={(e) => setRacketRental(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value={0}>不需要</option>
          {Array.from({ length: partySize }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} 支
            </option>
          ))}
        </select>
      </div>
    </ModalShell>
  );
}

function RentalConfirmModal({
  courtName,
  column,
  boardHours,
  initialStartHour,
  initialEndHour,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  courtName: string;
  column: HourlyCourtColumn;
  boardHours: number[];
  initialStartHour: number;
  initialEndHour: number;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (body: { slotIds: string[]; racketRental: number }) => void;
}) {
  const [startHour, setStartHour] = useState(initialStartHour);
  const [endHour, setEndHour] = useState(initialEndHour);
  const [racketRental, setRacketRental] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const boardEndHour = 24;
  const maxStartHour = boardHours[boardHours.length - 1] ?? boardEndHour - 1;
  const endExclusiveOptions: number[] = [];
  for (let h = startHour + 1; h <= boardEndHour; h++) {
    endExclusiveOptions.push(h);
  }

  const hourCount = Math.max(0, endHour - startHour + 1);
  const windowLabel = formatBoardHourWindow(startHour, endHour);
  const displayError = localError ?? error;

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
    const resolved = resolveRentalSlotIds(column, startHour, endHour);
    if (!resolved.ok) {
      setLocalError(resolved.message);
      return;
    }
    onSubmit({ slotIds: resolved.slotIds, racketRental });
  }

  return (
    <ModalShell
      title="確認租場"
      subtitle={`${courtName} · ${windowLabel}`}
      loading={loading}
      error={displayError}
      onClose={onClose}
      submitLabel={hourCount > 1 ? `確認租場 ${hourCount} 小時` : "確認租場"}
      onSubmit={handleSubmit}
    >
      <p className="text-sm text-slate-600">
        可調整租用時段（每小時一格）。目前為 <strong>{windowLabel}</strong>
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
      <div>
        <label className="block text-sm font-medium text-slate-700">租借球拍（支）</label>
        <select
          value={racketRental}
          onChange={(e) => setRacketRental(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value={0}>不需要</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n} 支
            </option>
          ))}
        </select>
      </div>
    </ModalShell>
  );
}
