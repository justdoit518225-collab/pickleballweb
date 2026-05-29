import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { PrivateClubEntry } from "@/components/home/private-club-entry";
import { APP_TAGLINE, ROUTES } from "@/lib/constants";
import { getPublicTenants } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const [publicClubs, session] = await Promise.all([
    getPublicTenants(),
    auth(),
  ]);

  const myMemberships =
    session?.user?.id &&
    (await prisma.tenantMembership.findMany({
      where: { userId: session.user.id, isBanned: false },
      include: { tenant: true },
      orderBy: { joinedAt: "desc" },
    }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <section className="rounded-2xl border border-brand-navy-soft bg-gradient-to-br from-brand-navy-soft via-white to-brand-lime-soft px-8 py-14 shadow-sm">
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <Logo href={ROUTES.home} variant="stacked" iconSize={140} nameSize="hero" />
          <p className="mt-6 text-sm font-medium tracking-wide text-brand-teal">匹克球預約</p>
          <p className="mt-3 max-w-xl text-lg text-slate-600">{APP_TAGLINE}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 sm:justify-start">
            <a href="#clubs" className="btn-brand">
              探索俱樂部
            </a>
            {session?.user ? (
              <Link href={ROUTES.me} className="btn-brand-outline">
                會員中心
              </Link>
            ) : (
              <Link href="/login" className="btn-brand-outline">
                登入
              </Link>
            )}
          </div>
        </div>
      </section>

      {myMemberships && myMemberships.length > 0 && (
        <section className="mt-12 rounded-xl border border-brand-teal-soft bg-brand-teal-soft/30 p-6">
          <h2 className="text-lg font-semibold text-brand-navy">我的俱樂部</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {myMemberships.map((m) => (
              <li key={m.id}>
                <Link
                  href={ROUTES.tenant(m.tenant.slug)}
                  className="block rounded-lg border border-white bg-white px-4 py-3 shadow-sm hover:border-brand-teal-soft"
                >
                  <span className="font-medium text-slate-800">{m.tenant.displayName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="clubs" className="mt-12 scroll-mt-8">
        <h2 className="text-xl font-bold text-slate-800">公開俱樂部</h2>
        <p className="mt-2 text-sm text-slate-600">選擇俱樂部進入預約球敘、課程或場地租借。</p>
        {publicClubs.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">目前尚無公開俱樂部。</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {publicClubs.map((club) => (
              <li key={club.id}>
                <Link
                  href={ROUTES.tenant(club.slug)}
                  className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-teal-soft hover:shadow-md"
                >
                  <h3 className="font-semibold text-brand-navy">{club.displayName}</h3>
                  {club.description && (
                    <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-600">
                      {club.description}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-slate-400">
                    {club._count.venues} 個場館 · 公開
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <h3 className="font-medium text-slate-800">私人俱樂部</h3>
          <p className="mt-1 text-sm text-slate-600">
            若您收到邀請，請輸入俱樂部代碼後輸入邀請碼進入（不會顯示於上方列表）。
          </p>
          <PrivateClubEntry />
        </div>
      </section>
    </div>
  );
}
