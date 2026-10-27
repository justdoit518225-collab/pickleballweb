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
      className="bg-brand-navy p-6 text-center text-white"
      data-ui
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center bg-brand-lime text-brand-navy">
        <KeyRound className="h-5 w-5" />
      </div>
      <p className="mt-3 text-lg font-extrabold text-white">輸入現場碼開始計分</p>
      <p className="mt-1 text-sm text-white/80">
        現場碼由負責人提供，這台裝置輸入一次即可
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <input
          name="pin"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="off"
          required
          placeholder="••••"
          className="w-40 bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.4em] text-brand-navy tabular-nums outline-none focus:outline-2 focus:outline-brand-lime"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-brand-lime px-6 text-base font-extrabold text-brand-navy disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : "進入計分"}
        </button>
      </div>
      {error && (
        <p className="mt-3 bg-rose-950/90 px-3 py-2 text-sm font-bold text-rose-200">
          {error}
        </p>
      )}
    </form>
  );
}
