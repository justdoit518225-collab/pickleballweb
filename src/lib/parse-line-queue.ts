/** 從 Line 接龍文字解析球員名單（依編號排序，最多 8 人） */

const STOP_NAME_PATTERNS = [
  /^滿/,
  /^人/, // 人額滿喔／人領滿喔（OCR 常拆成獨立一行）
  /額滿/,
  /領滿/, // OCR 常把「額」認成「領」
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
  /有人報/,
  // OCR 把「人額」等認成短英文大寫（如 ARE）
  /^[A-Z]{2,5}$/,
];

/** OCR 常把編號認錯：Z→7、O→0、l/I→1…（僅在有分隔符的「1. 名」才套用） */
const OCR_DIGIT_MAP: Record<string, string> = {
  O: "0",
  o: "0",
  D: "0",
  I: "1",
  l: "1",
  "|": "1",
  i: "1",
  Z: "7",
  z: "7",
  S: "5",
  s: "5",
  B: "8",
  g: "9",
  q: "9",
};

/**
 * 必須有「1.」「2、」這類分隔，避免把「7人額滿喔」「BARE」誤當名單。
 * 真實接龍一定是「編號 + 標點 + 姓名」。
 */
const LINE_ITEM =
  /^\s*([0-9OoDdIl|iZzSsBbggq]{1,2})\s*(?:[\.．、:：\)）\]\,，])\s*(.+?)\s*$/;

function isStopName(name: string) {
  return STOP_NAME_PATTERNS.some((re) => re.test(name));
}

function normalizeOcrIndex(raw: string): number | null {
  const digits = [...raw]
    .map((ch) => OCR_DIGIT_MAP[ch] ?? (/^\d$/.test(ch) ? ch : ""))
    .join("");
  if (!digits) return null;
  const index = Number(digits);
  if (!Number.isInteger(index)) return null;
  return index;
}

function cleanName(raw: string) {
  return raw
    .replace(/^[\-–—•·\s,，、]+/, "")
    .replace(/[|｜].*$/, "")
    // 去掉中文字之間被 OCR 插入的空白（建 伸 → 建伸）
    .replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "$1")
    .replace(/[\s]+/g, " ")
    .trim();
}

export function parseLineQueueText(text: string, max = 8): string[] {
  const byIndex = new Map<number, string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const m = line.match(LINE_ITEM);
    if (!m) continue;

    const index = normalizeOcrIndex(m[1]);
    if (index == null || index < 1 || index > max) continue;

    const name = cleanName(m[2]);
    if (!name || name.length > 24) continue;
    if (isStopName(name)) continue;
    // 純數字或過短雜訊
    if (/^\d+$/.test(name)) continue;
    if (name.length < 1) continue;

    if (!byIndex.has(index)) {
      byIndex.set(index, name);
    }
  }

  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, name]) => name)
    .slice(0, max);
}
