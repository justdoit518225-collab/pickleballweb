"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { PaddleListItem } from "@/lib/paddles";
import { formatUsdListPrice } from "@/lib/paddle-price";
import { ROUTES } from "@/lib/constants";

const ALL_BRAND = "ALL";

function PaddleGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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
}: {
  brands: string[];
  paddlesByBrand: Record<string, PaddleListItem[]>;
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
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-brand-navy sm:text-3xl">匹克球拍</h1>
        <p className="mt-3 text-sm text-slate-600">目前尚無球拍資料。</p>
      </div>
    );
  }

  const heading = brand === ALL_BRAND ? "全部球拍" : brand;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-brand-navy sm:text-3xl">匹克球拍</h1>
      </header>

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <aside className="w-full shrink-0 md:w-52 lg:w-56">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Brand
          </p>
          <nav
            aria-label="品牌"
            className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-0 md:overflow-visible md:border-t md:border-slate-200 md:pb-0"
          >
            {brandOptions.map((b) => {
              const active = b === brand;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBrand(b)}
                  className={[
                    "shrink-0 rounded-full px-3.5 py-2 text-left text-sm font-medium transition md:rounded-none md:border-b md:border-slate-100 md:px-0 md:py-3",
                    active
                      ? "bg-brand-navy text-white md:bg-transparent md:font-semibold md:text-brand-navy md:underline md:decoration-brand-teal md:underline-offset-4"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 md:bg-transparent md:text-slate-600 md:hover:bg-transparent md:hover:text-brand-navy",
                  ].join(" ")}
                >
                  {b}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-baseline justify-between gap-3 sm:justify-start sm:gap-4">
              <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
              <p className="text-sm text-slate-500">{paddles.length} 款</p>
            </div>

            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">搜尋球拍</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋名稱、系列、品牌…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
              />
            </label>
          </div>

          {paddles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              {deferredQuery
                ? `找不到符合「${deferredQuery}」的球拍`
                : "此品牌尚無球拍"}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {paddles.map((paddle) => (
                <li key={paddle.id}>
                  <PaddleCard paddle={paddle} showBrand={brand === ALL_BRAND} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function PaddleCard({
  paddle,
  showBrand = false,
}: {
  paddle: PaddleListItem;
  showBrand?: boolean;
}) {
  const isLuzz = paddle.brand === "LUZZ";
  const title = isLuzz ? paddle.nameEn : paddle.nameZh;
  const subtitle = isLuzz
    ? paddle.nameZh
    : paddle.variant !== "-"
      ? `${paddle.series} ${paddle.variant}`
      : paddle.series;

  return (
    <Link href={ROUTES.paddle(paddle.slug)} className="group block">
      <div className="overflow-hidden rounded-lg bg-[#ececec] transition group-hover:bg-[#e4e4e4]">
        <PaddleThumb paddle={paddle} />
      </div>
      <div className="mt-2.5 space-y-0.5 px-0.5">
        {showBrand ? (
          <p className="text-[11px] font-semibold tracking-wide text-brand-teal">
            {paddle.brand}
          </p>
        ) : null}
        <h3 className="text-sm font-semibold leading-snug text-slate-900 group-hover:text-brand-navy">
          {title}
        </h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
        {paddle.listPriceUsd != null ? (
          <p className="text-xs font-medium text-slate-700">
            {formatUsdListPrice(paddle.listPriceUsd)}
          </p>
        ) : null}
      </div>
    </Link>
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
    ? "aspect-[4/3] w-full bg-[#ececec]"
    : "aspect-square w-full bg-[#ececec]";

  if (paddle.imageDataUrl) {
    return (
      <div className={`relative overflow-hidden ${box}`}>
        {/* data URL 不走 next/image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={paddle.imageDataUrl}
          alt={paddle.nameZh}
          className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.04]"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 ${box}`}
    >
      <PaddleGlyph className="h-12 w-12 text-slate-500" />
      <span className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
        {paddle.brand}
      </span>
    </div>
  );
}
