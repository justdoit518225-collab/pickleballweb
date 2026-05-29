"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/lib/constants";

export function PrivateClubEntry() {
  const router = useRouter();
  const [slug, setSlug] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!s) return;
    router.push(ROUTES.tenantAccess(s));
  }

  return (
    <form onSubmit={go} className="mt-4 flex flex-wrap gap-2">
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="俱樂部網址代碼（slug）"
        className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-brand-navy hover:bg-slate-50"
      >
        輸入邀請碼進入
      </button>
    </form>
  );
}
