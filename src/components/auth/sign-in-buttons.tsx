"use client";

import { getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

type ProviderMap = Awaited<ReturnType<typeof getProviders>>;

export function SignInButtons() {
  const [providers, setProviders] = useState<ProviderMap>(null);

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  if (!providers) {
    return (
      <p className="text-center text-sm text-slate-500">載入登入方式…</p>
    );
  }

  const hasGoogle = Boolean(providers.google);
  const hasLine = Boolean(providers.line);

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      {hasGoogle ? (
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/me" })}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium hover:bg-slate-50"
        >
          使用 Google 登入
        </button>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-sm text-slate-500">
          Google 登入尚未設定（見 .env 的 GOOGLE_CLIENT_ID）
        </p>
      )}
      {hasLine ? (
        <button
          type="button"
          onClick={() => signIn("line", { callbackUrl: "/me" })}
          className="rounded-lg bg-[#06C755] px-4 py-3 text-sm font-medium text-white hover:bg-[#05b34c]"
        >
          使用 LINE 登入
        </button>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-center text-sm text-slate-500">
          LINE 登入尚未設定（見 docs/LINE_LOGIN.md）
        </p>
      )}
    </div>
  );
}
