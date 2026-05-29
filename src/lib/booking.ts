import type { Activity } from "@/generated/prisma/client";

/** 依活動自訂取消規則，判斷此刻是否仍可取消 */
export function canCancelBooking(
  activity: Pick<
    Activity,
    "cancelPolicyType" | "cancelHoursBefore" | "cancelDeadlineAt" | "startAt"
  >,
  now: Date = new Date(),
): boolean {
  if (activity.cancelPolicyType === "HOURS_BEFORE") {
    if (activity.cancelHoursBefore == null) return false;
    const deadline = new Date(
      activity.startAt.getTime() - activity.cancelHoursBefore * 60 * 60 * 1000,
    );
    return now < deadline;
  }

  if (activity.cancelPolicyType === "DEADLINE") {
    if (!activity.cancelDeadlineAt) return false;
    return now < activity.cancelDeadlineAt;
  }

  return false;
}

export function formatCancelPolicy(
  activity: Pick<
    Activity,
    "cancelPolicyType" | "cancelHoursBefore" | "cancelDeadlineAt"
  >,
): string {
  if (activity.cancelPolicyType === "HOURS_BEFORE" && activity.cancelHoursBefore != null) {
    return `活動開始前 ${activity.cancelHoursBefore} 小時內不可取消`;
  }
  if (activity.cancelPolicyType === "DEADLINE" && activity.cancelDeadlineAt) {
    return `取消截止：${activity.cancelDeadlineAt.toLocaleString("zh-TW")}`;
  }
  return "請洽場館";
}
