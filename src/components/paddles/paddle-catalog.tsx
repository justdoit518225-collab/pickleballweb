"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-brand-teal">球拍清單</p>
        <h1 className="text-2xl font-bold text-brand-navy sm:text-3xl">依品牌挑選球拍</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          先選品牌，再瀏覽該品牌款式縮圖；點進去可看詳細介紹。
        </p>
      </header>

      <div className="mt-6 max-w-xs">
        <label htmlFor="paddle-brand" className="mb-1.5 block text-sm font-medium text-slate-700">
          品牌
        </label>
        <div className="relative">
          <select
            id="paddle-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm font-medium text-slate-900 shadow-sm outline-none ring-brand-teal focus:ring-2"
          >
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {brand} · 共 {paddles.length} 款
      </p>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paddles.map((paddle) => (
          <li key={paddle.id}>
            <PaddleCard paddle={paddle} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaddleCard({ paddle }: { paddle: Paddle }) {
  return (
    <Link
      href={ROUTES.paddle(paddle.id)}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-teal-soft hover:shadow-md"
    >
      <PaddleThumb paddle={paddle} />
      <div className="flex flex-1 flex-col gap-1 px-3.5 py-3">
        <p className="text-[11px] font-semibold tracking-wide text-brand-teal uppercase">
          {paddle.series}
          {paddle.variant !== "-" ? ` · ${paddle.variant}` : ""}
        </p>
        <h2 className="text-sm font-semibold text-slate-900 group-hover:text-brand-navy">
          {paddle.nameZh}
        </h2>
        <p className="text-xs text-slate-500">{paddle.nameEn}</p>
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
  const box = large
    ? "aspect-[4/3] w-full"
    : "aspect-[4/3] w-full bg-slate-50";

  if (paddle.imageSrc) {
    return (
      <div className={`relative overflow-hidden ${box}`}>
        <Image
          src={paddle.imageSrc}
          alt={paddle.nameZh}
          fill
          priority={priority}
          className="object-cover transition group-hover:scale-[1.03]"
          sizes={large ? "(max-width: 768px) 100vw, 640px" : "(max-width: 640px) 100vw, 33vw"}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-navy via-[#12325f] to-brand-teal ${box}`}
    >
      <PaddleGlyph className="h-10 w-10 text-white/90" />
      <span className="text-xs font-semibold tracking-[0.2em] text-white/80">
        {paddle.brand}
      </span>
      {!large && (
        <span className="max-w-[80%] truncate text-center text-[11px] text-white/70">
          {paddle.variant !== "-" ? paddle.variant : paddle.series}
        </span>
      )}
    </div>
  );
}
