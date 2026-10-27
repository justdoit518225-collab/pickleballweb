import Link from "next/link";
import { notFound } from "next/navigation";
import {
  closeContactThread,
  reopenContactThread,
} from "@/app/platform/contact/actions";
import { ContactThreadChat } from "@/components/contact/contact-thread-chat";
import { toContactMessageDto } from "@/lib/contact";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PlatformContactThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    <div className="space-y-4">
      <Link
        href={ROUTES.platformContact}
        className="inline-block text-[14px] font-black text-[#1B6B73] hover:text-brand-navy"
      >
        ← 全部聯繫
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3 bg-white p-6">
        <div>
          <h2 className="text-[24px] font-black text-brand-navy">{who}</h2>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
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
            className="bg-[var(--bg)] px-4 py-2 text-[14px] font-black text-brand-navy hover:bg-brand-lime"
          >
            {thread.status === "OPEN" ? "關閉對話" : "重新開啟"}
          </button>
        </form>
      </div>

      <ContactThreadChat
        threadId={id}
        status={thread.status}
        initialMessages={thread.messages.map(toContactMessageDto)}
      />
    </div>
  );
}
