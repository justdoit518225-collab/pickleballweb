"use client";

import { signIn } from "next-auth/react";
import { useTransition } from "react";
import { unlinkOAuthAccount } from "@/app/me/account-actions";
import { OAUTH_PROVIDER_LABELS, type OAuthProviderId } from "@/lib/oauth-providers";
import { ROUTES } from "@/lib/constants";

export type LinkedAccountView = {
  provider: OAuthProviderId;
  providerAccountId: string;
};

export function LinkedAccountsPanel({
  email,
  linkedAccounts,
  configuredProviders,
}: {
  email: string | null;
  linkedAccounts: LinkedAccountView[];
  configuredProviders: OAuthProviderId[];
}) {
  const [pending, startTransition] = useTransition();
  const linkedMap = new Map(linkedAccounts.map((a) => [a.provider, a]));

  function handleLink(provider: OAuthProviderId) {
    void signIn(provider, { callbackUrl: `${ROUTES.meAccounts}?linked=${provider}` });
  }

  function handleUnlink(provider: OAuthProviderId) {
    const label = OAUTH_PROVIDER_LABELS[provider];
    if (
      !confirm(
        `確定解除 ${label} 連結？\n解除後將無法再用 ${label} 登入此帳號（若仍保留其他登入方式則不影響使用）。`,
      )
    ) {
      return;
    }
    const formData = new FormData();
    formData.set("provider", provider);
    startTransition(() => {
      void unlinkOAuthAccount(formData);
    });
  }

  if (configuredProviders.length === 0) {
    return (
      <div className="bg-white p-6">
        <p className="text-base text-[var(--muted)]">目前未設定任何第三方登入，請聯絡管理員。</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 bg-white p-6 sm:p-8">
      <div>
        <h2 className="text-2xl font-extrabold text-brand-navy">綁定登入方式</h2>
        {email ? (
          <p className="mt-2 text-base text-[var(--muted)]">
            帳號主要信箱：<span className="font-bold text-brand-navy">{email}</span>
          </p>
        ) : (
          <p className="mt-2 text-base text-[var(--muted)]">
            此帳號尚未記錄 Email（例如僅用 LINE 登入）。建議同時連結 Google 以便跨裝置識別。
          </p>
        )}
      </div>

      <ul className="space-y-3">
        {configuredProviders.map((provider) => {
          const linked = linkedMap.get(provider);
          const label = OAUTH_PROVIDER_LABELS[provider];
          const canUnlink = linkedAccounts.length > 1;

          return (
            <li
              key={provider}
              className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg)] px-5 py-4"
            >
              <div>
                <p className="text-lg font-extrabold text-brand-navy">{label}</p>
                {linked ? (
                  <p className="mt-0.5 text-sm font-bold text-[#1D6D75]">已連結綁定</p>
                ) : (
                  <p className="mt-0.5 text-sm text-[var(--muted)]">尚未連結</p>
                )}
              </div>
              <div className="flex gap-2">
                {linked ? (
                  <button
                    type="button"
                    disabled={pending || !canUnlink}
                    onClick={() => handleUnlink(provider)}
                    className="bg-rose-100 px-4 py-2 text-sm font-bold text-rose-900 hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                      canUnlink ? undefined : "至少需保留一種登入方式，無法全部解除"
                    }
                  >
                    解除連結
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleLink(provider)}
                    className="btn-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    連結 {label}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
