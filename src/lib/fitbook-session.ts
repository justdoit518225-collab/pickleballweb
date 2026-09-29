import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import {
  fetchFitbookCourses,
  fitbookMemberCourseUrl,
  getFitbookStore,
  parseFitbookCoursePage,
  type FitbookCoursePage,
  type FitbookRosterEntry,
  type FitbookStore,
} from "@/lib/fitbook";
import { prisma } from "@/lib/prisma";
import { getTaipeiYmd } from "@/lib/venue-timezone";

/**
 * FitBook 只能用 LINE 登入，伺服器無法自行登入；由場館管理員從瀏覽器複製登入後的 Cookie 標頭貼上，
 * 加密存於 Tenant。每次請求都把 FitBook 回傳的 Set-Cookie 寫回，讓登入狀態持續延長。
 */

export class FitbookSessionError extends Error {}

const EXPIRED_MESSAGE = "FitBook 登入已失效，請場館管理員到「設定」重新貼上 FitBook Cookie，或改用貼上名單";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const IGNORED_COOKIE = /^(_ga|_gcl|_gid|_fbp)/;

function cipherKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return createHash("sha256").update(`fitbook-cookie:${secret}`).digest();
}

function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cipherKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

function decrypt(value: string): string | null {
  try {
    const [iv, tag, data] = value.split(".").map((p) => Buffer.from(p, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", cipherKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

type CookieJar = Map<string, string>;

/** 接受 DevTools「Cookie」請求標頭的值（可含開頭的 "cookie:"） */
export function parseCookieInput(raw: string): CookieJar {
  const jar: CookieJar = new Map();
  const text = raw.trim().replace(/^cookie:\s*/i, "");
  for (const part of text.split(/;\s*|\r?\n/)) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    const name = part.slice(0, i).trim();
    if (!name || IGNORED_COOKIE.test(name)) continue;
    jar.set(name, part.slice(i + 1).trim());
  }
  return jar;
}

function serializeJar(jar: CookieJar) {
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

function applySetCookies(jar: CookieJar, setCookies: string[]) {
  for (const header of setCookies) {
    const [pair, ...attrs] = header.split(";");
    const i = pair.indexOf("=");
    if (i <= 0) continue;
    const name = pair.slice(0, i).trim();
    const removed = attrs.some((a) => {
      const [k, v = ""] = a.trim().split("=");
      if (/^max-age$/i.test(k)) return Number(v) <= 0;
      if (/^expires$/i.test(k)) return new Date(v).getTime() < Date.now();
      return false;
    });
    if (removed) jar.delete(name);
    else jar.set(name, pair.slice(i + 1).trim());
  }
}

async function fetchCoursePage(store: FitbookStore, courseId: string, jar: CookieJar): Promise<FitbookCoursePage> {
  let res: Response;
  try {
    res = await fetch(fitbookMemberCourseUrl(store, courseId), {
      headers: { Cookie: serializeJar(jar), Accept: "text/html", "User-Agent": USER_AGENT },
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    throw new FitbookSessionError("無法連線 FitBook，請稍後再試");
  }
  if (res.status >= 300 && res.status < 400) return { loggedIn: false };
  if (!res.ok) throw new FitbookSessionError(`FitBook 回應錯誤 (${res.status})`);
  const page = parseFitbookCoursePage(await res.text());
  if (page.loggedIn) applySetCookies(jar, res.headers.getSetCookie());
  return page;
}

export type FitbookConnection = {
  status: "none" | "ok" | "expired";
  accountName: string | null;
  setAt: Date | null;
  lastOkAt: Date | null;
};

export async function getFitbookConnection(tenantId: string): Promise<FitbookConnection> {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      fitbookCookieEnc: true,
      fitbookAccountName: true,
      fitbookCookieSetAt: true,
      fitbookCookieLastOkAt: true,
      fitbookCookieExpiredAt: true,
    },
  });
  return {
    status: !t?.fitbookCookieEnc ? "none" : t.fitbookCookieExpiredAt ? "expired" : "ok",
    accountName: t?.fitbookAccountName ?? null,
    setAt: t?.fitbookCookieSetAt ?? null,
    lastOkAt: t?.fitbookCookieLastOkAt ?? null,
  };
}

/** 以場館保存的 FitBook 登入抓取該場「已預約會員」；未設定回傳 null，登入失效或連線失敗丟 FitbookSessionError */
export async function fetchTenantFitbookRoster(
  tenantId: string,
  store: FitbookStore,
  courseId: string,
): Promise<FitbookRosterEntry[] | null> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { fitbookCookieEnc: true } });
  if (!t?.fitbookCookieEnc) return null;

  const plain = decrypt(t.fitbookCookieEnc);
  const jar = parseCookieInput(plain ?? "");
  const page = plain ? await fetchCoursePage(store, courseId, jar) : null;
  if (!page?.loggedIn) {
    await prisma.tenant.update({ where: { id: tenantId }, data: { fitbookCookieExpiredAt: new Date() } });
    throw new FitbookSessionError(EXPIRED_MESSAGE);
  }
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      fitbookCookieEnc: encrypt(serializeJar(jar)),
      fitbookAccountName: page.accountName ?? undefined,
      fitbookCookieLastOkAt: new Date(),
      fitbookCookieExpiredAt: null,
    },
  });
  return page.roster;
}

