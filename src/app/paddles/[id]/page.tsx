import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PaddleDescriptionView } from "@/components/paddles/paddle-description-view";
import { PaddleThumb } from "@/components/paddles/paddle-catalog";
import { PaddlePriceDisplay } from "@/components/paddles/paddle-price-display";
import { ROUTES } from "@/lib/constants";
import { getPaddleDealPriceContext } from "@/lib/paddle-deal-price";
import { getPaddleBySlug } from "@/lib/paddles";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const paddle = await getPaddleBySlug(id);
  if (!paddle) return { title: "球拍介紹" };
  return {
    title: paddle.brand === "LUZZ" ? paddle.nameEn : paddle.nameZh,
    description: paddle.description,
  };
}

export default async function PaddleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await getPaddleDealPriceContext();
  const paddle = await getPaddleBySlug(id, deal.showMemberPrice);
  if (!paddle) notFound();

  const mainTitle = paddle.brand === "LUZZ" ? paddle.nameEn : paddle.nameZh;
  const subTitle = paddle.brand === "LUZZ" ? paddle.nameZh : paddle.nameEn;

  return (
    <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 py-10 sm:px-8 sm:py-14 lg:px-11">
      <Link
        href={ROUTES.paddles}
        className="inline-flex items-center gap-2 bg-white px-4 py-2 text-sm font-bold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        返回球拍評測目錄
      </Link>

      <article className="mt-6 grid gap-8 bg-white p-6 sm:p-10 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-5">
          <PaddleThumb paddle={paddle} large />

          <dl className="mt-6 grid gap-4 bg-[var(--bg)] p-6 text-sm sm:grid-cols-2">
            <div>
              <dd className="text-base font-extrabold text-brand-navy">
                {paddle.brand}
              </dd>
              <dt className="mt-0.5 text-sm text-[var(--muted)]">品牌</dt>
            </div>
            <div>
              <dd className="text-base font-extrabold text-brand-navy">
                {paddle.series}
              </dd>
              <dt className="mt-0.5 text-sm text-[var(--muted)]">款式／系列</dt>
            </div>
            <div>
              <dd className="text-base font-extrabold text-brand-navy">
                {paddle.variant}
              </dd>
              <dt className="mt-0.5 text-sm text-[var(--muted)]">子版本／顏色</dt>
            </div>
            <div>
              <dd className="text-base font-extrabold text-brand-navy">
                {paddle.nameEn}
              </dd>
              <dt className="mt-0.5 text-sm text-[var(--muted)]">英文全名</dt>
            </div>
            <div className="sm:col-span-2">
              <PaddlePriceDisplay
                listPriceUsd={paddle.listPriceUsd}
                priceSourceUrl={paddle.priceSourceUrl}
                priceNote={paddle.priceNote}
                showMemberPrice={deal.showMemberPrice}
                memberPriceTwd={paddle.memberPriceTwd}
                memberPriceNote={paddle.memberPriceNote}
                joinHref={deal.joinHref}
                joinCtaLabel={deal.joinCtaLabel}
                variant="spec"
              />
            </div>
          </dl>
        </div>

        <div className="space-y-8 lg:col-span-7">
          <header className="space-y-3 bg-brand-navy p-6 text-white sm:p-8">
            <h1 className="type-head font-extrabold text-white">{mainTitle}</h1>
            <p className="text-base font-semibold text-white/80">
              {subTitle} · {paddle.brand} {paddle.series}
              {paddle.variant !== "-" ? ` · ${paddle.variant}` : ""}
            </p>
            <div className="pt-2">
              <PaddlePriceDisplay
                listPriceUsd={paddle.listPriceUsd}
                priceSourceUrl={paddle.priceSourceUrl}
                priceNote={paddle.priceNote}
                showMemberPrice={deal.showMemberPrice}
                memberPriceTwd={paddle.memberPriceTwd}
                memberPriceNote={paddle.memberPriceNote}
                joinHref={deal.joinHref}
                joinCtaLabel={deal.joinCtaLabel}
                variant="detail"
              />
            </div>
          </header>

          {paddle.highlights.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xl font-extrabold text-brand-navy">
                核心性能特點
              </h2>
              <ul className="flex flex-wrap gap-2">
                {paddle.highlights.map((item) => (
                  <li
                    key={item}
                    className="bg-brand-lime-soft px-3.5 py-1.5 text-sm font-bold text-brand-navy"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-brand-navy">
              詳細規格與實測評析
            </h2>
            <PaddleDescriptionView content={paddle.description} />
          </section>

          <p className="bg-[#e3ecec] px-5 py-4 text-base font-semibold text-brand-navy">
            想詢問現貨或預約球場試打？請點選畫面右下角「聯繫我們」留言，我們會盡快回覆。
          </p>
        </div>
      </article>
    </div>
  );
}
