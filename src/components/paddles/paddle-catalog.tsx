"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PaddlePriceDisplay } from "@/components/paddles/paddle-price-display";
import type { PaddleListItem } from "@/lib/paddles";
import { ROUTES } from "@/lib/constants";

const ALL_BRAND = "ALL";

function PaddleGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <ellipse cx="12" cy="8.5" rx="6.5" ry="7" />
      <path d="M10.5 15.5 9 22h6l-1.5-6.5" />
      <path d="M9.5 8h5" />
    </svg>
  );
}

function matchesQuery(paddle: PaddleListItem, q: string) {
  if (!q) return true;
  const hay = [
    paddle.brand,
    paddle.series,
    paddle.variant,
    paddle.nameZh,
    paddle.nameEn,
    paddle.slug,
  ]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => hay.includes(token));
}

export function PaddleCatalog({
  brands,
  paddlesByBrand,
  showMemberPrice,
  joinHref,
  joinCtaLabel,
}: {
  brands: string[];
  paddlesByBrand: Record<string, PaddleListItem[]>;
  showMemberPrice: boolean;
  joinHref: string;
  joinCtaLabel: string;
}) {
  const [brand, setBrand] = useState(ALL_BRAND);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const brandOptions = useMemo(() => [ALL_BRAND, ...brands], [brands]);

  const allPaddles = useMemo(
    () => brands.flatMap((b) => paddlesByBrand[b] ?? []),
    [brands, paddlesByBrand],
  );

  const paddles = useMemo(() => {
    const base =
      brand === ALL_BRAND ? allPaddles : (paddlesByBrand[brand] ?? []);
    return base.filter((p) => matchesQuery(p, deferredQuery));
  }, [brand, allPaddles, paddlesByBrand, deferredQuery]);

  if (brands.length === 0) {
    return (
      <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 py-12 sm:px-8 sm:py-16 lg:px-11">
        <h1 className="type-display text-brand-navy">匹克球拍 · 規格評測目錄</h1>
        <p className="mt-4 text-base text-[var(--muted)]">目前尚無球拍資料。</p>
      </div>
    );
  }

  const heading = brand === ALL_BRAND ? "全部球拍款式" : `${brand} 系列球拍`;

  return (
    <div>
      {/* Top Court Header Band */}
      <section className="bg-brand-navy py-12 text-white sm:py-16">
        <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-11">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="min-w-0 lg:col-span-8" data-enter>
              <h1 className="type-display text-white">匹克球拍 · 規格評測目錄</h1>
              <p className="mt-4 max-w-[54ch] text-xl leading-relaxed text-white/85">
                {`收錄 ${allPaddles.length} 款主流品牌球拍規格、六維度戰力雷達圖、擊球手感分析與全台俱樂部會員專屬優惠售價。`}
              </p>
            </div>
            <div className="min-w-0 lg:col-span-4" data-enter data-delay="1">
              <label className="relative block w-full">
                <span className="sr-only">搜尋球拍</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[var(--muted)]"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜尋球拍名稱、系列、品牌…"
                  className="w-full bg-white py-3.5 pr-4 pl-12 text-base font-semibold text-brand-navy outline-none placeholder:font-normal placeholder:text-[var(--muted)] focus:outline-2 focus:outline-offset-2 focus:outline-brand-lime"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Split Grid */}
      <section className="page-wrap mx-auto w-full max-w-[1600px] px-5 py-12 sm:px-8 sm:py-16 lg:px-11">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <aside className="min-w-0 lg:col-span-3" data-ui data-enter>
            <div className="bg-white p-5">
              <p className="mb-3 text-sm font-extrabold text-brand-navy">
                依品牌篩選 ({brands.length})
              </p>
              <nav
                aria-label="品牌"
                className="flex flex-wrap gap-2 lg:flex-col lg:gap-1"
              >
                {brandOptions.map((b) => {
                  const active = b === brand;
                  const count =
                    b === ALL_BRAND
                      ? allPaddles.length
                      : (paddlesByBrand[b]?.length ?? 0);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBrand(b)}
                      className={[
                        "flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-left text-base font-bold transition-colors lg:w-full",
                        active
                          ? "bg-brand-navy text-white"
                          : "bg-[var(--bg)] text-brand-navy hover:bg-[var(--surface-alt)]",
                      ].join(" ")}
                    >
                      <span>{b === ALL_BRAND ? "全部品牌" : b}</span>
                      <span
                        className={[
                          "px-2 py-0.5 text-sm font-extrabold tabular-nums",
                          active
                            ? "bg-brand-lime text-brand-navy"
                            : "bg-white text-[var(--muted)]",
                        ].join(" ")}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 lg:col-span-9">
            <div
              className="mb-6 flex flex-wrap items-baseline justify-between gap-4 bg-white px-6 py-4"
              data-enter
            >
              <h2 className="text-2xl font-extrabold text-brand-navy">
                {heading}
              </h2>
              <p className="text-base font-bold text-[#1D6D75] tabular-nums">
                共 {paddles.length} 款球拍
              </p>
            </div>

            {paddles.length === 0 ? (
              <div className="bg-white px-6 py-12 text-center">
                <p className="text-base font-semibold text-[var(--muted)]">
                  {deferredQuery
                    ? `找不到符合「${deferredQuery}」的球拍款式`
                    : "此品牌尚無球拍"}
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {paddles.map((paddle, idx) => (
                  <li
                    key={paddle.id}
                    className="bg-white"
                    data-enter
                    data-delay={String((idx % 3) + 1)}
                  >
                    <PaddleCard
                      paddle={paddle}
                      showBrand={brand === ALL_BRAND}
                      showMemberPrice={showMemberPrice}
                      joinHref={joinHref}
                      joinCtaLabel={joinCtaLabel}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function PaddleCard({
  paddle,
  showBrand = false,
  showMemberPrice,
  joinHref,
  joinCtaLabel,
}: {
  paddle: PaddleListItem;
  showBrand?: boolean;
  showMemberPrice: boolean;
  joinHref: string;
  joinCtaLabel: string;
}) {
  const isLuzz = paddle.brand === "LUZZ";
  const title = isLuzz ? paddle.nameEn : paddle.nameZh;
  const subtitle = isLuzz
    ? paddle.nameZh
    : paddle.variant !== "-"
      ? `${paddle.series} · ${paddle.variant}`
      : paddle.series;

  return (
    <div className="group flex h-full flex-col justify-between transition-colors hover:bg-[var(--surface-alt)]">
      <Link href={ROUTES.paddle(paddle.slug)} className="block">
        <div className="overflow-hidden bg-[var(--bg)]">
          <PaddleThumb paddle={paddle} />
        </div>
        <div className="px-5 pt-4 space-y-1">
          <h3 className="text-xl font-extrabold leading-snug text-brand-navy">
            {title}
          </h3>
          <p className="text-sm font-semibold text-[var(--muted)]">
            {showBrand ? `${paddle.brand} · ` : ""}
            {subtitle}
          </p>
        </div>
      </Link>
      <div className="px-5 pb-5 pt-4">
        <PaddlePriceDisplay
          listPriceUsd={paddle.listPriceUsd}
          showMemberPrice={showMemberPrice}
          memberPriceTwd={paddle.memberPriceTwd}
          memberPriceNote={paddle.memberPriceNote}
          joinHref={joinHref}
          joinCtaLabel={joinCtaLabel}
          variant="catalog"
        />
      </div>
    </div>
  );
}

export function PaddleThumb({
  paddle,
  large = false,
}: {
  paddle: Pick<PaddleListItem, "brand" | "nameZh" | "imageDataUrl">;
  large?: boolean;
}) {
  const box = large
    ? "aspect-[4/3] w-full bg-[var(--bg)]"
    : "aspect-square w-full bg-[var(--bg)]";

  if (paddle.imageDataUrl) {
    return (
      <div className={`relative overflow-hidden ${box}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={paddle.imageDataUrl}
          alt={paddle.nameZh}
          className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 bg-[var(--surface-alt)] ${box}`}
    >
      <PaddleGlyph className="h-12 w-12 text-brand-navy/60" />
      <span className="text-sm font-bold text-brand-navy">
        {paddle.brand}
      </span>
    </div>
  );
}
