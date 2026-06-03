import Link from "next/link";
import { auth } from "@/auth";
import { LinkedAccountsPanel, type LinkedAccountView } from "@/components/auth/linked-accounts-panel";
import {
  getConfiguredOAuthProviders,
  OAUTH_PROVIDER_LABELS,
  type OAuthProviderId,
} from "@/lib/oauth-providers";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

const STATUS_MESSAGES: Record<string, string> = {
  provider_taken:
    "此 Google／LINE 帳號已綁定到其他會員。請改用該帳號登入，或聯絡管理員協助合併。",
  last_account: "至少需保留一種登入方式，無法解除最後一個連結。",
  not_linked: "此登入方式尚未連結。",
  invalid_provider: "不支援的登入方式。",
  OAuthAccountNotLinked:
    "此信箱已用其他方式註冊。請先用原登入方式進入會員中心，再到「登入方式」連結新平台。",
};

function linkedMessage(linked: string | undefined): string | undefined {
  if (!linked) return undefined;
  const id = linked as OAuthProviderId;
  const label = OAUTH_PROVIDER_LABELS[id] ?? linked;
  return `已成功連結 ${label}。`;
}

function unlinkedMessage(unlinked: string | undefined): string | undefined {
  if (!unlinked) return undefined;
  const id = unlinked as OAuthProviderId;
  const label = OAUTH_PROVIDER_LABELS[id] ?? unlinked;
  return `已解除 ${label} 連結。`;
}

export default async function MeAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{
    linked?: string;
    unlinked?: string;
    error?: string;
  }>;
}) {
  const session = await auth();
  const userId = session!.user!.id;
  const sp = await searchParams;

  const [accounts, user] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      select: { provider: true, providerAccountId: true },
      orderBy: { provider: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    }),
  ]);

  const configuredProviders = getConfiguredOAuthProviders();
  const linkedAccounts: LinkedAccountView[] = accounts
    .filter((a): a is { provider: OAuthProviderId; providerAccountId: string } =>
      (["google", "line"] as const).includes(a.provider as OAuthProviderId),
    )
    .map((a) => ({
      provider: a.provider as OAuthProviderId,
      providerAccountId: a.providerAccountId,
    }));

  const successMessage = linkedMessage(sp.linked) ?? unlinkedMessage(sp.unlinked);
  const errorMessage = sp.error ? STATUS_MESSAGES[sp.error] ?? "操作失敗，請稍後再試。" : undefined;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p>
          連結多種登入方式後，可用 <strong className="text-slate-800">Google 或 LINE</strong>{" "}
          登入同一個會員帳號，預約與場館資料會共用。
        </p>
        <p className="mt-2">
          若曾分別用 Google、LINE 登入而變成兩個帳號，請先決定要保留哪一個，用該方式登入後，再在此連結另一種平台。
        </p>
      </section>

      {successMessage && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </p>
      )}
      {errorMessage && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {errorMessage}
        </p>
      )}

      <LinkedAccountsPanel
        email={user?.email ?? null}
        linkedAccounts={linkedAccounts}
        configuredProviders={configuredProviders}
      />

      <p className="text-sm text-slate-500">
        <Link href={ROUTES.me} className="text-brand-navy hover:underline">
          ← 返回會員中心總覽
        </Link>
      </p>
    </div>
  );
}
