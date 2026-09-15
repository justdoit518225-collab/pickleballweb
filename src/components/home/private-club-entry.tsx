"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { submitHomePrivateAccessCode } from "@/app/home-private-access";
import { ROUTES } from "@/lib/constants";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-brand-navy hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? "驗證中…" : "輸入邀請碼加入"}
    </button>
  );
}

export function PrivateClubEntry({
  error,
  isLoggedIn,
}: {
  error?: string;
  isLoggedIn: boolean;
}) {
  if (!isLoggedIn) {
    return (
      <div className="mt-4 space-y-2">
        <Link
          href={ROUTES.loginWithCallback(`${ROUTES.home}?private=1`)}
          className="inline-flex rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          使用 Google / LINE 登入
        </Link>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={submitHomePrivateAccessCode} className="mt-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          name="accessCode"
          required
          autoComplete="off"
          placeholder="請輸入邀請碼"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono uppercase tracking-wider"
        />
        <SubmitButton />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
