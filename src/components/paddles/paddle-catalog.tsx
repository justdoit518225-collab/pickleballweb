"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getPaddleBrands, getPaddlesByBrand, type Paddle } from "@/lib/paddles";
import { ROUTES } from "@/lib/constants";

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

export function PaddleCatalog() {
  const brands = useMemo(() => getPaddleBrands(), []);
  const [brand, setBrand] = useState(brands[0] ?? "");
  const paddles = useMemo(
    () => (brand ? getPaddlesByBrand(brand) : []),
    [brand],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-brand-navy sm:text-3xl">匹克球拍</h1>
        <p className="text-sm text-slate-600">選擇左側品牌，瀏覽款式縮圖</p>
      </header>

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        {/* 左側品牌清單 */}
        <aside className="w-full shrink-0 md:w-52 lg:w-56">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Brand
          </p>
          <nav
            aria-label="品牌"
            className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-0 md:overflow-visible md:border-t md:border-slate-200 md:pb-0"
          >
            {brands.map((b) => {
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

        {/* 右側球拍網格 */}
        <section className="min-w-0 flex-1">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{brand}</h2>
            <p className="text-sm text-slate-500">{paddles.length} 款</p>
          </div>

          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {paddles.map((paddle) => (
              <li key={paddle.id}>
                <PaddleCard paddle={paddle} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function PaddleCard({ paddle }: { paddle: Paddle }) {
  const styleLabel =
    paddle.variant !== "-"
      ? `${paddle.series} ${paddle.variant}`
      : paddle.series;

  return (
    <Link href={ROUTES.paddle(paddle.id)} className="group block">
      <div className="overflow-hidden rounded-lg bg-[#ececec] transition group-hover:bg-[#e4e4e4]">
        <PaddleThumb paddle={paddle} />
      </div>
      <div className="mt-2.5 space-y-0.5 px-0.5">
        <h3 className="text-sm font-semibold leading-snug text-slate-900 group-hover:text-brand-navy">
          {paddle.nameZh}
        </h3>
        <p className="text-xs text-slate-500">{styleLabel}</p>
        {/* 價格先隱藏 */}
      </div>
    </Link>
  );
}

export function PaddleThumb({
  paddle,
  priority = false,
  large = false,
}: {
  paddle: Paddle;
  priority?: boolean;
  large?: boolean;
}) {
  const box = large ? "aspect-[4/3] w-full" : "aspect-square w-full";

  if (paddle.imageSrc) {
    return (
      <div className={`relative overflow-hidden ${box}`}>
        <Image
          src={paddle.imageSrc}
          alt={paddle.nameZh}
          fill
          priority={priority}
          className="object-contain p-3 transition group-hover:scale-[1.03]"
          sizes={
            large
              ? "(max-width: 768px) 100vw, 640px"
              : "(max-width: 640px) 50vw, 25vw"
          }
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
