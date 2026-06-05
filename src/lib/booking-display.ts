/** 個人報名時段顯示，例如 14:00-17:00 */
export function formatBookingTimeRange(
  startAt: Date | string | null | undefined,
  endAt: Date | string | null | undefined,
): string | null {
  if (!startAt || !endAt) return null;
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${fmt(start)}-${fmt(end)}`;
}

/** 名單顯示：恩 +3 */
export function formatPartyHeadLabel(partySize: number, displayName: string): string {
  if (partySize > 1) return `${displayName} +${partySize - 1}`;
  return displayName;
}

export function formatRacketLabel(racketRental: number): string | null {
  if (racketRental <= 0) return null;
  return `球拍×${racketRental}`;
}

/** 組合名單副標：14:00-17:00 · 球拍×2 */
export function formatBookingMeta(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

export function buildBookingListMeta(booking: {
  startAt: Date | string | null;
  endAt: Date | string | null;
  racketRental: number;
}): string | null {
  const meta = formatBookingMeta([
    formatBookingTimeRange(booking.startAt, booking.endAt),
    formatRacketLabel(booking.racketRental),
  ]);
  return meta || null;
}

/** 將活動內的 Date 轉為 time input 用的 HH:mm */
export function toTimeInputValue(d: Date | string): string {
  const date = new Date(d);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** 以活動日期 + HH:mm 組成 Date */
export function combineActivityDateWithTime(activityStart: Date, timeHHmm: string): Date {
  const [hh, mm] = timeHHmm.split(":").map(Number);
  const out = new Date(activityStart);
  out.setHours(hh, mm, 0, 0);
  return out;
}
