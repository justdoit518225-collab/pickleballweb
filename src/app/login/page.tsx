import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { SignInButtons } from "@/components/auth/sign-in-buttons";
import { ROUTES } from "@/lib/constants";

/** 正式環境變數在 Vercel 設定後需執行期讀取，避免 build 時尚無 GOOGLE_* 被靜態快取 */
export const dynamic = "force-dynamic";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "此信箱已在系統中註冊（例如曾用開發信箱登入）。請再試一次 Google 登入；若仍失敗，請聯絡管理員。",
  AccessDenied: "Google 未授權登入，或尚未加入 OAuth 測試使用者。",
  Configuration: "登入設定有誤，請確認 AUTH_URL 與 Google 回調網址。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect(ROUTES.me);

  const { error } = await searchParams;
  const errorMessage = error ? AUTH_ERROR_MESSAGES[error] : undefined;

  const showGoogle = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  const showLine = Boolean(process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <Logo variant="stacked" iconSize={100} nameSize="xl" href={ROUTES.home} />
      <h1 className="mt-8 text-xl font-bold text-brand-navy">登入 / 註冊</h1>
      <p className="mt-2 text-center text-sm text-slate-600">
        使用 Google 或 LINE 帳號，即可跨場館預約活動
      </p>
      {errorMessage ? (
        <p className="mt-4 w-full max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
          {errorMessage}
        </p>
      ) : null}
      <div className="mt-8 flex w-full justify-center">
        <SignInButtons showGoogle={showGoogle} showLine={showLine} />
      </div>
    </div>
  );
}
