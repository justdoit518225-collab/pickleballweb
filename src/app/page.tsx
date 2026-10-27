import Link from "next/link";
import { auth } from "@/auth";
import { PrivateClubEntry } from "@/components/home/private-club-entry";
import { ScrollToId } from "@/components/home/scroll-to-id";
import { ROUTES } from "@/lib/constants";
import { getPublicTenants } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

function stripEmoji(input?: string | null): string {
  if (!input) return "";
  return input
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    privateError?: string;
    private?: string;
    left?: string;
    leaveError?: string;
  }>;
}) {
  const {
    privateError,
    private: privateFocus,
    left,
    leaveError,
  } = await searchParams;
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

  const totalVenues = publicClubs.reduce((acc, c) => acc + c._count.venues, 0);
  const featuredClub = publicClubs[0];

  return (
    <div>
      {/* Status Notifications */}
      {(left || leaveError) && (
        <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 pt-6 sm:px-8 lg:px-11">
          {left ? (
            <p className="bg-brand-lime-soft px-4 py-3 text-sm font-bold text-brand-navy">
              已退出「{stripEmoji(left)}」
            </p>
          ) : null}
          {leaveError ? (
            <p className="bg-rose-100 px-4 py-3 text-sm font-bold text-rose-900">
              {stripEmoji(leaveError)}
            </p>
          ) : null}
        </div>
      )}

      {/* Chapter 1: Hero — Architectural Split with Live Court Matrix Fragment */}
      <section className="page-wrap mx-auto w-full max-w-[1600px] px-5 pt-8 pb-20 sm:px-8 sm:pt-14 sm:pb-28 lg:px-11">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <h1 className="type-display enter-rise text-brand-navy">
              走進球場，
              <br />
              下一局立即開打。
            </h1>
            <p className="type-lead enter-rise enter-delay-1 mt-7 max-w-[44ch] text-xl leading-relaxed text-[var(--muted)]">
              全台匹克球俱樂部即時時段看板，線上報名臨打球敘、教練課程、30 天整場租借與 DUPR 積分認證賽，隨時掌握每一面球場動態。
            </p>
            <div className="enter-rise enter-delay-2 mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#clubs"
                className="btn-brand inline-flex items-center justify-center bg-brand-navy px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-brand-teal"
              >
                探索公開俱樂部
              </a>
              {session?.user ? (
                <Link
                  href={ROUTES.me}
                  className="btn-brand-outline inline-flex items-center justify-center bg-white px-6 py-3.5 text-base font-bold text-brand-navy transition-colors hover:bg-[var(--surface-alt)]"
                >
                  進入會員中心
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="btn-brand-outline inline-flex items-center justify-center bg-white px-6 py-3.5 text-base font-bold text-brand-navy transition-colors hover:bg-[var(--surface-alt)]"
                >
                  Google · LINE 快速登入
                </Link>
              )}
              <a
                href="#private-club"
                className="px-3 py-2 text-base font-bold text-[#1D6D75] hover:text-brand-navy"
              >
                持有私人俱樂部邀請碼 →
              </a>
            </div>

            {/* Stats Row: Number first, label below so no small text sits above a large number */}
            <dl className="enter-rise enter-delay-3 mt-12 grid grid-cols-1 gap-5 bg-white p-6 sm:grid-cols-3 sm:gap-6">
              <div data-reveal data-reveal-delay="40">
                <dd className="text-xl font-black text-brand-navy tabular-nums">
                  {publicClubs.length} 間俱樂部
                </dd>
                <dt className="mt-1 text-sm font-semibold text-[var(--muted)]">
                  開放線上預約
                </dt>
              </div>
              <div data-reveal data-reveal-delay="90">
                <dd className="text-xl font-black text-[#1D6D75] tabular-nums">
                  {totalVenues} 座場館
                </dd>
                <dt className="mt-1 text-sm font-semibold text-[var(--muted)]">
                  合作據點看板
                </dt>
              </div>
              <div data-reveal data-reveal-delay="140">
                <dd className="text-xl font-extrabold text-brand-navy">
                  臨打 · 租場 · DUPR
                </dd>
                <dt className="mt-1 text-sm font-semibold text-[var(--muted)]">
                  三合一看板模式
                </dt>
              </div>
            </dl>
          </div>

          {/* Right Column: Live Product UI Fragment (data-ui) styled after a Pickleball Court */}
          <div className="enter-rise enter-delay-2 lg:col-span-6" data-ui>
            <div className="bg-brand-navy p-5 text-white sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
                <div>
                  <p className="text-xs font-bold text-brand-lime">
                    即時球場矩陣看板 · LIVE COURT MATRIX
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-white">
                    {featuredClub
                      ? stripEmoji(featuredClub.displayName)
                      : "PlayPlayPlay 標準場館"}{" "}
                    · 今日時段預覽
                  </p>
                </div>
                {featuredClub ? (
                  <Link
                    href={ROUTES.tenant(featuredClub.slug)}
                    className="bg-brand-lime px-3 py-1.5 text-xs font-extrabold text-brand-navy hover:bg-white"
                  >
                    開啟實況看板 →
                  </Link>
                ) : null}
              </div>

              {/* Architectural Court Diagram + Hourly Split Grid */}
              <div className="grid grid-cols-12 gap-1 bg-[#163560] p-1 text-xs">
                <div className="col-span-2 bg-brand-navy p-2.5 font-bold text-white/85 tabular-nums">
                  時段
                </div>
                <div className="col-span-5 bg-[#1B6B73] p-2.5 text-center font-extrabold text-white">
                  A 場（臨打 / 租場）
                </div>
                <div className="col-span-5 bg-[#1B6B73] p-2.5 text-center font-extrabold text-white">
                  B 場（臨打 / 租場）
                </div>

                {/* Row 1 */}
                <div className="col-span-2 flex items-center bg-brand-navy px-2.5 py-3 font-bold text-white/90 tabular-nums">
                  19:00
                </div>
                <div className="col-span-5 grid grid-cols-2 gap-0.5 bg-[#163560]">
                  <div className="bg-brand-lime-soft p-2.5 text-brand-navy">
                    <span className="block text-[11px] font-extrabold text-[#1D6D75]">
                      臨打球敘
                    </span>
                    <span className="mt-0.5 block font-bold tabular-nums">
                      6 / 8 人
                    </span>
                    <span className="mt-1 inline-block bg-brand-lime px-1.5 py-0.5 text-[10px] font-extrabold text-brand-navy">
                      可報名 +2
                    </span>
                  </div>
                  <div className="bg-white p-2.5 text-brand-navy">
                    <span className="block text-[11px] font-bold text-[var(--muted)]">
                      整場租借
                    </span>
                    <span className="mt-0.5 block font-bold">可預約</span>
                    <span className="mt-1 block text-[10px] font-semibold text-[#1D6D75]">
                      1–3 小時連租
                    </span>
                  </div>
                </div>
                <div className="col-span-5 bg-brand-navy p-2.5 text-white">
                  <span className="inline-block bg-brand-lime px-1.5 py-0.5 text-[10px] font-extrabold text-brand-navy">
                    DUPR 積分賽
                  </span>
                  <span className="mt-1.5 block font-bold">
                    雙打分組循環賽 3.25+
                  </span>
                  <span className="mt-0.5 block text-[11px] text-white/85 tabular-nums">
                    8 / 8 人 · 對戰表即時計分
                  </span>
                </div>

                {/* Row 2 */}
                <div className="col-span-2 flex items-center bg-brand-navy px-2.5 py-3 font-bold text-white/90 tabular-nums">
                  20:00
                </div>
                <div className="col-span-5 grid grid-cols-2 gap-0.5 bg-[#163560]">
                  <div className="bg-brand-lime-soft p-2.5 text-brand-navy">
                    <span className="block text-[11px] font-extrabold text-[#1D6D75]">
                      臨打球敘
                    </span>
                    <span className="mt-0.5 block font-bold tabular-nums">
                      4 / 8 人
                    </span>
                    <span className="mt-1 inline-block bg-brand-lime px-1.5 py-0.5 text-[10px] font-extrabold text-brand-navy">
                      點擊報名 →
                    </span>
                  </div>
                  <div className="bg-white p-2.5 text-brand-navy">
                    <span className="block text-[11px] font-bold text-[var(--muted)]">
                      整場租借
                    </span>
                    <span className="mt-0.5 block font-bold">可預約</span>
                    <span className="mt-1 block text-[10px] font-semibold text-[#1D6D75]">
                      含球拍租借選項
                    </span>
                  </div>
                </div>
                <div className="col-span-5 bg-[#163560] p-2.5 text-white">
                  <span className="inline-block bg-[#1B6B73] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                    教練團體班
                  </span>
                  <span className="mt-1.5 block font-bold">
                    廚房區截擊與第三拍吊球
                  </span>
                  <span className="mt-0.5 block text-[11px] text-white/85 tabular-nums">
                    名額 5 / 6 人
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/85">
                <span>每格左半為「臨打報名」、右半為「整面球場租借」</span>
                <span className="font-bold text-brand-lime">
                  支援 LINE 推播與候補遞補通知
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter 2: My Joined Clubs (if signed in) */}
      {myMemberships && myMemberships.length > 0 && (
        <section className="bg-[#e3ecec] py-14 sm:py-16">
          <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-11">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-4" data-reveal>
                <h2 className="type-head font-extrabold text-brand-navy">
                  我的俱樂部
                </h2>
                <p className="mt-3 max-w-[48ch] text-base leading-relaxed text-[var(--muted)]">
                  你已加入的場館與私人俱樂部，點擊直接開啟今日球場看板與個人報名紀錄。
                </p>
              </div>
              <ul className="grid gap-5 sm:grid-cols-2 lg:col-span-8">
                {myMemberships.map((m, idx) => (
                  <li
                    key={m.id}
                    data-reveal
                    data-reveal-delay={String(idx * 60)}
                  >
                    <Link
                      href={ROUTES.tenant(m.tenant.slug)}
                      className="group flex h-full flex-col justify-between bg-white p-6 transition-colors hover:bg-brand-navy hover:text-white"
                    >
                      <div>
                        <h3 className="text-xl font-extrabold text-brand-navy group-hover:text-white">
                          {stripEmoji(m.tenant.displayName)}
                        </h3>
                        <p className="mt-2 inline-block bg-brand-lime px-2.5 py-0.5 text-sm font-extrabold text-brand-navy">
                          已加入俱樂部會員
                        </p>
                        {m.tenant.description ? (
                          <p className="mt-3 max-w-[48ch] line-clamp-2 text-base text-[var(--muted)] group-hover:text-white/85">
                            {stripEmoji(m.tenant.description)}
                          </p>
                        ) : null}
                      </div>
                      <p className="mt-6 text-sm font-bold text-[#1D6D75] group-hover:text-brand-lime">
                        進入俱樂部看板 →
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Chapter 3: Public Clubs Directory */}
      <section
        id="clubs"
        className="page-wrap mx-auto w-full max-w-[1600px] scroll-mt-12 px-5 py-20 sm:px-8 sm:py-24 lg:px-11"
      >
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-4" data-reveal>
            <h2 className="type-head font-extrabold text-brand-navy">
              公開俱樂部
            </h2>
            <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-[var(--muted)]">
              選擇場館進入查看今日臨打名單、教練課程、DUPR 認證活動或未來 30 天整面球場租借時段。
            </p>
          </div>

          <div className="lg:col-span-8">
            {publicClubs.length === 0 ? (
              <div className="bg-white p-8" data-reveal>
                <p className="max-w-[50ch] text-base font-semibold text-[var(--muted)]">
                  目前尚無公開俱樂部。若您持有私人俱樂部邀請碼，請於下方通行區輸入。
                </p>
              </div>
            ) : (
              <ul className="grid gap-6 sm:grid-cols-2">
                {publicClubs.map((club, idx) => {
                  const cleanDesc = stripEmoji(club.description);
                  return (
                    <li
                      key={club.id}
                      data-reveal
                      data-reveal-delay={String(idx * 70)}
                    >
                      <Link
                        href={ROUTES.tenant(club.slug)}
                        className="group flex h-full flex-col justify-between bg-white p-7 transition-colors hover:bg-brand-navy"
                      >
                        <div>
                          <h3 className="text-2xl font-extrabold tracking-tight text-brand-navy group-hover:text-white">
                            {stripEmoji(club.displayName)}
                          </h3>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="bg-[var(--surface-alt)] px-2.5 py-1 text-sm font-bold text-brand-navy tabular-nums group-hover:bg-[#1B6B73] group-hover:text-white">
                              {club._count.venues} 個場館據點
                            </span>
                            <span className="text-sm font-bold text-[#1D6D75] group-hover:text-brand-lime">
                              公開預約看板
                            </span>
                          </div>
                          {cleanDesc ? (
                            <p className="mt-4 max-w-[48ch] line-clamp-3 text-base leading-relaxed text-[var(--muted)] group-hover:text-white/85">
                              {cleanDesc}
                            </p>
                          ) : (
                            <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-[var(--muted)] group-hover:text-white/80">
                              提供開放球敘、專業課程與球場時段預約，點擊查看即時名單。
                            </p>
                          )}
                        </div>

                        <div className="mt-8 flex items-center justify-between pt-4 text-base font-extrabold text-brand-navy group-hover:text-brand-lime">
                          <span>進入球場時段看板</span>
                          <span className="transition-transform group-hover:translate-x-1">
                            →
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Chapter 4: Court Tools & Paddle Radar Catalog (Real Court Photography + Built-in Tools) */}
      <section className="bg-white py-20 sm:py-24">
        <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-11">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-4" data-reveal>
              <h2 className="type-head font-extrabold text-brand-navy">
                球場實戰工具與球拍評測
              </h2>
              <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-[var(--muted)]">
                除了各俱樂部的即時預約看板，PlayPlayPlay 亦內建符合國際球場架拍輪替邏輯的雙打排程器，以及收錄超過 35 把主流球拍的六維度戰力評測目錄。
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={ROUTES.paddles}
                  className="btn-brand inline-flex items-center justify-center bg-brand-navy px-5 py-3 text-base font-bold text-white hover:bg-brand-teal"
                >
                  瀏覽球拍目錄 →
                </Link>
                <Link
                  href={ROUTES.doublesScheduler}
                  className="btn-brand-outline inline-flex items-center justify-center bg-[var(--bg)] px-5 py-3 text-base font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
                >
                  開啟雙打排程器
                </Link>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
              {/* Feature 1: Standard Court Architecture */}
              <article
                className="flex flex-col justify-between bg-[var(--bg)]"
                data-reveal
                data-reveal-delay="50"
              >
                <div className="overflow-hidden bg-brand-navy">
                  <img
                    src="/courts/harry-b-anderson-tennis-center-pickleball-courts.jpg"
                    width={640}
                    height={480}
                    alt="標準藍綠配色戶外匹克球場與球網配置"
                    className="court-photo-pan aspect-[4/3] w-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-extrabold text-brand-navy">
                    30 天整場租借與分時看板
                  </h3>
                  <p className="mt-2 max-w-[46ch] text-base leading-relaxed text-[var(--muted)]">
                    直覺對照每一面球場的空檔時段，支援 1 至 3 小時連租、球拍加購與人數備註。
                  </p>
                </div>
              </article>

              {/* Feature 2: Paddle Stacking & Doubles Rotation */}
              <article
                className="flex flex-col justify-between bg-[var(--bg)]"
                data-reveal
                data-reveal-delay="110"
              >
                <div className="overflow-hidden bg-brand-navy">
                  <img
                    src="/courts/harry-b-anderson-tennis-center-pickleball-paddle.jpg"
                    width={640}
                    height={480}
                    alt="匹克球場邊的球拍排隊架與輪替規則說明牌"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-extrabold text-brand-navy">
                    數位架拍輪替與雙打排程器
                  </h3>
                  <p className="mt-2 max-w-[46ch] text-base leading-relaxed text-[var(--muted)]">
                    將球場邊的架拍排隊規則數位化，輸入球友名單即可自動產生公平對戰組合與場次表。
                  </p>
                </div>
              </article>

              {/* Feature 3: JOOLA Pro V Perseus Radar */}
              <Link
                href={ROUTES.paddles}
                className="group flex flex-col justify-between bg-[var(--bg)] transition-colors hover:bg-brand-navy"
                data-reveal
                data-reveal-delay="170"
              >
                <div className="overflow-hidden bg-brand-navy">
                  <img
                    src="/paddles/joola-pro-v-perseus-radar.jpg"
                    width={640}
                    height={450}
                    alt="JOOLA Perseus Pro V 六維度球拍性能雷達圖"
                    className="aspect-[16/11] w-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-extrabold text-brand-navy group-hover:text-white">
                    六維度球拍性能雷達對照
                  </h3>
                  <p className="mt-2 max-w-[46ch] text-base leading-relaxed text-[var(--muted)] group-hover:text-white/85">
                    完整比較力量、旋轉、控球、甜蜜點容錯與揮重數據，挑選最適合你球風的主力球拍。
                  </p>
                </div>
              </Link>

              {/* Feature 4: LUZZ Cannon G2 Radar */}
              <Link
                href={ROUTES.paddles}
                className="group flex flex-col justify-between bg-[var(--bg)] transition-colors hover:bg-brand-navy"
                data-reveal
                data-reveal-delay="230"
              >
                <div className="overflow-hidden bg-brand-navy">
                  <img
                    src="/paddles/luzz-cannon-g2-black-radar.jpg"
                    width={640}
                    height={450}
                    alt="LUZZ Cannon G2 六維度球拍性能雷達圖"
                    className="aspect-[16/11] w-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-extrabold text-brand-navy group-hover:text-white">
                    超過 35 款熱門球拍實測規格
                  </h3>
                  <p className="mt-2 max-w-[46ch] text-base leading-relaxed text-[var(--muted)] group-hover:text-white/85">
                    收錄 JOOLA、LUZZ、Honolulu、11SIX24、RPM 等品牌球拍，支援依球風與形狀快速篩選。
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter 5: Private Club Pass (The Page Is The Object — Court Pass Station) */}
      <section
        id="private-club"
        className="scroll-mt-16 bg-brand-teal py-16 text-white sm:py-24"
      >
        {privateFocus === "1" ? <ScrollToId id="private-club" /> : null}
        <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-11">
          <div
            className="grid gap-10 bg-brand-navy p-8 sm:p-12 lg:grid-cols-12 lg:items-center"
            data-reveal
          >
            <div className="lg:col-span-6">
              <h2 className="type-head font-extrabold text-white">
                私人俱樂部通行證
              </h2>
              <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-white/90">
                {session?.user
                  ? "受邀會員專屬通行區。私人俱樂部不會顯示於公開列表，請輸入場主或球團提供的邀請碼，驗證後即可解鎖專屬預約看板。"
                  : "受邀會員專屬通行區。私人俱樂部不會顯示於公開列表，請先使用 Google 或 LINE 登入會員，再輸入場主提供的邀請碼加入。"}
              </p>
            </div>
            <div className="lg:col-span-6">
              <PrivateClubEntry
                error={privateError}
                isLoggedIn={Boolean(session?.user)}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
