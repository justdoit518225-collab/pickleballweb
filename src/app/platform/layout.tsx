import { PlatformNav } from "@/components/layout/platform-nav";
import { requireSuperAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();
  const unread = await prisma.contactThread.aggregate({
    _sum: { adminUnread: true },
  });
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="mb-2 text-sm font-medium tracking-wide text-brand-teal">平台管理</p>
      <PlatformNav contactUnread={unread._sum.adminUnread ?? 0} />
      {children}
    </div>
  );
}
