"use client";

import { useActionState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

export function ScoringPinForm({
  action,
}: {
  action: (prev: string | null, formData: FormData) => Promise<string | null>;
}) {
  const [error, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-center shadow-sm"
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
        <KeyRound className="h-5 w-5" />
      </div>
      <p className="mt-3 font-semibold text-indigo-900">輸入現場碼開始計分</p>
      <p className="mt-1 text-xs text-indigo-700">現場碼由負責人提供，這台平板輸入一次即可</p>
      <div className="mt-4 flex justify-center gap-2">
        <input
          name="pin"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="off"
          required
          placeholder="••••"
          className="w-40 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-indigo-600 px-5 text-base font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : "進入"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
  );
}
