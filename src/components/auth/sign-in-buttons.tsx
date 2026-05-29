"use client";

import { signIn } from "next-auth/react";

export function SignInButtons({
  showGoogle,
  showLine,
}: {
  showGoogle: boolean;
  showLine: boolean;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      {showGoogle ? (
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/me" })}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium hover:bg-slate-50"
        >
          使用 Google 登入
        </button>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-sm text-slate-500">
          Google 登入尚未設定（見 .env）
        </p>
      )}
      {showLine ? (
        <button
          type="button"
          onClick={() => signIn("line", { callbackUrl: "/me" })}
          className="rounded-lg bg-[#06C755] px-4 py-3 text-sm font-medium text-white hover:bg-[#05b34c]"
        >
          使用 LINE 登入
        </button>
      ) : (
        <p className="text-center text-xs text-slate-500">LINE 登入需設定 LINE_CLIENT_ID</p>
      )}
    </div>
  );
}
