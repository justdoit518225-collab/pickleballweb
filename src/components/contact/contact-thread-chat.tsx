"use client";

import { FormEvent, KeyboardEvent, useEffect, useEffectEvent, useRef, useState } from "react";
import { ChevronLeft, Send, X } from "lucide-react";
import {
  formatContactTime,
  type ContactMessageDto,
} from "@/lib/contact-ui";

type Props = {
  threadId: string;
  status?: "OPEN" | "CLOSED";
  initialMessages?: ContactMessageDto[];
  title?: string;
  compact?: boolean;
  onBack?: () => void;
  onClose?: () => void;
};

export function ContactThreadChat({
  threadId,
  status = "OPEN",
  initialMessages = [],
  title,
  compact = false,
  onBack,
  onClose,
}: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [statusNow, setStatusNow] = useState(status);
  const [who, setWho] = useState(title ?? "訪客");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useEffectEvent(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  const load = useEffectEvent(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const timeout = window.setTimeout(() => ac.abort(), 8000);
    try {
      const res = await fetch(`/api/platform/contact/${threadId}`, {
        cache: "no-store",
        signal: ac.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        thread?: {
          status?: "OPEN" | "CLOSED";
          displayName?: string | null;
          contactEmail?: string | null;
        };
        messages?: ContactMessageDto[];
      };
      if (data.messages) setMessages(data.messages);
      if (data.thread?.status) setStatusNow(data.thread.status);
      const nextWho = data.thread?.displayName || data.thread?.contactEmail;
      if (nextWho) setWho(nextWho);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    } finally {
      window.clearTimeout(timeout);
    }
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setStatusNow(status);
  }, [status]);

  useEffect(() => {
    if (title) setWho(title);
  }, [title]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(t);
  }, [threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/contact/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "傳送失敗");
        return;
      }
      setDraft("");
      setStatusNow("OPEN");
      if (data.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.message.id)
            ? prev
            : [...prev, data.message as ContactMessageDto],
        );
      } else {
        await load();
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

  const body = (
    <>
      <div
        ref={listRef}
        aria-live="polite"
        className={`flex-1 space-y-3 overflow-y-auto ${compact ? "bg-slate-50 p-3" : "p-4"}`}
      >
        {messages.map((m) => {
          const admin = m.senderKind === "ADMIN";
          return (
            <div
              key={m.id}
              className={`rounded-xl px-3 py-2 text-sm ${
                admin
                  ? compact
                    ? "ml-8 rounded-br-md bg-brand-navy text-white"
                    : "ml-8 bg-brand-navy text-white"
                  : compact
                    ? "mr-8 rounded-bl-md border border-slate-200 bg-white text-slate-700"
                    : "mr-8 border border-slate-100 bg-slate-50 text-slate-700"
              }`}
            >
              <div className="mb-1 flex justify-between gap-2 text-[10px] opacity-70">
                <span>{admin ? "你" : "訪客"}</span>
                <time>{formatContactTime(m.createdAt)}</time>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
            </div>
          );
        })}
      </div>

      {statusNow === "OPEN" ? (
        <form onSubmit={onSubmit} className="space-y-2 border-t border-slate-100 bg-white p-3">
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          <div className={compact ? "flex items-end gap-2" : "space-y-2"}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onDraftKeyDown}
              rows={compact ? 2 : 3}
              maxLength={2000}
              placeholder="輸入回覆…（Enter 送出）"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-teal"
            />
            {compact ? (
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white disabled:opacity-40"
                aria-label="送出回覆"
              >
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <button type="submit" disabled={sending || !draft.trim()} className="btn-brand disabled:opacity-40">
                {sending ? "送出中…" : "送出回覆"}
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          對話已關閉，重新開啟後可再回覆。
        </p>
      )}
    </>
  );

  if (!compact) {
    return (
      <div className="mt-6 flex h-[min(36rem,calc(100vh-16rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        {body}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="flex items-center gap-1 bg-brand-navy px-2 py-2.5 text-white">
        {onBack ? (
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-white/10"
            aria-label="返回對話列表"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
        <p className="min-w-0 flex-1 truncate px-1 text-sm font-semibold">{who}</p>
        {onClose ? (
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-white/10"
            aria-label="關閉對話"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {body}
    </div>
  );
}
