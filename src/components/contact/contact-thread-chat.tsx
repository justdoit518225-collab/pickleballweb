"use client";

import { FormEvent, KeyboardEvent, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  formatContactTime,
  type ContactMessageDto,
} from "@/lib/contact-ui";

type Props = {
  threadId: string;
  status: "OPEN" | "CLOSED";
  initialMessages: ContactMessageDto[];
};

export function ContactThreadChat({ threadId, status, initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [statusNow, setStatusNow] = useState(status);
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
        thread?: { status?: "OPEN" | "CLOSED" };
        messages?: ContactMessageDto[];
      };
      if (data.messages) setMessages(data.messages);
      if (data.thread?.status) setStatusNow(data.thread.status);
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

  return (
    <div className="mt-6 flex h-[min(36rem,calc(100vh-16rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div
        ref={listRef}
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.map((m) => {
          const admin = m.senderKind === "ADMIN";
          return (
            <div
              key={m.id}
              className={`rounded-xl px-3 py-2 text-sm ${
                admin
                  ? "ml-8 bg-brand-navy text-white"
                  : "mr-8 border border-slate-100 bg-slate-50 text-slate-700"
              }`}
            >
              <div className="mb-1 flex justify-between gap-2 text-[10px] opacity-70">
                <span>{admin ? "管理員" : "訪客"}</span>
                <time>{formatContactTime(m.createdAt)}</time>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
            </div>
          );
        })}
      </div>

      {statusNow === "OPEN" ? (
        <form onSubmit={onSubmit} className="space-y-2 border-t border-slate-100 p-3">
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onDraftKeyDown}
            rows={3}
            maxLength={2000}
            placeholder="輸入回覆…（Enter 送出，Shift+Enter 換行）"
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-teal"
          />
          <button type="submit" disabled={sending || !draft.trim()} className="btn-brand disabled:opacity-40">
            {sending ? "送出中…" : "送出回覆"}
          </button>
        </form>
      ) : (
        <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          對話已關閉，重新開啟後可再回覆。
        </p>
      )}
    </div>
  );
}
