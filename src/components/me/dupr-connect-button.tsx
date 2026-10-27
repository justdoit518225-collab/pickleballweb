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
        className="btn-brand inline-flex items-center gap-2 px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "連結中…" : label}
      </button>
      {error && <p className="mt-2 text-sm font-bold text-rose-800">{error}</p>}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="登入 DUPR"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-brand-navy px-4 py-3 text-white">
              <p className="text-sm font-extrabold">登入 DUPR 官方帳號</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 text-white/80 hover:bg-white/10 hover:text-white"
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
