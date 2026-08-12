import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PlatformContactPage() {
  const threads = await prisma.contactThread.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, senderKind: true },
      },
    },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">站內聯繫</h1>
      <p className="mt-1 text-sm text-slate-600">
        訪客透過右下角浮框留言，可在此回覆。
      </p>

      <ul className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {threads.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-slate-500">
            尚無聯繫訊息
          </li>
        ) : (
          threads.map((t) => {
            const last = t.messages[0];
            const who =
              t.displayName ||
              t.user?.name ||
              t.contactEmail ||
              t.user?.email ||
              "訪客";
            return (
              <li key={t.id}>
                <Link
                  href={ROUTES.platformContactThread(t.id)}
                  className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">{who}</span>
                      {t.adminUnread > 0 ? (
                        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {t.adminUnread}
                        </span>
                      ) : null}
                      {t.status === "CLOSED" ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          已關閉
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {last
                        ? `${last.senderKind === "ADMIN" ? "你：" : ""}${last.body}`
                        : "（無訊息）"}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-400">
                    {t.lastMessageAt.toLocaleString("zh-TW")}
                  </time>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
