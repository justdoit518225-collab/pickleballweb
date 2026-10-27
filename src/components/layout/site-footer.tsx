import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { APP_TAGLINE, ROUTES } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-brand-navy text-[#f4f6f3]">
      <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 pt-16 pb-10 sm:px-8 sm:pt-24 sm:pb-14 lg:px-11">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7" data-reveal>
            <Logo
              href={ROUTES.home}
              variant="icon"
              iconSize={52}
              className="inline-block"
            />
            <p className="mt-5 max-w-[44ch] text-xl font-medium leading-relaxed text-[#f4f6f3]/90">
              {APP_TAGLINE}，連結全台匹克球俱樂部、即時球場時段看板、教練課程與 DUPR 積分對戰。
            </p>
          </div>
          <div
            className="flex flex-wrap gap-x-8 gap-y-3 text-base font-semibold text-[#f4f6f3]/85 lg:col-span-5 lg:justify-end"
            data-reveal
          >
            <Link href={`${ROUTES.home}#clubs`} className="hover:text-brand-lime">
              探索俱樂部
            </Link>
            <Link href={`${ROUTES.home}#private-club`} className="hover:text-brand-lime">
              私人俱樂部通行
            </Link>
            <Link href={ROUTES.paddles} className="hover:text-brand-lime">
              匹克球拍目錄
            </Link>
            <Link href={ROUTES.doublesScheduler} className="hover:text-brand-lime">
              雙打排程器
            </Link>
            <Link href={ROUTES.me} className="hover:text-brand-lime">
              會員中心
            </Link>
          </div>
        </div>

        {/* Designed Close: Monument Wordmark returning at full width via crisp SVG */}
        <div className="mt-12 overflow-hidden pt-6 select-none" data-reveal>
          <svg
            viewBox="0 0 920 132"
            className="block h-auto w-full"
            role="img"
            aria-label="PlayPlayPlay"
          >
            <text
              x="0"
              y="108"
              fontFamily="var(--font-geist-sans), system-ui, sans-serif"
              fontSize="126"
              fontWeight="900"
              letterSpacing="-5"
            >
              <tspan fill="#ffffff">Play</tspan>
              <tspan fill="#4CC9D4">Play</tspan>
              <tspan fill="#8BC34A">Play</tspan>
            </text>
          </svg>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-[#f4f6f3]/80">
          <p>© {new Date().getFullYear()} PlayPlayPlay · 匹克球多場館預約平台</p>
          <p>
            球場攝影：GA Kevin（CC0，Wikimedia Commons）· 點選右下角「聯繫我們」留言
          </p>
        </div>
      </div>
    </footer>
  );
}
