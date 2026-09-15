"use client";

import { FormEvent, KeyboardEvent, useEffect, useEffectEvent, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageCircle, Send, X } from "lucide-react";
import { ContactAdminDock } from "@/components/contact/contact-admin-dock";
import {
  formatContactTime,
  type ContactMessageDto,
} from "@/lib/contact-ui";

type ThreadPayload = {
  thread: {
    id: string;
    displayName: string | null;
    contactEmail: string | null;
    status: string;
    visitorUnread: number;
  } | null;
  messages: ContactMessageDto[];
};

export function ContactWidget() {
  const { data: session } = useSession();
  if (session?.user?.platformRole === "SUPER_ADMIN") {
    return <ContactAdminDock />;
  }
  return <ContactVisitorWidget />;
}

function ContactVisitorWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ContactMessageDto[]>([]);
  const [status, setStatus] = useState<string>("OPEN");
  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [editIdentity, setEditIdentity] = useState(true);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hidden = pathname.startsWith("/platform");

  const scrollToBottom = useEffectEvent(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  const load = useEffectEvent(async (opts: { markRead: boolean }) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const timeout = window.setTimeout(() => ac.abort(), 8000);
    try {
      const qs = opts.markRead ? "" : "?peek=1";
      const res = await fetch(`/api/contact${qs}`, {
        cache: "no-store",
        signal: ac.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as ThreadPayload;
      const next = data.messages ?? [];
      setMessages((prev) => {
        if (next.length === 0 && prev.length > 0 && !data.thread) return prev;
        return next;
      });
      setStatus(data.thread?.status ?? "OPEN");
      if (opts.markRead) {
        setUnread(0);
      } else {
        setUnread(data.thread?.visitorUnread ?? 0);
      }
      if (data.thread?.displayName) {
        setDisplayName((prev) => prev || data.thread!.displayName!);
      }
      if (data.thread?.contactEmail) {
        setContactEmail((prev) => prev || data.thread!.contactEmail!);
      }
      if (next.length > 0) setEditIdentity(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  });

  useEffect(() => {
    if (hidden) return;
    void load({ markRead: open });
    const ms = open ? 3000 : 8000;
    const t = window.setInterval(() => void load({ markRead: open }), ms);
    return () => window.clearInterval(t);
  }, [open, hidden]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [open, messages.length]);

  async function send() {
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
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "傳送失敗");
        return;
      }
      setDraft("");
      setStatus("OPEN");
      if (displayName.trim() || contactEmail.trim()) setEditIdentity(false);
      if (data.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.message.id)
            ? prev
            : [...prev, data.message as ContactMessageDto],
        );
      } else {
        await load({ markRead: true });
      }
    } catch {
      setError("網路異常，請稍後再試");
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send();
  }

  function onDraftKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  if (hidden) return null;

  const identityLabel = [displayName, contactEmail].filter(Boolean).join(" · ");

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open ? (
        <div className="pointer-events-auto flex h-[min(32rem,calc(100dvh-2rem))] w-[min(22rem,calc(100vw-2rem))] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="flex shrink-0 items-center justify-between bg-brand-navy px-4 py-3 text-white">
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

          <div className="shrink-0 border-b border-slate-100 px-3 py-2">
            {editIdentity ? (
              <div className="space-y-2">
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
            ) : (
              <button
                type="button"
                onClick={() => setEditIdentity(true)}
                className="w-full truncate text-left text-xs text-slate-500 hover:text-brand-navy"
              >
                {identityLabel || "留下稱呼／Email（選填）"}
              </button>
            )}
          </div>

          <div
            ref={listRef}
            aria-live="polite"
            className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-3"
          >
            <div className="space-y-2">
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
                      <p
                        className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}
                      >
                        {formatContactTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            {status === "CLOSED" ? (
              <p className="text-center text-[11px] text-slate-400">
                對話已結束，傳送新訊息即可繼續。
              </p>
            ) : null}
            </div>
          </div>

          <form onSubmit={onSubmit} className="shrink-0 border-t border-slate-100 bg-white p-3">
            {error ? <p className="mb-2 text-xs text-rose-600">{error}</p> : null}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onDraftKeyDown}
                rows={2}
                maxLength={2000}
                placeholder="輸入訊息…（Enter 送出）"
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

      {!open ? (
      <button
        type="button"
        className="pointer-events-auto relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy text-white shadow-lg shadow-slate-900/20 transition hover:bg-brand-navy/90"
        aria-label="打開聯繫視窗"
        onClick={() => {
          setOpen(true);
          setUnread(0);
        }}
      >
        <MessageCircle className="h-6 w-6" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      ) : null}
    </div>
  );
}
