import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { DevLoginForm } from "@/components/auth/dev-login-form";
import { SignInButtons } from "@/components/auth/sign-in-buttons";
import { ROUTES } from "@/lib/constants";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect(ROUTES.me);

  const showGoogle = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  const showLine = Boolean(process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET);
  const devLogin = process.env.ALLOW_DEV_LOGIN === "true";
  const defaultEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? "";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <Logo variant="stacked" iconSize={100} nameSize="xl" href={ROUTES.home} />
      <h1 className="mt-8 text-xl font-bold text-brand-navy">登入 / 註冊</h1>
      <p className="mt-2 text-center text-sm text-slate-600">
        使用 Google 或 LINE 帳號，即可跨場館預約活動
      </p>
      <div className="mt-8 flex w-full justify-center">
        <SignInButtons showGoogle={showGoogle} showLine={showLine} />
      </div>
      {devLogin && <DevLoginForm defaultEmail={defaultEmail} />}
    </div>
  );
}
