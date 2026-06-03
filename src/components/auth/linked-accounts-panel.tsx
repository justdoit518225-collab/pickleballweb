"use client";

import { signIn } from "next-auth/react";
import { useTransition } from "react";
import { unlinkOAuthAccount } from "@/app/me/account-actions";
import {
  OAUTH_PROVIDER_LABELS,
  type OAuthProviderId,
  maskProviderAccountId,
} from "@/lib/oauth-providers";
import { ROUTES } from "@/lib/constants";

export type LinkedAccountView = {
  provider: OAuthProviderId;
  providerAccountId: string;
};

const LINK_CLASS =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

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
      <p className="text-sm text-slate-500">目前未設定任何第三方登入，請聯絡管理員。</p>
    );
  }

  return (
    <div className="space-y-4">
      {email ? (
        <p className="text-sm text-slate-600">
          帳號主要信箱：<span className="font-medium text-slate-800">{email}</span>
        </p>
      ) : (
        <p className="text-sm text-slate-600">
          此帳號尚未記錄 Email（例如僅用 LINE 登入）。建議連結 Google 以便跨裝置識別。
        </p>
      )}

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {configuredProviders.map((provider) => {
          const linked = linkedMap.get(provider);
          const label = OAUTH_PROVIDER_LABELS[provider];
          const canUnlink = linkedAccounts.length > 1;

          return (
            <li
              key={provider}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
            >
              <div>
                <p className="font-medium text-slate-800">{label}</p>
                {linked ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    已連結 · ID {maskProviderAccountId(linked.providerAccountId)}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-slate-500">尚未連結</p>
                )}
              </div>
              <div className="flex gap-2">
                {linked ? (
                  <button
                    type="button"
                    disabled={pending || !canUnlink}
                    onClick={() => handleUnlink(provider)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className={LINK_CLASS}
                  >
                    連結 {label}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-slate-500">
        請先使用目前已連結的方式登入，再於此頁連結其他平台。至少需保留一種登入方式，以免無法再登入。
      </p>
    </div>
  );
}
