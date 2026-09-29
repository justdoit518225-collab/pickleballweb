/**
 * FitBook 約課系統（https://www.fit-book.com.tw）
 * 課程列表為公開 JSON；報名者名單需以 LINE 登入 FitBook 後才看得到，
 * 由管理員提供登入 cookie（見 fitbook-session.ts）即時抓取，未設定時可貼上名單或用模擬名單。
 */

const FITBOOK_BASE = "https://www.fit-book.com.tw";

export type FitbookStore = { urlName: string; storeId: string; label: string };

const FITBOOK_STORES: Record<string, FitbookStore> = {
  "active-pickleball-club": {
    urlName: "urlname459",
    storeId: "564",
    label: "Active Pickleball Club",
  },
};

export function getFitbookStore(tenantSlug: string): FitbookStore | null {
  return FITBOOK_STORES[tenantSlug] ?? null;
}

export function fitbookScheduleUrl(store: FitbookStore, date: string) {
  return `${FITBOOK_BASE}/${store.urlName}/${store.storeId}?date=${date}`;
}

export type FitbookCourse = {
  courseId: string;
  name: string;
  categoryName: string;
  teacherName: string;
  date: string;
  startAt: Date;
  endAt: Date;
  showTime: string;
  location: string | null;
  reservationCount: number;
  remainCount: number;
  capacity: number;
  url: string;
};

type RawCourse = {
  url?: string;
  name?: string;
  category_name?: string;
  teacher_name?: string;
  show_time?: string;
  reservation_count?: number;
  remain_count?: number;
  order_count?: number;
};

function parseTimeRange(date: string, showTime: string) {
  const m = showTime.match(/(\d{1,2}):(\d{2})\s*[~\-－]\s*(\d{1,2}):(\d{2})/);
  const pad = (s: string) => s.padStart(2, "0");
  if (!m) {
    const start = new Date(`${date}T00:00:00+08:00`);
    return { startAt: start, endAt: start };
  }
  const startAt = new Date(`${date}T${pad(m[1])}:${m[2]}:00+08:00`);
  let endAt = new Date(`${date}T${pad(m[3])}:${m[4]}:00+08:00`);
  if (endAt <= startAt) endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
  return { startAt, endAt };
}

function parseLocation(name: string): string | null {
  const m = name.match(/[（(]([^）)]+)[）)]/);
  return m?.[1]?.trim() || null;
}

