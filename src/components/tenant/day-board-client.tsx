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

type ActiveModal =
  | { kind: "drop-in"; block: BoardDropInBlock }
  | { kind: "rental"; block: BoardRentalBlock }
  | null;

export function DayBoardClient({
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
    <div className="space-y-6" data-ui>
      <header>
        <p className="text-xs font-extrabold text-brand-teal tabular-nums">{dateLabel}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">
          今日球敘與租場看板
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          各球場即時臨打名單與租場狀態，可直接線上報名或預約時段。
        </p>
      </header>

      {courts.length === 0 ? (
        <div className="bg-[var(--surface)] p-8 text-center">
          <p className="text-base font-semibold text-[var(--muted)]">此日尚無開放之球場時段。</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {courts.map((court) => (
            <section
              key={court.courtId}
              className="overflow-hidden border border-[var(--border)] bg-[var(--surface)]"
            >
              {/* Flat Architectural Court Header (no gradients) */}
              <div className="flex items-center justify-between bg-brand-navy px-5 py-3.5 text-white">
                <h2 className="text-lg font-extrabold text-white">{court.courtName}</h2>
                <span className="bg-brand-teal px-2.5 py-0.5 text-xs font-bold text-white">
                  {court.venueName}
                </span>
              </div>
              <div className="space-y-3 p-5">
                {court.blocks.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">本日無時段</p>
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
    <div className="border-l-4 border-brand-teal bg-brand-lime-soft/45 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-brand-navy tabular-nums">
          臨打 · {block.windowLabel}
        </p>
        <span className="bg-[var(--surface)] px-2 py-0.5 text-xs font-extrabold text-brand-navy tabular-nums">
          {block.headCount} / {block.capacity} 人
        </span>
      </div>
      {block.title && block.title !== "球敘" && (
        <p className="mt-1 text-xs font-semibold text-brand-teal">{block.title}</p>
      )}
      <ol className="mt-3 space-y-1.5">
        {block.entries.length === 0 ? (
          [1, 2, 3, 4].map((n) => (
            <li key={n} className="text-sm text-[var(--muted)]/70 tabular-nums">
              {n}.（空位）
            </li>
          ))
        ) : (
          <>
            {block.entries.map((e) => (
              <li key={e.index} className="text-sm text-brand-navy tabular-nums">
                <span className="font-bold">
                  {e.index}. {e.displayName}
                </span>
                {e.meta && <span className="ml-1.5 text-xs text-[var(--muted)]">{e.meta}</span>}
              </li>
            ))}
            {block.headCount < block.capacity &&
              Array.from({
                length: Math.min(4, block.capacity - block.entries.length),
              }).map((_, i) => (
                <li key={`empty-${i}`} className="text-sm text-[var(--muted)]/70 tabular-nums">
                  {block.entries.length + i + 1}.（空位）
                </li>
              ))}
          </>
        )}
      </ol>

      <div className="mt-4">
        {!loggedIn ? (
          <LoginPrompt label="登入後報名臨打" />
        ) : block.hasJoined ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex bg-brand-lime px-3 py-1 text-xs font-extrabold text-brand-navy">
              您已報名{block.joinedPartySize > 1 ? `（${block.joinedPartySize} 人）` : ""}
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="text-xs font-bold text-[var(--muted)] underline hover:text-brand-navy disabled:opacity-60"
            >
              取消報名
            </button>
          </div>
        ) : block.requiresDupr ? (
          <Link
            href={block.activityHref}
            className="inline-flex bg-brand-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-teal"
          >
            DUPR 專場 · 前往報名 →
          </Link>
        ) : block.isFull ? (
          <span className="inline-flex bg-amber-200 px-3 py-1 text-xs font-extrabold text-amber-950">
            名額已滿
          </span>
        ) : (
          <button
            type="button"
            onClick={onBook}
            className="bg-brand-navy px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-teal"
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
    <div className="border border-[var(--border)] bg-[var(--bg)] p-4">
      <p className="text-sm font-extrabold text-brand-navy tabular-nums">
        租場 · {block.windowLabel}
      </p>
      {block.status === "BOOKED" && block.renterName ? (
        <>
          <p className="mt-2 text-sm font-bold text-brand-navy">
            1. {block.renterName}
            {block.racketLabel && (
              <span className="ml-1.5 font-normal text-[var(--muted)]">{block.racketLabel}</span>
            )}
          </p>
          {block.isMine && (
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="mt-2 text-xs font-bold text-[var(--muted)] underline hover:text-brand-navy disabled:opacity-60"
            >
              取消租借
            </button>
          )}
        </>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-brand-teal">整面球場可預約</p>
          <div>
            {loggedIn ? (
              <button
                type="button"
                onClick={onBook}
                className="bg-brand-navy px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-teal"
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
      className="inline-flex bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-brand-navy hover:bg-brand-navy hover:text-white"
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
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-[var(--surface-alt)] px-4 py-2.5 text-sm font-bold text-brand-navy hover:bg-[var(--border)]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={loading}
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
      title="報名臨打球敘"
      subtitle={`${block.windowLabel} · ${block.title && block.title !== "球敘" ? block.title : "球敘"}`}
      loading={loading}
      error={error}
      onClose={onClose}
      submitLabel={partySize > 1 ? `報名 ${partySize} 人` : "確認報名"}
      onSubmit={() => onSubmit({ partySize, startTime, endTime, racketRental })}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-brand-navy">開始時間</label>
          <input
            type="time"
            value={startTime}
            min={minTime}
            max={maxTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-bold text-brand-navy tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-brand-navy">結束時間</label>
          <input
            type="time"
            value={endTime}
            min={minTime}
            max={maxTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-bold text-brand-navy tabular-nums"
          />
        </div>
      </div>
      <p className="text-xs text-[var(--muted)] tabular-nums">
        開放時段 {minTime}–{maxTime}，可依到場時間調整。
      </p>

      <div>
        <label className="block text-xs font-bold text-brand-navy">報名人數</label>
        <select
          value={partySize}
          onChange={(e) => {
            const n = Number(e.target.value);
            setPartySize(n);
            if (racketRental > n) setRacketRental(n);
          }}
          className="mt-1 w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-bold text-brand-navy tabular-nums"
        >
          {Array.from({ length: remaining }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} 人{n > 1 ? `（您 +${n - 1}）` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-brand-navy">租借球拍（支）</label>
        <select
          value={racketRental}
          onChange={(e) => setRacketRental(Number(e.target.value))}
          className="mt-1 w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-bold text-brand-navy tabular-nums"
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
      title="預約整面球場"
      subtitle={`租場 · ${block.windowLabel}`}
      loading={loading}
      error={error}
      onClose={onClose}
      submitLabel="確認租場"
      onSubmit={() => onSubmit({ racketRental })}
    >
      <div>
        <label className="block text-xs font-bold text-brand-navy">租借球拍（支）</label>
        <select
          value={racketRental}
          onChange={(e) => setRacketRental(Number(e.target.value))}
          className="mt-1 w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-bold text-brand-navy tabular-nums"
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
