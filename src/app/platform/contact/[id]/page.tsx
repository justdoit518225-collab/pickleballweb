import Link from "next/link";
import { notFound } from "next/navigation";
import {
  closeContactThread,
  reopenContactThread,
  replyContactThread,
} from "@/app/platform/contact/actions";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PlatformContactThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const thread = await prisma.contactThread.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!thread) notFound();

  if (thread.adminUnread > 0) {
    await prisma.contactThread.update({
      where: { id },
      data: { adminUnread: 0 },
    });
  }

  const who =
    thread.displayName ||
    thread.user?.name ||
    thread.contactEmail ||
    thread.user?.email ||
    "訪客";

  return (
    <div>
      <Link
        href={ROUTES.platformContact}
        className="text-sm text-brand-teal hover:underline"
      >
        ← 全部聯繫
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">{who}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {[thread.contactEmail, thread.user?.email]
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(" · ") || "未留下 Email"}
            {" · "}
            {thread.status === "OPEN" ? "進行中" : "已關閉"}
          </p>
        </div>
        <form
          action={
            thread.status === "OPEN"
              ? closeContactThread.bind(null, id)
              : reopenContactThread.bind(null, id)
          }
        >
          <button
            type="submit"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            {thread.status === "OPEN" ? "關閉對話" : "重新開啟"}
          </button>
        </form>
      </div>

      <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        {thread.messages.map((m) => {
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
                <time>{m.createdAt.toLocaleString("zh-TW")}</time>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
            </div>
          );
        })}
      </div>

      {sp.error === "empty" ? (
        <p className="mt-3 text-sm text-rose-600">請輸入回覆內容</p>
      ) : null}

      {thread.status === "OPEN" ? (
        <form
          action={replyContactThread.bind(null, id)}
          className="mt-4 space-y-3"
        >
          <textarea
            name="body"
            rows={4}
            required
            maxLength={2000}
            placeholder="輸入回覆…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-teal"
          />
          <button type="submit" className="btn-brand">
            送出回覆
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-slate-500">對話已關閉，重新開啟後可再回覆。</p>
      )}
    </div>
  );
}
