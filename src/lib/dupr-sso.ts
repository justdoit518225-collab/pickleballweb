/**
 * DUPR SSO（「用 DUPR 登入」連結帳號）
 * 文件：https://dupr.gitbook.io/dupr-raas/integration-checklist/sso-login
 * 需 DUPR 合作夥伴 onboarding 提供的 clientKey（DUPR_SSO_CLIENT_KEY）。
 */

const ENVIRONMENTS = {
  prod: { dashboard: "https://dashboard.dupr.com", api: "https://api.dupr.com" },
  uat: { dashboard: "https://uat.dupr.gg", api: "https://api.uat.dupr.gg" },
} as const;

function environment() {
  return process.env.DUPR_ENV?.trim().toLowerCase() === "uat" ? ENVIRONMENTS.uat : ENVIRONMENTS.prod;
}

export type DuprSsoConfig = { iframeSrc: string; origin: string };

export function getDuprSsoConfig(): DuprSsoConfig | null {
  const clientKey = process.env.DUPR_SSO_CLIENT_KEY?.trim();
  if (!clientKey) return null;
  const { dashboard } = environment();
  return {
    iframeSrc: `${dashboard}/login-external-app/${Buffer.from(clientKey).toString("base64")}`,
    origin: new URL(dashboard).origin,
  };
}

export type DuprBasicInfo = { duprId: string; fullName: string | null };

/** 以 SSO 取得的 user token 向 DUPR 確認身分（token 由瀏覽器傳來，不可直接信任其中的 DUPR ID） */
export async function fetchDuprBasicInfo(userToken: string): Promise<DuprBasicInfo> {
  const res = await fetch(`${environment().api}/public/user/info`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${userToken}` },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) throw new Error("DUPR 登入已失效，請重新登入");
  if (!res.ok) throw new Error(`DUPR 驗證失敗 (${res.status})`);
  const json = (await res.json()) as {
    status?: string;
    results?: { duprId?: string; fullName?: string }[];
    errors?: { message?: string }[];
  };
  const info = json.results?.[0];
  if (json.status !== "SUCCESS" || !info?.duprId) {
    throw new Error(json.errors?.[0]?.message ?? "無法取得 DUPR 帳號資料");
  }
  return { duprId: info.duprId.trim().toUpperCase(), fullName: info.fullName?.trim() || null };
}

function parseRating(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** SSO 回傳的 stats（單打／雙打積分；未評等為 NR） */
export function parseSsoRatings(stats: unknown): { singles: number | null; doubles: number | null } {
  let s = stats;
  if (typeof s === "string") {
    try {
      s = JSON.parse(s);
    } catch {
      return { singles: null, doubles: null };
    }
  }
  if (!s || typeof s !== "object") return { singles: null, doubles: null };
  const o = s as Record<string, unknown>;
  return { singles: parseRating(o.singles), doubles: parseRating(o.doubles) };
}
