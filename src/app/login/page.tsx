import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { SignInButtons } from "@/components/auth/sign-in-buttons";
import { ROUTES } from "@/lib/constants";

/** 正式環境變數在 Vercel 設定後需執行期讀取，避免 build 時尚無 GOOGLE_* 被靜態快取 */
export const dynamic = "force-dynamic";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "此信箱已用其他登入方式註冊。請先用原方式登入，再到會員中心「登入方式」連結 Google 或 LINE。",
  AccessDenied: "Google 未授權登入，或尚未加入 OAuth 測試使用者。",
  Configuration: "登入設定有誤，請確認 AUTH_URL 與 Google 回調網址。",
  OAuthCallbackError:
    "登入回調失敗。請確認：① Vercel 的 AUTH_URL 與瀏覽器網址完全一致（含 www）；② LINE Callback URL 已登記相同網域；③ Channel secret 正確。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  const session = await auth();
  if (session?.user) {
    const next =
      callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : ROUTES.me;
    redirect(next);
  }

  const errorMessage = error ? AUTH_ERROR_MESSAGES[error] : undefined;

  return (
    <div className="page-wrap py-16 sm:py-24">
      <div className="mx-auto max-w-lg bg-[var(--surface)] p-8 sm:p-12">
        <Logo variant="horizontal" iconSize={44} nameSize="lg" href={ROUTES.home} />
        <h1 className="type-head mt-8 text-brand-navy">會員登入與註冊</h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
          使用 Google 或 LINE 帳號一鍵登入，即可加入俱樂部、報名臨打球敘與預約球場時段。
        </p>
        {errorMessage ? (
          <p className="mt-5 bg-amber-200 px-4 py-3 text-sm font-bold text-amber-950">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-8">
          <SignInButtons callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