export function isValidYmd(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00+08:00`).getTime());
}

export async function fetchFitbookCourses(store: FitbookStore, date: string): Promise<FitbookCourse[]> {
  if (!isValidYmd(date)) throw new Error("日期格式錯誤");
  const res = await fetch(
    `${FITBOOK_BASE}/${store.urlName}/course/${store.storeId}?date=${encodeURIComponent(date)}`,
    {
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`FitBook 回應錯誤 (${res.status})`);
  const json = (await res.json()) as { courses?: RawCourse[] };

  return (json.courses ?? []).flatMap((c): FitbookCourse[] => {
    const url = c.url ?? "";
    const courseId = url.match(/\/member\/course\/(\d+)\//)?.[1];
    if (!courseId) return [];
    const name = c.name?.trim() ?? "";
    const showTime = c.show_time ?? "";
    const reservationCount = Number(c.reservation_count ?? 0);
    const remainCount = Number(c.remain_count ?? 0);
    return [
      {
        courseId,
        name,
        categoryName: c.category_name?.trim() ?? "",
        teacherName: c.teacher_name?.trim() ?? "",
        date,
        showTime,
        ...parseTimeRange(date, showTime),
        location: parseLocation(name),
        reservationCount,
        remainCount,
        capacity: Number(c.order_count ?? reservationCount + remainCount),
        url,
      },
    ];
  });
}

export async function findFitbookCourse(
  store: FitbookStore,
  date: string,
  courseId: string,
): Promise<FitbookCourse | null> {
  const courses = await fetchFitbookCourses(store, date);
  return courses.find((c) => c.courseId === courseId) ?? null;
}

export type FitbookRosterEntry = { name: string; duprId: string | null };

const MEMBER_LIST_HEADINGS = new Set(["已預約會員", "候補會員"]);

/** 同一帳號代多人報名時暱稱會重複出現，依序加上 (2)、(3) 區分 */
function numberDuplicateNames(names: string[]): FitbookRosterEntry[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    return { name: n === 1 ? name : `${name} (${n})`, duprId: null };
  });
}

/** 解析從 FitBook 課程頁「已預約會員」複製的文字（一行一位，夾雜空行） */
export function parseFitbookMemberList(text: string): FitbookRosterEntry[] {
  return numberDuplicateNames(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !MEMBER_LIST_HEADINGS.has(line)),
  );
}

export function fitbookMemberCourseUrl(store: FitbookStore, courseId: string) {
  return `${FITBOOK_BASE}/${store.urlName}/member/course/${encodeURIComponent(courseId)}/${store.storeId}`;
}

function decodeHtmlText(s: string) {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

export type FitbookCoursePage =
  | { loggedIn: false }
  | { loggedIn: true; accountName: string | null; roster: FitbookRosterEntry[] };

/** 解析登入後的 FitBook 課程頁（/member/course/{id}/{storeId}）：「已預約會員」區塊每位一個 <p class="… truncate …"> */
export function parseFitbookCoursePage(html: string): FitbookCoursePage {
  if (!html.includes("/member/logout/")) return { loggedIn: false };

  const accountName = decodeHtmlText(html.match(/<option value="">([^<]*?)\s*[（(]自己[)）]\s*<\/option>/)?.[1] ?? "") || null;

  const start = html.indexOf("已預約會員");
  if (start < 0) return { loggedIn: true, accountName, roster: [] };
  const end = html.indexOf("<h2", start);
  const section = html.slice(start, end < 0 ? undefined : end);
  const names = [...section.matchAll(/<p\s+class="[^"]*\btruncate\b[^"]*"[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => decodeHtmlText(m[1]))
    .filter(Boolean);
  return { loggedIn: true, accountName, roster: numberDuplicateNames(names) };
}

const MOCK_NAMES = [
  "建伸", "小昱", "Kevin 陳", "阿杰", "美美", "Amy", "大偉", "小芳", "Jason", "阿志",
  "佩琪", "Leo", "小安", "Tina 林", "宗翰", "阿傑", "Ivy", "家豪", "Momo", "思妤",
  "Eric", "冠宇", "小萱", "Ray", "怡君", "阿凱", "Joanne", "承恩", "Vicky", "柏翰",
  "Sandy", "志明", "小P", "Allen 黃", "雅婷", "阿Ben", "Cindy", "俊傑", "小魚", "Mark",
  "欣怡", "Andy", "詩涵", "阿豪", "Peggy", "彥廷", "Jerry", "小熊", "Sharon", "育誠",
];

const DUPR_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function seededRng(seedText: string) {
  let h = 2166136261;
  for (const ch of seedText) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 模擬 FitBook 報名名單：同一課程 ID 每次產生相同結果；約 8 成附模擬 DUPR ID（SIM 開頭） */
export function mockFitbookRoster(courseId: string, count: number): FitbookRosterEntry[] {
  const rng = seededRng(`fitbook:${courseId}`);
  const pool = [...MOCK_NAMES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return Array.from({ length: count }, (_, i) => {
    const base = pool[i % pool.length];
    const name = i < pool.length ? base : `${base}${Math.floor(i / pool.length) + 1}`;
    const hasDupr = rng() < 0.8;
    const duprId = hasDupr
      ? `SIM${Array.from({ length: 3 }, () => DUPR_ID_CHARS[Math.floor(rng() * DUPR_ID_CHARS.length)]).join("")}`
      : null;
    return { name, duprId };
  });
}
