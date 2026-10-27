"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toTimeInputValue } from "@/lib/booking-display";

type Props = {
  activityId: string;
  hasJoined: boolean;
  isFull: boolean;
  canCancel: boolean;
  onWaitlist: boolean;
  waitlistPosition?: number;
  allowPartySize?: boolean;
  maxPartySize?: number;
  joinedPartySize?: number;
  /** 活動整段時段（ISO），用於個人時段預設與驗證 */
  activityStartAt: string;
  activityEndAt: string;
};

export function BookingActions({
  activityId,
  hasJoined,
  isFull,
  canCancel,
  onWaitlist,
  waitlistPosition,
  allowPartySize = false,
  maxPartySize = 1,
  joinedPartySize = 1,
  activityStartAt,
  activityEndAt,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(1);
  const [startTime, setStartTime] = useState(() => toTimeInputValue(activityStartAt));
  const [endTime, setEndTime] = useState(() => toTimeInputValue(activityEndAt));
  const [racketRental, setRacketRental] = useState(0);

  const minTime = useMemo(() => toTimeInputValue(activityStartAt), [activityStartAt]);
  const maxTime = useMemo(() => toTimeInputValue(activityEndAt), [activityEndAt]);

  async function callApi(path: string, body?: object) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/activities/${activityId}/${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "操作失敗");
      return;
    }
    router.refresh();
  }

  function buildBookBody() {
    const body: {
      partySize?: number;
      startTime: string;
      endTime: string;
      racketRental: number;
    } = {
      startTime,
      endTime,
      racketRental,
    };
    if (allowPartySize) body.partySize = partySize;
    return body;
  }

  if (hasJoined) {
    return (
      <div className="flex flex-col gap-3 bg-[var(--surface)] p-6" data-ui>
        <span className="inline-flex w-fit bg-brand-lime px-4 py-2 text-sm font-extrabold text-brand-navy">
          您已報名成功
          {joinedPartySize > 1 ? `（${joinedPartySize} 人）` : ""}
        </span>
        {canCancel ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => callApi("cancel")}
            className="w-fit bg-[var(--surface-alt)] px-4 py-2.5 text-sm font-bold text-brand-navy hover:bg-[var(--border)] disabled:opacity-60"
          >
            {loading ? "處理中…" : "取消預約"}
          </button>
        ) : (
          <p className="text-sm font-semibold text-[var(--muted)]">已超過取消期限</p>
        )}
        {error && <p className="bg-rose-100 px-3 py-2 text-sm font-bold text-rose-900">{error}</p>}
      </div>
    );
  }

  if (onWaitlist) {
    return (
      <div className="flex flex-col gap-3 bg-[var(--surface)] p-6" data-ui>
        <span className="w-fit bg-amber-200 px-4 py-2 text-sm font-extrabold text-amber-950 tabular-nums">
          候補中（第 {waitlistPosition} 位）
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={() => callApi("waitlist", { action: "leave" })}
          className="w-fit text-sm font-bold text-[var(--muted)] underline hover:text-brand-navy"
        >
          離開候補名單
        </button>
        {error && <p className="bg-rose-100 px-3 py-2 text-sm font-bold text-rose-900">{error}</p>}
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="flex flex-col gap-3 bg-[var(--surface)] p-6" data-ui>
        <span className="w-fit bg-amber-200 px-4 py-2 text-sm font-extrabold text-amber-950">
          目前名額已滿
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={() => callApi("waitlist")}
          className="btn-brand w-fit disabled:opacity-60"
        >
          {loading ? "處理中…" : "加入候補名單"}
        </button>
        {error && <p className="bg-rose-100 px-3 py-2 text-sm font-bold text-rose-900">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 bg-[var(--surface)] p-6" data-ui>
      <h2 className="text-lg font-extrabold text-brand-navy">填寫預約資訊</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="personal-start" className="block text-xs font-bold text-brand-navy">
            您的開始時間
          </label>
          <input
            id="personal-start"
            type="time"
            value={startTime}
            min={minTime}
            max={maxTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1.5 w-full border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-bold text-brand-navy tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="personal-end" className="block text-xs font-bold text-brand-navy">
            您的結束時間
          </label>
          <input
            id="personal-end"
            type="time"
            value={endTime}
            min={minTime}
            max={maxTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1.5 w-full border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-bold text-brand-navy tabular-nums"
          />
        </div>
      </div>
      <p className="text-xs font-semibold text-[var(--muted)] tabular-nums">
        活動開放時段 {minTime}–{maxTime}，可依實際到場時間調整（顯示於名單）
      </p>

      {allowPartySize && maxPartySize > 1 && (
        <div>
          <label htmlFor="party-size" className="block text-xs font-bold text-brand-navy">
            報名人數
          </label>
          <select
            id="party-size"
            value={partySize}
            onChange={(e) => {
              const n = Number(e.target.value);
              setPartySize(n);
              if (racketRental > n) setRacketRental(n);
            }}
            className="mt-1.5 border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-bold text-brand-navy tabular-nums"
          >
            {Array.from({ length: maxPartySize }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} 人{n > 1 ? `（您 +${n - 1}）` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="racket-rental" className="block text-xs font-bold text-brand-navy">
          租借球拍（支）
        </label>
        <select
          id="racket-rental"
          value={racketRental}
          onChange={(e) => setRacketRental(Number(e.target.value))}
          className="mt-1.5 border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-bold text-brand-navy tabular-nums"
        >
          <option value={0}>不需要</option>
          {Array.from({ length: allowPartySize ? partySize : 1 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} 支
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => callApi("book", buildBookBody())}
        className="btn-brand w-fit disabled:opacity-60"
      >
        {loading
          ? "預約中…"
          : allowPartySize && partySize > 1
            ? `確認報名 ${partySize} 人 →`
            : "確認立即預約 →"}
      </button>
      {error && <p className="bg-rose-100 px-3 py-2 text-sm font-bold text-rose-900">{error}</p>}
    </div>
  );
}