async function findTestCourseId(store: FitbookStore): Promise<string | null> {
  const today = new Date(`${getTaipeiYmd(new Date())}T00:00:00+08:00`);
  for (let i = 0; i < 7; i++) {
    const ymd = getTaipeiYmd(new Date(today.getTime() + i * 24 * 60 * 60 * 1000));
    const courses = await fetchFitbookCourses(store, ymd).catch(() => []);
    if (courses[0]) return courses[0].courseId;
  }
  return null;
}

/** 儲存並立即測試；成功回傳 FitBook 帳號名稱 */
export async function saveTenantFitbookCookie(
  tenantId: string,
  store: FitbookStore,
  raw: string,
): Promise<{ accountName: string | null; tested: boolean }> {
  const jar = parseCookieInput(raw);
  if (jar.size === 0) throw new FitbookSessionError("看不到 Cookie 內容，請複製整段 Cookie 標頭的值");

  const courseId = await findTestCourseId(store);
  let accountName: string | null = null;
  if (courseId) {
    const page = await fetchCoursePage(store, courseId, jar);
    if (!page.loggedIn) throw new FitbookSessionError("這組 Cookie 沒有登入狀態，請確認已在 FitBook 登入後再複製");
    accountName = page.accountName;
  }

  const now = new Date();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      fitbookCookieEnc: encrypt(serializeJar(jar)),
      fitbookAccountName: accountName,
      fitbookCookieSetAt: now,
      fitbookCookieLastOkAt: courseId ? now : null,
      fitbookCookieExpiredAt: null,
    },
  });
  return { accountName, tested: courseId !== null };
}

/** 每日排程：FitBook 的 laravel_session 效期 7 天、每次請求重新起算，定期讀一次課程頁維持登入 */
export async function keepAliveFitbookSessions() {
  const tenants = await prisma.tenant.findMany({
    where: { fitbookCookieEnc: { not: null }, fitbookCookieExpiredAt: null },
    select: { id: true, slug: true },
  });
  const results: { slug: string; ok: boolean; message?: string }[] = [];
  for (const t of tenants) {
    const store = getFitbookStore(t.slug);
    if (!store) continue;
    try {
      const courseId = await findTestCourseId(store);
      if (!courseId) {
        results.push({ slug: t.slug, ok: false, message: "近 7 天沒有場次" });
        continue;
      }
      await fetchTenantFitbookRoster(t.id, store, courseId);
      results.push({ slug: t.slug, ok: true });
    } catch (e) {
      results.push({ slug: t.slug, ok: false, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}

export async function clearTenantFitbookCookie(tenantId: string) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      fitbookCookieEnc: null,
      fitbookAccountName: null,
      fitbookCookieSetAt: null,
      fitbookCookieLastOkAt: null,
      fitbookCookieExpiredAt: null,
    },
  });
}
