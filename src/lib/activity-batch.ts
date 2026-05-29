import { toDatetimeLocalValue } from "@/lib/datetime";

export type ActivityOccurrence = { startAt: Date; endAt: Date };

/** 依日期區間與星期幾，產生每日場次的開始／結束時間 */
export function buildActivityOccurrences(params: {
  startDate: string;
  endDate: string;
  repeatDays: number[];
  slotStart: string;
  slotEnd: string;
}): ActivityOccurrence[] {
  const { startDate, endDate, repeatDays, slotStart, slotEnd } = params;
  const repeatSet = new Set(repeatDays);
  const from = new Date(startDate);
  const to = new Date(endDate);
  const [sh, sm] = slotStart.split(":").map(Number);
  const [eh, em] = slotEnd.split(":").map(Number);

  const occurrences: ActivityOccurrence[] = [];

  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (!repeatSet.has(d.getDay())) continue;

    const startAt = new Date(d);
    startAt.setHours(sh, sm, 0, 0);
    const endAt = new Date(d);
    endAt.setHours(eh, em, 0, 0);
    if (endAt <= startAt) continue;

    occurrences.push({ startAt, endAt });
  }

  return occurrences;
}

/** 批次 DEADLINE：各場以開始時間為截止，或「開始前 N 天」的固定時刻 */
export function resolveBatchCancelDeadline(
  startAt: Date,
  options: { atStart: boolean; daysBefore: number; time: string },
): string {
  if (options.atStart) return toDatetimeLocalValue(startAt);

  const [h, m] = options.time.split(":").map(Number);
  const deadline = new Date(startAt);
  deadline.setDate(deadline.getDate() - options.daysBefore);
  deadline.setHours(h, m, 0, 0);
  return toDatetimeLocalValue(deadline);
}
