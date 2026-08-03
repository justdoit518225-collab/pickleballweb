import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PaddleThumb } from "@/components/paddles/paddle-catalog";
import { ROUTES } from "@/lib/constants";
import { getAllPaddleSlugs, getPaddleBySlug } from "@/lib/paddles";

export async function generateStaticParams() {
  try {
    const slugs = await getAllPaddleSlugs();
    return slugs.map((id) => ({ id }));
  } catch {
    return [];
  }
}

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
  const paddle = await getPaddleBySlug(id);
  if (!paddle) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <Link
        href={ROUTES.paddles}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        返回匹克球拍
      </Link>

      <article className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <PaddleThumb paddle={paddle} large />

        <div className="space-y-5 px-5 py-6 sm:px-7">
          <header className="space-y-2">
            <p className="text-sm font-semibold tracking-wide text-brand-teal">
              {paddle.brand}
              <span className="mx-1.5 text-slate-300">·</span>
              {paddle.series}
              {paddle.variant !== "-" ? (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  {paddle.variant}
                </>
              ) : null}
            </p>
            {paddle.brand === "LUZZ" ? (
              <>
                <h1 className="text-2xl font-bold text-brand-navy sm:text-3xl">
                  {paddle.nameEn}
                </h1>
                <p className="text-sm text-slate-500">{paddle.nameZh}</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-brand-navy sm:text-3xl">
                  {paddle.nameZh}
                </h1>
                <p className="text-sm text-slate-500">{paddle.nameEn}</p>
              </>
            )}
          </header>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">詳細介紹</h2>
            <p className="text-sm leading-relaxed text-slate-600">{paddle.description}</p>
          </section>

          {paddle.highlights.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">特點</h2>
              <ul className="flex flex-wrap gap-2">
                {paddle.highlights.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <dl className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">品牌</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{paddle.brand}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">款式／系列</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{paddle.series}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">子版本／顏色</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{paddle.variant}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">英文全名</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{paddle.nameEn}</dd>
            </div>
          </dl>
        </div>
      </article>
    </div>
  );
}
