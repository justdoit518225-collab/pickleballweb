"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  BoardCourtSection,
  BoardDropInBlock,
  BoardRentalBlock,
} from "@/lib/day-board";
import { toTimeInputValue } from "@/lib/booking-display";
import { ROUTES } from "@/lib/constants";

type ActiveModal =
  | { kind: "drop-in"; block: BoardDropInBlock }
  | { kind: "rental"; block: BoardRentalBlock }
  | null;

export function DayBoardClient({
  tenantSlug,
  dateLabel,
  courts,
  loggedIn,
}: {
  tenantSlug: string;
  dateLabel: string;
  courts: BoardCourtSection[];
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<ActiveModal>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">{dateLabel}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">今日球敘看板</h1>
        <p className="mt-2 text-sm text-slate-600">
          各球場臨打名單與租場狀態，可直接報名或租場。
        </p>
      </header>

      {courts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          此日尚無球場時段。
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {courts.map((court) => (
            <section
              key={court.courtId}
              className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-sm"
            >
              <div className="bg-gradient-to-r from-brand-navy to-brand-teal px-4 py-3">
                <h2 className="text-lg font-bold text-white">{court.courtName}</h2>
                <p className="text-xs text-white/80">{court.venueName}</p>
              </div>
              <div className="space-y-3 p-4">
                {court.blocks.length === 0 ? (
                  <p className="text-sm text-slate-400">本日無時段</p>
                ) : (
                  court.blocks.map((block) =>
                    block.kind === "drop-in" ? (
                      <DropInBlockCard
                        key={block.id}
                        block={block}
                        loggedIn={loggedIn}
                        loading={loading}
                        onBook={() => {
                          setError(null);
                          setModal({ kind: "drop-in", block });
                        }}
                        onCancel={() =>
                          callApi(`/api/activities/${block.id}/cancel`)
                        }
                      />
                    ) : (
                      <RentalBlockCard
                        key={block.id}
                        block={block}
                        loggedIn={loggedIn}
                        loading={loading}
                        onBook={() => {
                          setError(null);
                          setModal({ kind: "rental", block });
                        }}
                        onCancel={() =>
                          callApi(`/api/rentals/${block.id}/cancel`)
                        }
                      />
                    ),
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {modal?.kind === "drop-in" && (
        <DropInModal
          block={modal.block}
          loading={loading}
          error={error}
          onClose={() => setModal(null)}
          onSubmit={(body) => callApi(`/api/activities/${modal.block.id}/book`, body)}
        />
      )}
      {modal?.kind === "rental" && (
        <RentalModal
          block={modal.block}
          loading={loading}
          error={error}
          onClose={() => setModal(null)}
          onSubmit={(body) => callApi(`/api/rentals/${modal.block.id}/book`, body)}
        />
      )}
    </div>
  );
}

function DropInBlockCard({
  block,
  loggedIn,
  loading,
  onBook,
  onCancel,
}: {
  block: BoardDropInBlock;
  loggedIn: boolean;
  loading: boolean;
  onBook: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-lg border border-brand-teal/30 bg-brand-lime-soft/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-brand-navy">
          臨打 · {block.windowLabel}
        </p>
        <span className="text-xs text-slate-600">
          {block.headCount}/{block.capacity} 人
        </span>
      </div>
      {block.title && block.title !== "球敘" && (
        <p className="mt-0.5 text-xs text-slate-500">{block.title}</p>
      )}
      <ol className="mt-3 space-y-2">
        {block.entries.length === 0 ? (
          [1, 2, 3, 4].map((n) => (
            <li key={n} className="text-sm text-slate-400">
              {n}.（空）
            </li>
          ))
        ) : (
          <>
            {block.entries.map((e) => (
              <li key={e.index} className="text-sm text-slate-800">
                <span className="font-medium">
                  {e.index}. {e.displayName}
                </span>
                {e.meta && <span className="ml-1 text-slate-500">{e.meta}</span>}
              </li>
            ))}
            {block.headCount < block.capacity &&
              Array.from({
                length: Math.min(4, block.capacity - block.entries.length),
              }).map((_, i) => (
                <li key={`empty-${i}`} className="text-sm text-slate-400">
                  {block.entries.length + i + 1}.（空）
                </li>
              ))}
          </>
        )}
      </ol>

      <div className="mt-3">
        {!loggedIn ? (
          <LoginPrompt label="登入後報名臨打" />
        ) : block.hasJoined ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex rounded-md bg-brand-lime-soft px-2.5 py-1 text-xs font-medium text-brand-navy">
              您已報名{block.joinedPartySize > 1 ? `（${block.joinedPartySize} 人）` : ""}
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="text-xs font-medium text-slate-500 underline hover:text-slate-700 disabled:opacity-60"
            >
              取消報名
            </button>
          </div>
        ) : block.requiresDupr ? (
          <Link
            href={block.activityHref}
            className="text-xs font-medium text-indigo-600 underline"
          >
            DUPR 專場 · 前往報名 →
          </Link>
        ) : block.isFull ? (
          <span className="inline-flex rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
            名額已滿
          </span>
        ) : (
          <button
            type="button"
            onClick={onBook}
            className="rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            ＋ 報名臨打
          </button>
        )}
      </div>
    </div>
  );
}

function RentalBlockCard({
  block,
  loggedIn,
  loading,
  onBook,
  onCancel,
}: {
  block: BoardRentalBlock;
  loggedIn: boolean;
  loading: boolean;
  onBook: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-800">租場 · {block.windowLabel}</p>
      {block.status === "BOOKED" && block.renterName ? (
        <>
          <p className="mt-2 text-sm text-slate-700">
            1. {block.renterName}
            {block.racketLabel && (
              <span className="ml-1 text-slate-500">{block.racketLabel}</span>
            )}
          </p>
          {block.isMine && (
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="mt-2 text-xs font-medium text-slate-500 underline hover:text-slate-700 disabled:opacity-60"
            >
              取消租借
            </button>
          )}
        </>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-slate-400">（可預約）</p>
          <div className="mt-2">
            {loggedIn ? (
              <button
                type="button"
                onClick={onBook}
                className="rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                ＋ 租這時段
              </button>
            ) : (
              <LoginPrompt label="登入後租場" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LoginPrompt({ label }: { label: string }) {
  return (
    <Link
      href="/login"
      className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {label}
    </Link>
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
            aria-label="關閉"
          >
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-4">{children}</div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onSubmit}
            className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "處理中…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DropInModal({
  block,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  block: BoardDropInBlock;
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
  const minTime = toTimeInputValue(block.startAt);
  const maxTime = toTimeInputValue(block.endAt);
  const remaining = Math.max(1, block.capacity - block.headCount);
  const [partySize, setPartySize] = useState(1);
  const [startTime, setStartTime] = useState(minTime);
  const [endTime, setEndTime] = useState(maxTime);
  const [racketRental, setRacketRental] = useState(0);

  return (
    <ModalShell
      title="報名臨打"
      subtitle={`${block.windowLabel} · ${block.title && block.title !== "球敘" ? block.title : "球敘"}`}
      loading={loading}
      error={error}
      onClose={onClose}
      submitLabel={partySize > 1 ? `報名 ${partySize} 人` : "確認報名"}
      onSubmit={() => onSubmit({ partySize, startTime, endTime, racketRental })}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">開始時間</label>
          <input
            type="time"
            value={startTime}
            min={minTime}
            max={maxTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">結束時間</label>
          <input
            type="time"
            value={endTime}
            min={minTime}
            max={maxTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        開放時段 {minTime}–{maxTime}，可依到場時間調整。
      </p>

      <div>
        <label className="block text-sm font-medium text-slate-700">報名人數</label>
        <select
          value={partySize}
          onChange={(e) => {
            const n = Number(e.target.value);
            setPartySize(n);
            if (racketRental > n) setRacketRental(n);
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {Array.from({ length: remaining }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} 人{n > 1 ? `（您 +${n - 1}）` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">租借球拍（支）</label>
        <select
          value={racketRental}
          onChange={(e) => setRacketRental(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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

function RentalModal({
  block,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  block: BoardRentalBlock;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (body: { racketRental: number }) => void;
}) {
  const [racketRental, setRacketRental] = useState(0);

  return (
    <ModalShell
      title="租這時段"
      subtitle={`租場 · ${block.windowLabel}`}
      loading={loading}
      error={error}
      onClose={onClose}
      submitLabel="確認租場"
      onSubmit={() => onSubmit({ racketRental })}
    >
      <div>
        <label className="block text-sm font-medium text-slate-700">租借球拍（支）</label>
        <select
          value={racketRental}
          onChange={(e) => setRacketRental(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
