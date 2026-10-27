"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
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

  function scrollToBottom() {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  const load = useCallback(async (opts: { markRead: boolean }) => {
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
  }, []);

  useEffect(() => {
    if (hidden) return;
    const ms = open ? 3000 : 8000;
    const initial = window.setTimeout(() => void load({ markRead: open }), 0);
    const t = window.setInterval(() => void load({ markRead: open }), ms);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(t);
    };
  }, [open, hidden, load]);

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
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6"
      data-ui
    >
      {open ? (
        <div
          className="pointer-events-auto flex h-[min(32rem,calc(100dvh-2rem))] w-[min(22rem,calc(100vw-2rem))] min-h-0 flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
          data-ui
        >
          <div className="flex shrink-0 items-center justify-between bg-brand-navy px-4 py-3 text-white">
            <div>
              <p className="text-sm font-extrabold">聯繫我們</p>
              <p className="text-xs text-white/75">與管理員一對一留言</p>
            </div>
            <button
              type="button"
              className="p-1.5 hover:bg-white/10"
              aria-label="關閉聯繫視窗"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="shrink-0 bg-[var(--surface-alt)] px-3 py-2.5">
            {editIdentity ? (
              <div className="space-y-2">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="怎麼稱呼你（選填）"
                  className="w-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-brand-navy outline-none focus:border-brand-teal"
                  maxLength={40}
                />
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Email（選填，方便回覆通知）"
                  type="email"
                  className="w-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-brand-navy outline-none focus:border-brand-teal"
                  maxLength={120}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditIdentity(true)}
                className="w-full truncate text-left text-xs font-semibold text-[var(--muted)] hover:text-brand-navy"
              >
                {identityLabel || "留下稱呼／Email（選填）"}
              </button>
            )}
          </div>

          <div
            ref={listRef}
            aria-live="polite"
            className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg)] px-3 py-3"
          >
            <div className="space-y-2">
              {loading && messages.length === 0 ? (
                <p className="text-center text-xs text-[var(--muted)]">載入中…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-xs leading-relaxed text-[var(--muted)]">
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
                        className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                          mine
                            ? "bg-brand-teal text-white"
                            : "bg-[var(--surface)] text-brand-navy"
                        }`}
                      >
                        {!mine ? (
                          <p className="mb-0.5 text-[10px] font-extrabold text-brand-teal">
                            管理員
                          </p>
                        ) : null}
                        {m.body}
                        <p
                          className={`mt-1 text-[10px] tabular-nums ${
                            mine ? "text-white/75" : "text-[var(--muted)]"
                          }`}
                        >
                          {formatContactTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              {status === "CLOSED" ? (
                <p className="text-center text-[11px] text-[var(--muted)]">
                  對話已結束，傳送新訊息即可繼續。
                </p>
              ) : null}
            </div>
          </div>

          <form onSubmit={onSubmit} className="shrink-0 bg-[var(--surface)] p-3">
            {error ? <p className="mb-2 text-xs font-bold text-rose-700">{error}</p> : null}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onDraftKeyDown}
                rows={2}
                maxLength={2000}
                placeholder="輸入訊息…（Enter 送出）"
                className="min-h-[2.75rem] flex-1 resize-none border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-teal"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center bg-brand-navy text-white hover:bg-brand-teal disabled:opacity-40"
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
          data-ui
          className="pointer-events-auto relative inline-flex h-13 w-13 items-center justify-center bg-brand-navy text-white shadow-lg transition hover:bg-brand-teal"
          aria-label="打開聯繫視窗"
          onClick={() => {
            setOpen(true);
            setUnread(0);
          }}
        >
          <MessageCircle className="h-6 w-6" />
          {unread > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center bg-brand-lime px-1 text-[10px] font-extrabold text-brand-navy tabular-nums">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}
