import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function SiteHeader() {
  const session = await auth();
  const unread =
    session?.user?.id &&
    (await prisma.userNotification.count({
      where: { userId: session.user.id, readAt: null },
    }));

  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Logo href={ROUTES.home} variant="horizontal" iconSize={44} nameSize="md" />
        <nav className="flex items-center gap-3 text-sm sm:gap-4">
          <Link
            href={ROUTES.doublesScheduler}
            className="text-slate-600 hover:text-brand-navy"
          >
            雙打賽程
          </Link>
          <Link href={ROUTES.paddles} className="text-slate-600 hover:text-brand-navy">
            匹克球拍
          </Link>
          <Link href={`${ROUTES.home}#clubs`} className="text-slate-600 hover:text-brand-navy">
            探索俱樂部
          </Link>
          {session?.user ? (
            <>
              <Link href={ROUTES.meInbox} className="text-slate-600 hover:text-brand-navy">
                通知{unread ? ` (${unread})` : ""}
              </Link>
              <Link href={ROUTES.me} className="font-medium text-brand-navy">
                會員中心
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="font-medium text-brand-teal hover:text-brand-navy"
            >
              登入
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
