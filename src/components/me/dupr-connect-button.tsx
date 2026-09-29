"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { connectDuprSso } from "@/app/me/actions";

type SsoPayload = { userToken: string; stats?: unknown };

function readSsoPayload(data: unknown): SsoPayload | null {
  let d = data;
  if (typeof d === "string") {
    try {
      d = JSON.parse(d);
    } catch {
      return null;
    }
  }
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  const userToken = o.userToken ?? o.accessToken;
  if (typeof userToken !== "string" || !userToken) return null;
  return { userToken, stats: o.stats };
}

export function DuprConnectButton({
  iframeSrc,
  origin,
  label,
}: {
  iframeSrc: string;
  origin: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onMessage(event: MessageEvent) {
      if (event.origin !== origin) return;
      const payload = readSsoPayload(event.data);
      if (!payload) return;
      setOpen(false);
      startTransition(async () => {
        const result = await connectDuprSso(payload);
        if (result.ok) router.refresh();
        else setError(result.error);
      });
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, origin, router]);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "連結中…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="登入 DUPR"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <p className="text-sm font-semibold text-slate-700">登入 DUPR</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                aria-label="關閉"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe src={iframeSrc} allow="payment" title="DUPR 登入" className="h-[640px] max-h-[75vh] w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
