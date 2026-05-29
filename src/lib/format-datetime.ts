/** 活動時間顯示：日期 + 時:分（不顯示秒） */
const ACTIVITY_DATETIME: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const ACTIVITY_TIME: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

/** 管理後台活動列表（含星期） */
const ACTIVITY_DATETIME_ADMIN: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
};

export function formatActivityDateTime(date: Date): string {
  return date.toLocaleString("zh-TW", ACTIVITY_DATETIME);
}

export function formatActivityTime(date: Date): string {
  return date.toLocaleTimeString("zh-TW", ACTIVITY_TIME);
}

export function formatAdminActivityDateTime(date: Date): string {
  return date.toLocaleString("zh-TW", ACTIVITY_DATETIME_ADMIN);
}
