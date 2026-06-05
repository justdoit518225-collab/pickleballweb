/** 樂活等台灣場館的營業日／時段皆以台北時間為準 */
export const VENUE_TIMEZONE = "Asia/Taipei";

export function getTaipeiYmd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: VENUE_TIMEZONE });
}

export function getTaipeiHour(d: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: VENUE_TIMEZONE,
      hour: "numeric",
      hour12: false,
    }).format(d),
  );
}

/** 看板某一格（hour）在台北時間的起迄瞬間 */
export function taipeiCellBounds(ymd: string, hour: number): { start: Date; end: Date } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = new Date(`${ymd}T${pad(hour)}:00:00+08:00`);
  const endHour = hour + 1;
  if (endHour >= 24) {
    const [y, m, d] = ymd.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const nextYmd = next.toISOString().slice(0, 10);
    return { start, end: new Date(`${nextYmd}T00:00:00+08:00`) };
  }
  return { start, end: new Date(`${ymd}T${pad(endHour)}:00:00+08:00`) };
}

export function overlapsHourInTaipei(
  slotStart: Date,
  slotEnd: Date,
  day: Date,
  hour: number,
): boolean {
  const ymd = getTaipeiYmd(day);
  const { start: cellStart, end: cellEnd } = taipeiCellBounds(ymd, hour);
  return slotStart < cellEnd && slotEnd > cellStart;
}

/** 租場時段是否從此格整點開始（優先於僅重疊的長時段／匯入資料） */
export function slotStartsInTaipeiHour(slotStart: Date, day: Date, hour: number): boolean {
  return getTaipeiYmd(slotStart) === getTaipeiYmd(day) && getTaipeiHour(slotStart) === hour;
}

/** 看板顯示用，例如 09:00-10:00 或 09:00-12:00（含 endHour 那一格） */
export function formatBoardHourWindow(startHour: number, endHourInclusive: number): string {
  const endExclusive = endHourInclusive + 1;
  const endLabel =
    endExclusive >= 24 ? "24:00" : `${String(endExclusive).padStart(2, "0")}:00`;
  return `${String(startHour).padStart(2, "0")}:00-${endLabel}`;
}
