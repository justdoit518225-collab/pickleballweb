/**
 * DUPR Backend API（https://api.dupr.gg）
 * Public 文件：https://events.mydupr.com/api-explorer?group=public
 *
 * 依 DUPR ID 查詢球員：需 Partner read-only token（DUPR_API_KEY）
 * 或 DUPR_CLIENT_ID + DUPR_CLIENT_SECRET 換取 token。
 */

const DEFAULT_BASE = "https://api.dupr.gg";
const DEFAULT_VERSION = "v1.0";

export type DuprPlayerSnapshot = {
  duprId: string;
  duprName: string | null;
  singlesRating: number | null;
  doublesRating: number | null;
  profileUrl: string;
  rawData: unknown;
};

type DuprEnvelope<T> = {
  status?: string;
  result?: T;
  results?: T[];
  message?: string;
  errors?: { message?: string }[];
};

function baseUrl() {
  return (process.env.DUPR_API_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
}

function apiVersion() {
  return process.env.DUPR_API_VERSION ?? DEFAULT_VERSION;
}

function parseRating(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(n) ? n : null;
}

function pickDuprId(data: Record<string, unknown>, fallback: string): string {
  const candidates = [
    data.duprId,
    data.referralCode,
    data.displayId,
    data.username,
    data.id != null ? String(data.id) : null,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim().toUpperCase();
  }
  return fallback.trim().toUpperCase();
}

function mapPlayerResult(
  raw: Record<string, unknown>,
  requestedDuprId: string,
): DuprPlayerSnapshot {
  const stats =
    raw.stats && typeof raw.stats === "object"
      ? (raw.stats as Record<string, unknown>)
      : {};
  const ratings =
    raw.ratings && typeof raw.ratings === "object"
      ? (raw.ratings as Record<string, unknown>)
      : {};

  const duprId = pickDuprId(raw, requestedDuprId);
  const duprName =
    (typeof raw.fullName === "string" && raw.fullName) ||
    (typeof raw.name === "string" && raw.name) ||
    (typeof raw.duprName === "string" && raw.duprName) ||
    null;

  const singlesRating =
    parseRating(stats.singles) ??
    parseRating(stats.singlesRating) ??
    parseRating(ratings.singles) ??
    parseRating(raw.singlesRating);

  const doublesRating =
    parseRating(stats.doubles) ??
    parseRating(stats.doublesRating) ??
    parseRating(ratings.doubles) ??
    parseRating(raw.doublesRating);

  return {
    duprId,
    duprName,
    singlesRating,
    doublesRating,
    profileUrl: `https://www.dupr.com/dashboard/player/${duprId}`,
    rawData: raw,
  };
}

function unwrapResult<T>(json: DuprEnvelope<T> & Record<string, unknown>): T | null {
  if (json.status === "FAILURE") {
    const msg =
      json.message ??
      json.errors?.[0]?.message ??
      (typeof json.result === "string" ? json.result : null);
    throw new Error(msg ?? "DUPR API 回傳失敗");
  }
  if (json.result != null && typeof json.result === "object") {
    return json.result as T;
  }
  if (Array.isArray(json.results) && json.results[0] != null) {
    return json.results[0] as T;
  }
  return null;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getBearerToken(): Promise<string | null> {
  const staticKey = process.env.DUPR_API_KEY?.trim();
  if (staticKey) return staticKey;

  const clientId = process.env.DUPR_CLIENT_ID?.trim();
  const clientSecret = process.env.DUPR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const version = apiVersion();
  const res = await fetch(`${baseUrl()}/auth/${version}/login-read-only-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
    cache: "no-store",
  });

  const json = (await res.json()) as DuprEnvelope<{ accessToken?: string; token?: string }> & {
    accessToken?: string;
    token?: string;
  };

  if (!res.ok) {
    throw new Error(json.message ?? `DUPR 登入失敗 (${res.status})`);
  }

  const result = unwrapResult(json) ?? json;
  const token =
    (result && typeof result === "object" && "accessToken" in result
      ? (result as { accessToken?: string }).accessToken
      : null) ??
    json.accessToken ??
    json.token ??
    (typeof json.result === "string" ? json.result : null);

  if (!token) throw new Error("DUPR 未取得 access token");

  cachedToken = { token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return token;
}

async function duprFetch(path: string, init?: RequestInit) {
  const token = await getBearerToken();
  if (!token) {
    throw new Error("未設定 DUPR_API_KEY（或 DUPR_CLIENT_ID / DUPR_CLIENT_SECRET）");
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let json: DuprEnvelope<unknown> & Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as typeof json) : {};
  } catch {
    throw new Error(`DUPR API 回應格式錯誤 (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(
      json.message ?? json.errors?.[0]?.message ?? `DUPR API 錯誤 (${res.status})`,
    );
  }

  return json;
}

async function fetchPlayerById(duprId: string): Promise<DuprPlayerSnapshot | null> {
  const id = duprId.trim().toUpperCase();
  const version = apiVersion();
  const json = (await duprFetch(`/player/${version}/${encodeURIComponent(id)}`)) as DuprEnvelope<
    Record<string, unknown>
  > &
    Record<string, unknown>;
  const result = unwrapResult(json);
  if (!result || typeof result !== "object") return null;
  return mapPlayerResult(result, id);
}

async function searchPlayerPublic(duprId: string): Promise<DuprPlayerSnapshot | null> {
  const id = duprId.trim().toUpperCase();
  const version = apiVersion();
  const json = await duprFetch(`/player/${version}/search/public`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: id,
      limit: 10,
      offset: 0,
    }),
  });

  const envelope = json as DuprEnvelope<{ hits?: Record<string, unknown>[] }> & {
    hits?: Record<string, unknown>[];
  };
  const result = unwrapResult(envelope) as { hits?: Record<string, unknown>[] } | null;
  const hits =
    result?.hits ??
    envelope.hits ??
    (Array.isArray(envelope.result) ? (envelope.result as Record<string, unknown>[]) : []);

  if (!Array.isArray(hits) || hits.length === 0) return null;

  const exact =
    hits.find((h) => pickDuprId(h, id).toUpperCase() === id) ??
    hits.find((h) => String(h.referralCode ?? "").toUpperCase() === id) ??
    hits[0];

  return mapPlayerResult(exact, id);
}

/** 依 DUPR ID 查詢球員（先 GET 單筆，失敗再公開搜尋） */
export async function fetchDuprPlayerByDuprId(duprId: string): Promise<DuprPlayerSnapshot> {
  const id = duprId.trim();
  if (!id) throw new Error("請填寫 DUPR ID");

  try {
    const direct = await fetchPlayerById(id);
    if (direct) return direct;
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (!message.includes("404") && !message.toLowerCase().includes("not found")) {
      try {
        const fromSearch = await searchPlayerPublic(id);
        if (fromSearch) return fromSearch;
      } catch {
        throw e;
      }
      throw e;
    }
  }

  const fromSearch = await searchPlayerPublic(id);
  if (fromSearch) return fromSearch;

  throw new Error("找不到此 DUPR ID，請確認後再試");
}

export function isDuprApiConfigured(): boolean {
  return Boolean(
    process.env.DUPR_API_KEY?.trim() ||
      (process.env.DUPR_CLIENT_ID?.trim() && process.env.DUPR_CLIENT_SECRET?.trim()),
  );
}
