"use client";

import { useFormStatus } from "react-dom";
import { submitHomePrivateAccessCode } from "@/app/home-private-access";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-brand-navy hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? "驗證中…" : "輸入邀請碼進入"}
    </button>
  );
}

export function PrivateClubEntry({ error }: { error?: string }) {
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
