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
      className="btn-brand-lime shrink-0 disabled:opacity-60"
    >
      {pending ? "驗證通行中…" : "驗證邀請碼進入 →"}
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
      <div className="mt-6 space-y-3">
        <Link
          href={ROUTES.loginWithCallback(`${ROUTES.home}?private=1`)}
          className="btn-brand-lime"
        >
          使用 Google / LINE 登入以輸入邀請碼 →
        </Link>
        {error ? (
          <p className="bg-rose-950/80 px-3 py-2 text-sm font-semibold text-rose-200" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={submitHomePrivateAccessCode} className="mt-6 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="home-access-code" className="sr-only">
          俱樂部邀請碼
        </label>
        <input
          id="home-access-code"
          name="accessCode"
          required
          autoComplete="off"
          placeholder="輸入俱樂部邀請碼（例如 CLUB2026）"
          className="min-w-[220px] flex-1 bg-white px-4 py-3 text-base font-bold tracking-widest text-brand-navy uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-[#4a5d73] focus:outline-2 focus:outline-offset-2 focus:outline-brand-lime"
        />
        <SubmitButton />
      </div>
      {error ? (
        <p className="bg-rose-950/80 px-3 py-2 text-sm font-semibold text-rose-200" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
