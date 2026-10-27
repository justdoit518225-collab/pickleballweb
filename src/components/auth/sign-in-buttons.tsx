"use client";

import { getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

type ProviderMap = Awaited<ReturnType<typeof getProviders>>;

function safeCallbackUrl(url: string | undefined): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/me";
}

export function SignInButtons({ callbackUrl }: { callbackUrl?: string }) {
  const [providers, setProviders] = useState<ProviderMap>(null);
  const nextUrl = safeCallbackUrl(callbackUrl);

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  if (!providers) {
    return (
      <p className="text-sm font-semibold text-[var(--muted)]">載入登入方式…</p>
    );
  }

  const hasGoogle = Boolean(providers.google);
  const hasLine = Boolean(providers.line);

  return (
    <div className="flex w-full flex-col gap-3" data-ui>
      {hasGoogle ? (
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: nextUrl })}
          className="w-full border border-[var(--border)] bg-[var(--bg)] px-5 py-3.5 text-sm font-extrabold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
        >
          使用 Google 帳號登入 →
        </button>
      ) : (
        <p className="bg-[var(--surface-alt)] px-4 py-3 text-sm font-medium text-[var(--muted)]">
          Google 登入尚未設定（見 .env 的 GOOGLE_CLIENT_ID）
        </p>
      )}
      {hasLine ? (
        <button
          type="button"
          onClick={() => signIn("line", { callbackUrl: nextUrl })}
          className="w-full bg-[#06C755] px-5 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-[#05b34c]"
        >
          使用 LINE 帳號登入 →
        </button>
      ) : (
        <p className="bg-[var(--surface-alt)] px-4 py-3 text-sm font-medium text-[var(--muted)]">
          LINE 登入尚未設定（見 docs/LINE_LOGIN.md）
        </p>
      )}
    </div>
  );
}
