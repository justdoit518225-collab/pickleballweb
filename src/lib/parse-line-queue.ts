/** 從 Line 接龍文字解析球員名單（依編號排序，最多 8 人） */

const STOP_NAME_PATTERNS = [
  /^滿/,
  /成團/,
  /接龍/,
  /付費/,
  /租場/,
  /現金/,
  /line\s*pay/i,
  /當天/,
  /以上時間/,
  /場地/,
  /樂活/,
  /^\d{1,2}\/\d{1,2}/,
  /^\d{1,2}:\d{2}/,
  /可以的請/,
  /按實際/,
];

const LINE_ITEM =
  /^\s*(\d{1,2})\s*(?:[\.．、:：\)）]|[)\]])?\s*(.+?)\s*$/;

function isStopName(name: string) {
  return STOP_NAME_PATTERNS.some((re) => re.test(name));
}

function cleanName(raw: string) {
  return raw
    .replace(/^[\-–—•·\s]+/, "")
    .replace(/[\s]+/g, " ")
    .replace(/[|｜].*$/, "")
    .trim();
}

export function parseLineQueueText(text: string, max = 8): string[] {
  const byIndex = new Map<number, string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const m = line.match(LINE_ITEM);
    if (!m) continue;

    const index = Number(m[1]);
    if (!Number.isInteger(index) || index < 1 || index > max) continue;

    const name = cleanName(m[2]);
    if (!name || name.length > 24) continue;
    if (isStopName(name)) continue;
    // 純數字或過短雜訊
    if (/^\d+$/.test(name)) continue;

    if (!byIndex.has(index)) {
      byIndex.set(index, name);
    }
  }

  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, name]) => name)
    .slice(0, max);
}
