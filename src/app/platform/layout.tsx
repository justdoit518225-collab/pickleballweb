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
    <div data-ui className="min-h-[100svh] bg-[var(--bg)]">
      <section className="bg-brand-navy text-white">
        <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 lg:px-11">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-[28px] font-black tracking-tight text-white">
              平台總管理中心
            </h1>
            <p className="text-[14px] font-bold text-[#C8D8E4]">
              租戶俱樂部、球拍目錄、實力訓練集與站內聯繫
            </p>
          </div>
          <div className="mt-6">
            <PlatformNav contactUnread={unread._sum.adminUnread ?? 0} />
          </div>
        </div>
      </section>

      <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 lg:px-11">
        {children}
      </div>
    </div>
  );
}
