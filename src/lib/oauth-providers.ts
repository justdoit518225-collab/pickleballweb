export const OAUTH_PROVIDER_IDS = ["google", "line"] as const;
export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];

export const OAUTH_PROVIDER_LABELS: Record<OAuthProviderId, string> = {
  google: "Google",
  line: "LINE",
};

/** 依環境變數判斷已設定的登入方式（與 auth.ts 一致） */
export function getConfiguredOAuthProviders(): OAuthProviderId[] {
  const list: OAuthProviderId[] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    list.push("google");
  }
  if (process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET) {
    list.push("line");
  }
  return list;
}

export function maskProviderAccountId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}
