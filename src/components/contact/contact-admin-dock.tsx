"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { ContactThreadChat } from "@/components/contact/contact-thread-chat";
import {
  formatContactTime,
  type ContactInboxThreadDto,
} from "@/lib/contact-ui";

type InboxPayload = {
  unread: number;
  threads: ContactInboxThreadDto[];
};

export function ContactAdminDock() {
  const [inboxOpen, setInboxOpen] = useState(false);
  const [threads, setThreads] = useState<ContactInboxThreadDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadInbox = useEffectEvent(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const timeout = window.setTimeout(() => ac.abort(), 8000);
    try {
      const res = await fetch("/api/platform/contact", {
        cache: "no-store",
        signal: ac.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as InboxPayload;
      setThreads(data.threads ?? []);
      setUnread(data.unread ?? 0);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  });

  useEffect(() => {
    void loadInbox();
    const ms = inboxOpen ? 4000 : 8000;
    const t = window.setInterval(() => void loadInbox(), ms);
    return () => window.clearInterval(t);
  }, [inboxOpen]);

  const active = threads.find((t) => t.id === activeId) ?? null;
  const waiting = threads.filter((t) => t.adminUnread > 0).length;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {inboxOpen ? (
        <div className="pointer-events-auto flex h-[min(32rem,calc(100dvh-2rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          {activeId ? (
            <ContactThreadChat
              key={activeId}
              threadId={activeId}
              status={active?.status ?? "OPEN"}
              title={active?.who}
              initialMessages={active?.messages}
              compact
              onBack={() => setActiveId(null)}
              onClose={() => {
                setActiveId(null);
                setInboxOpen(false);
              }}
            />
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-between bg-brand-navy px-4 py-3 text-white">
                <div>
                  <p className="text-sm font-semibold">訪客訊息</p>
                  <p className="text-xs text-white/75">
                    {waiting > 0
                      ? `${waiting} 人待回覆 · 共 ${threads.length} 則對話`
                      : threads.length > 0
                        ? `共 ${threads.length} 則對話`
                        : "尚無訪客留言"}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1.5 hover:bg-white/10"
                  aria-label="關閉聯繫視窗"
                  onClick={() => setInboxOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
                {loading && threads.length === 0 ? (
                  <li className="px-4 py-8 text-center text-xs text-slate-400">載入中…</li>
                ) : threads.length === 0 ? (
                  <li className="px-4 py-8 text-center text-xs text-slate-500">
                    訪客從右下角留言後，會出現在這裡。
                  </li>
                ) : (
                  threads.map((t) => (
                    <li key={t.id} className="border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveId(t.id);
                          if (t.adminUnread > 0) {
                            setUnread((n) => Math.max(0, n - t.adminUnread));
                            setThreads((prev) =>
                              prev.map((row) =>
                                row.id === t.id ? { ...row, adminUnread: 0 } : row,
                              ),
                            );
                          }
                        }}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-white"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
                          {t.who.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-800">
                              {t.who}
                            </span>
                            {t.adminUnread > 0 ? (
                              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {t.adminUnread > 9 ? "9+" : t.adminUnread}
                              </span>
                            ) : null}
                            {t.status === "CLOSED" ? (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                已關閉
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {t.preview
                              ? `${t.lastFromAdmin ? "你：" : ""}${t.preview}`
                              : "（無訊息）"}
                          </span>
                        </span>
                        <time className="shrink-0 text-[10px] text-slate-400">
                          {formatContactTime(t.lastMessageAt)}
                        </time>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
      ) : null}

      {!inboxOpen ? (
        <button
          type="button"
          className="pointer-events-auto relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy text-white shadow-lg shadow-slate-900/20 transition hover:bg-brand-navy/90"
          aria-label="打開訪客訊息"
          onClick={() => {
            setInboxOpen(true);
            void loadInbox();
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
