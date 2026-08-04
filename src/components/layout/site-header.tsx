import { auth } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { SiteHeaderNav } from "@/components/layout/site-header-nav";
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
    <header className="relative z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-16">
        <Logo
          href={ROUTES.home}
          variant="horizontal"
          iconSize={40}
          nameSize="md"
          className="min-w-0 shrink"
        />
        <SiteHeaderNav
          signedIn={Boolean(session?.user)}
          unreadCount={typeof unread === "number" ? unread : 0}
        />
      </div>
    </header>
  );
}
