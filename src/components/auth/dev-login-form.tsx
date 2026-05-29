"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function DevLoginForm({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="mt-6 w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        await signIn("dev-email", { email, callbackUrl: "/me" });
        setLoading(false);
      }}
    >
      <p className="text-xs font-medium text-amber-800">本地開發用登入（未設定 Google 時）</p>
      <label className="mt-3 block text-xs text-amber-900" htmlFor="dev-email">
        Email
      </label>
      <input
        id="dev-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-2 text-sm"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="mt-3 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {loading ? "登入中…" : "開發用登入"}
      </button>
    </form>
  );
}
