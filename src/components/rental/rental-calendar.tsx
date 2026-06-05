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
    return <p className="text-sm text-slate-500">近 30 天尚無開放租借時段</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-brand-teal-soft bg-brand-lime-soft" /> 可預約
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-slate-200" /> 已滿
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-blue-300 bg-blue-100" /> 我的預約
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-left">球場</th>
              {days.map((d) => (
                <th key={d} className="min-w-[88px] px-1 py-2 text-center font-medium text-slate-600">
                  {formatDay(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courts.map((court) => (
              <tr key={court.id} className="border-b border-slate-50">
                <td className="sticky left-0 z-10 bg-white px-2 py-2 text-slate-800">
                  <div className="font-medium">{court.courtName}</div>
                  <div className="text-slate-500">{court.venueName}</div>
                </td>
                {days.map((dayKey) => {
                  const daySlots = slots.filter(
                    (s) => s.courtId === court.id && new Date(s.startAt).toDateString() === dayKey,
                  );
                  return (
                    <td key={dayKey} className="align-top px-1 py-1">
                      <div className="flex flex-col gap-1">
                        {daySlots.map((s) => (
                          <div
                            key={s.id}
                            className={`rounded px-1 py-1 ${
                              s.isMine
                                ? "border border-blue-300 bg-blue-50"
                                : s.status === "OPEN"
                                  ? "border border-brand-teal-soft bg-brand-lime-soft/50"
                                  : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <div>
                              {formatTime(s.startAt)}-{formatTime(s.endAt)}
                            </div>
                            {s.status === "OPEN" && !s.isMine && pendingBookId !== s.id && (
                              <button
                                type="button"
                                disabled={loadingId === s.id}
                                onClick={() => {
                                  setPendingBookId(s.id);
                                  setRacketRental(0);
                                }}
                                className="mt-0.5 text-brand-navy underline"
                              >
                                預約
                              </button>
                            )}
                            {s.status === "OPEN" && !s.isMine && pendingBookId === s.id && (
                              <div className="mt-1 space-y-1 rounded border border-slate-200 bg-white p-1.5">
                                <label className="block text-[10px] text-slate-600">球拍</label>
                                <select
                                  value={racketRental}
                                  onChange={(e) => setRacketRental(Number(e.target.value))}
                                  className="w-full rounded border border-slate-200 text-[10px]"
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
                                    className="flex-1 rounded bg-brand-navy px-1 py-0.5 text-[10px] text-white"
                                  >
                                    確認
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingBookId(null)}
                                    className="rounded border border-slate-200 px-1 py-0.5 text-[10px]"
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
                                className="mt-0.5 text-blue-700 underline"
                              >
                                取消
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
