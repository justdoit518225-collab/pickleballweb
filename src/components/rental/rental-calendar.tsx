"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type RentalSlotView = {
  id: string;
  courtId: string;
  courtName: string;
  venueName: string;
  startAt: string;
  endAt: string;
  status: "OPEN" | "BOOKED" | "BLOCKED";
  isMine: boolean;
  cancelHoursBefore: number;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", weekday: "short" });
}

export function RentalCalendar({
  slots,
  loggedIn,
}: {
  slots: RentalSlotView[];
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingBookId, setPendingBookId] = useState<string | null>(null);
  const [racketRental, setRacketRental] = useState(0);

  const courts = useMemo(() => {
    const map = new Map<string, { courtName: string; venueName: string }>();
    for (const s of slots) {
      if (!map.has(s.courtId)) map.set(s.courtId, { courtName: s.courtName, venueName: s.venueName });
    }
    return [...map.entries()].map(([id, v]) => ({ id, ...v }));
  }, [slots]);

  const days = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      set.add(new Date(s.startAt).toDateString());
    }
    return [...set].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [slots]);

  async function book(slotId: string, rackets: number) {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    setLoadingId(slotId);
    setError(null);
    const res = await fetch(`/api/rentals/${slotId}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ racketRental: rackets }),
    });
    const data = (await res.json()) as { error?: string };
    setLoadingId(null);
    setPendingBookId(null);
    if (!res.ok) {
      setError(data.error ?? "預約失敗");
      return;
    }
    router.refresh();
  }

  async function cancel(slotId: string) {
    setLoadingId(slotId);
    setError(null);
    const res = await fetch(`/api/rentals/${slotId}/cancel`, { method: "POST" });
    const data = (await res.json()) as { error?: string };
    setLoadingId(null);
    if (!res.ok) {
      setError(data.error ?? "取消失敗");
      return;
    }
    router.refresh();
  }

  if (courts.length === 0) {
    return <p className="text-sm font-semibold text-[var(--muted)]">近 30 天尚無開放租借時段</p>;
  }

  return (
    <div className="space-y-5" data-ui>
      <div className="flex flex-wrap gap-3 text-xs font-bold text-brand-navy">
        <span className="inline-flex items-center gap-1.5 bg-brand-lime-soft px-3 py-1">
          <span className="h-2.5 w-2.5 bg-brand-teal" /> 可預約時段
        </span>
        <span className="inline-flex items-center gap-1.5 bg-[var(--surface-alt)] px-3 py-1 text-[var(--muted)]">
          <span className="h-2.5 w-2.5 bg-[var(--muted)]" /> 已滿 / 未開放
        </span>
        <span className="inline-flex items-center gap-1.5 bg-brand-lime px-3 py-1 text-brand-navy">
          <span className="h-2.5 w-2.5 bg-brand-navy" /> 我的預約
        </span>
      </div>

      {error && <p className="bg-rose-100 px-4 py-2.5 text-sm font-bold text-rose-900">{error}</p>}

      <div className="overflow-x-auto border border-[var(--border)] bg-[var(--surface)]">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-brand-navy text-white">
              <th className="sticky left-0 z-10 border-r border-white/15 bg-brand-navy px-3 py-3 text-left font-extrabold text-brand-lime">
                球場
              </th>
              {days.map((d) => (
                <th
                  key={d}
                  className="min-w-[100px] border-r border-white/15 px-2 py-3 text-center font-extrabold text-white tabular-nums last:border-r-0"
                >
                  {formatDay(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courts.map((court) => (
              <tr key={court.id} className="border-b border-[var(--border)] last:border-0">
                <td className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-brand-navy">
                  <div className="font-extrabold">{court.courtName}</div>
                  <div className="text-[11px] font-medium text-[var(--muted)]">{court.venueName}</div>
                </td>
                {days.map((dayKey) => {
                  const daySlots = slots.filter(
                    (s) => s.courtId === court.id && new Date(s.startAt).toDateString() === dayKey,
                  );
                  return (
                    <td key={dayKey} className="border-r border-[var(--border)]/50 align-top px-1.5 py-1.5 last:border-r-0">
                      <div className="flex flex-col gap-1.5">
                        {daySlots.map((s) => (
                          <div
                            key={s.id}
                            className={`px-2 py-1.5 tabular-nums ${
                              s.isMine
                                ? "bg-brand-lime font-bold text-brand-navy"
                                : s.status === "OPEN"
                                  ? "border border-brand-teal/35 bg-brand-lime-soft/60 text-brand-navy"
                                  : "bg-[var(--bg)] text-[var(--muted)]"
                            }`}
                          >
                            <div className="font-bold">
                              {formatTime(s.startAt)}–{formatTime(s.endAt)}
                            </div>
                            {s.status === "OPEN" && !s.isMine && pendingBookId !== s.id && (
                              <button
                                type="button"
                                disabled={loadingId === s.id}
                                onClick={() => {
                                  setPendingBookId(s.id);
                                  setRacketRental(0);
                                }}
                                className="mt-1 inline-block font-extrabold text-brand-teal underline hover:text-brand-navy"
                              >
                                預約 →
                              </button>
                            )}
                            {s.status === "OPEN" && !s.isMine && pendingBookId === s.id && (
                              <div className="mt-1.5 space-y-1.5 border border-[var(--border)] bg-[var(--surface)] p-2">
                                <label className="block text-[10px] font-bold text-brand-navy">球拍租借</label>
                                <select
                                  value={racketRental}
                                  onChange={(e) => setRacketRental(Number(e.target.value))}
                                  className="w-full border border-[var(--border)] bg-[var(--bg)] px-1 py-0.5 text-[10px] font-bold text-brand-navy"
                                >
                                  <option value={0}>不要</option>
                                  {[1, 2, 3, 4].map((n) => (
                                    <option key={n} value={n}>
                                      {n} 支
                                    </option>
                                  ))}
                                </select>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    disabled={loadingId === s.id}
                                    onClick={() => book(s.id, racketRental)}
                                    className="flex-1 bg-brand-navy px-1.5 py-1 text-[10px] font-bold text-white"
                                  >
                                    確認
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingBookId(null)}
                                    className="bg-[var(--surface-alt)] px-1.5 py-1 text-[10px] font-bold text-brand-navy"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            )}
                            {s.isMine && (
                              <button
                                type="button"
                                disabled={loadingId === s.id}
                                onClick={() => cancel(s.id)}
                                className="mt-1 inline-block font-extrabold text-brand-navy underline"
                              >
                                取消預約
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
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
