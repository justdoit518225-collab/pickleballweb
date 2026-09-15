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
  initialMessages,
  title,
  compact = false,
  onBack,
  onClose,
}: Props) {
  const [messages, setMessages] = useState<ContactMessageDto[]>(
    () => initialMessages ?? [],
  );
  const [statusNow, setStatusNow] = useState(status);
  const [who, setWho] = useState(title ?? "訪客");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booted, setBooted] = useState((initialMessages?.length ?? 0) > 0);
  const listRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  const scrollToBottom = useEffectEvent(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  });

  const load = useEffectEvent(async () => {
    const seq = ++seqRef.current;
    try {
      const res = await fetch(`/api/platform/contact/${threadId}`, {
        cache: "no-store",
      });
      if (seq !== seqRef.current) return;
      if (!res.ok) {
        if (!booted) setBooted(true);
        return;
      }
      const data = (await res.json()) as {
        thread?: {
          status?: "OPEN" | "CLOSED";
          displayName?: string | null;
          contactEmail?: string | null;
        };
        messages?: ContactMessageDto[];
      };
      if (seq !== seqRef.current) return;
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      }
      if (data.thread?.status) setStatusNow(data.thread.status);
      const nextWho = data.thread?.displayName || data.thread?.contactEmail;
      if (nextWho) setWho(nextWho);
      setBooted(true);
    } catch {
      if (seq !== seqRef.current) return;
      setBooted(true);
    }
  });

  useEffect(() => {
    seqRef.current += 1;
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
      setBooted(true);
    }
    setStatusNow(status);
    if (title) setWho(title);
    setError(null);
    void load();
    const t = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(t);
    // threadId is the conversation identity; do not reset on new [] props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    if (title) setWho(title);
  }, [title]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, booted]);

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

  const list = (
    <div
      ref={listRef}
      aria-live="polite"
      className={`min-h-0 flex-1 overflow-y-auto ${compact ? "bg-slate-50 p-3" : "p-4"}`}
    >
      <div className="space-y-3">
        {!booted && messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">載入中…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">尚無訊息</p>
        ) : (
          messages.map((m) => {
            const admin = m.senderKind === "ADMIN";
            return (
              <div
                key={m.id}
                className={`rounded-xl px-3 py-2 text-sm ${
                  admin
                    ? "ml-8 rounded-br-md bg-brand-navy text-white"
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
          })
        )}
      </div>
    </div>
  );

  const composer =
    statusNow === "OPEN" ? (
      <form onSubmit={onSubmit} className="shrink-0 space-y-2 border-t border-slate-100 bg-white p-3">
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
      <p className="shrink-0 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
        對話已關閉，重新開啟後可再回覆。
      </p>
    );

  if (!compact) {
    return (
      <div className="mt-6 flex h-[min(36rem,calc(100vh-16rem))] min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        {list}
        {composer}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center gap-1 bg-brand-navy px-2 py-2.5 text-white">
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
      {list}
      {composer}
    </div>
  );
}
