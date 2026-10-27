"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelButton({
  path,
  label = "取消",
  confirmText = "確定要取消嗎？",
}: {
  path: string;
  label?: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!window.confirm(confirmText)) return;
    setLoading(true);
    setError(null);
    const res = await fetch(path, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "取消失敗");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={onClick}
        className="bg-[var(--surface-alt)] px-3.5 py-2 text-sm font-bold text-brand-navy transition-colors hover:bg-rose-100 hover:text-rose-900 disabled:opacity-60"
      >
        {loading ? "處理中…" : label}
      </button>
      {error && <p className="text-xs font-bold text-rose-800">{error}</p>}
    </div>
  );
}
