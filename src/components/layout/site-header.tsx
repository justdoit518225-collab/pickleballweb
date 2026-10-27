import { auth } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { SiteHeaderNav } from "@/components/layout/site-header-nav";
import { CourtMotion } from "@/components/ui/court-motion";
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
    <header className="relative z-30 bg-[var(--bg)]">
      <CourtMotion />
      <div className="page-wrap mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-5 sm:h-20 sm:px-8 lg:px-11">
        <Logo
          href={ROUTES.home}
          variant="horizontal"
          iconSize={40}
          nameSize="lg"
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
