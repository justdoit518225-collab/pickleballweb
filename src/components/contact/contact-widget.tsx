"use client";

import { FormEvent, useEffect, useEffectEvent, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

type Msg = {
  id: string;
  body: string;
  senderKind: "VISITOR" | "ADMIN";
  createdAt: string;
};

type ThreadPayload = {
  thread: {
    id: string;
    displayName: string | null;
    contactEmail: string | null;
    status: string;
    visitorUnread: number;
  } | null;
  messages: Msg[];
};

export function ContactWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const knownIds = useRef(new Set<string>());

  const scrollToBottom = useEffectEvent(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  const load = useEffectEvent(async (opts: { clearUnread: boolean }) => {
    try {
      setLoading(true);
      const res = await fetch("/api/contact", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as ThreadPayload;
      const next = data.messages ?? [];
      if (opts.clearUnread) {
        setUnread(0);
      } else {
        const freshAdmin = next.filter(
          (m) => m.senderKind === "ADMIN" && !knownIds.current.has(m.id),
        ).length;
        if (freshAdmin > 0) setUnread((u) => u + freshAdmin);
      }
      for (const m of next) knownIds.current.add(m.id);
      setMessages(next);
      if (data.thread?.displayName) {
        setDisplayName((prev) => prev || data.thread!.displayName!);
      }
      if (data.thread?.contactEmail) {
        setContactEmail((prev) => prev || data.thread!.contactEmail!);
      }
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void load({ clearUnread: false });
  }, []);

  useEffect(() => {
    if (!open) return;
    void load({ clearUnread: true });
    const t = window.setInterval(() => void load({ clearUnread: true }), 8000);
    return () => window.clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [open, messages.length]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          displayName: displayName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "傳送失敗");
        return;
      }
      setDraft("");
      if (data.message) {
        knownIds.current.add(data.message.id);
        setMessages((prev) =>
          prev.some((m) => m.id === data.message.id)
            ? prev
            : [...prev, data.message as Msg],
        );
      } else {
        await load({ clearUnread: true });
      }
    } catch {
      setError("網路異常，請稍後再試");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open ? (
        <div className="pointer-events-auto flex h-[min(32rem,calc(100vh-6rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between bg-brand-navy px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">聯繫我們</p>
              <p className="text-xs text-white/75">留言後我們會盡快回覆</p>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 hover:bg-white/10"
              aria-label="關閉聯繫視窗"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 border-b border-slate-100 px-3 py-2">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="怎麼稱呼你（選填）"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-brand-teal"
              maxLength={40}
            />
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Email（選填，方便回覆通知）"
              type="email"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-brand-teal"
              maxLength={120}
            />
          </div>

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-3">
            {loading && messages.length === 0 ? (
              <p className="text-center text-xs text-slate-400">載入中…</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-xs leading-relaxed text-slate-500">
                有球拍、試打或場館相關問題，直接在這裡留言即可。
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.senderKind === "VISITOR";
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                        mine
                          ? "rounded-br-md bg-brand-teal text-white"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {!mine ? (
                        <p className="mb-0.5 text-[10px] font-medium text-brand-navy">
                          管理員
                        </p>
                      ) : null}
                      {m.body}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-slate-100 bg-white p-3">
            {error ? <p className="mb-2 text-xs text-rose-600">{error}</p> : null}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="輸入訊息…"
                className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-teal"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white disabled:opacity-40"
                aria-label="送出"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className="pointer-events-auto relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy text-white shadow-lg shadow-slate-900/20 transition hover:bg-brand-navy/90"
        aria-label="打開聯繫視窗"
        onClick={() => {
          setOpen((v) => !v);
          setUnread(0);
        }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
    </div>
  );
}
