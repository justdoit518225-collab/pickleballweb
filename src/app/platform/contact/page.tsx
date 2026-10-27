import Link from "next/link";
import { ContactInboxRefresher } from "@/components/contact/contact-inbox-refresher";
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
    <div className="space-y-6">
      <ContactInboxRefresher />
      <div>
        <h2 className="text-[24px] font-black text-brand-navy">站內聯繫</h2>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          每位訪客／會員對管理員只有一則對話。你也可以直接點右下角圖示，點進該則一對一視窗回覆。
        </p>
      </div>

      <ul className="divide-y divide-[var(--line)] bg-white">
        {threads.length === 0 ? (
          <li className="px-6 py-8 text-center text-[14px] text-[var(--muted)]">
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
                  className="flex items-start justify-between gap-3 px-6 py-4 transition-colors hover:bg-[var(--bg)]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[16px] font-black text-brand-navy">{who}</span>
                      {t.adminUnread > 0 ? (
                        <span className="bg-[#FCECE9] px-2 py-0.5 text-[14px] font-black text-[#B42318]">
                          {t.adminUnread}
                        </span>
                      ) : null}
                      {t.status === "CLOSED" ? (
                        <span className="bg-[var(--surface-alt)] px-2 py-0.5 text-[14px] font-bold text-[var(--muted)]">
                          已關閉
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-[14px] text-[var(--muted)]">
                      {last
                        ? `${last.senderKind === "ADMIN" ? "你：" : ""}${last.body}`
                        : "（無訊息）"}
                    </p>
                  </div>
                  <time className="shrink-0 font-mono text-[14px] text-[var(--muted)]">
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
