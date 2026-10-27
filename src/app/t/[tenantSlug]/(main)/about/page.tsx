import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { submitTenantReview } from "@/app/t/[tenantSlug]/actions";
import { getTenantBySlug } from "@/lib/tenant";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function TenantAboutPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const { saved, error } = await searchParams;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const session = await auth();
  const [reviews, stats] = await Promise.all([
    prisma.tenantReview.findMany({
      where: { tenantId: tenant.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.tenantReview.aggregate({
      where: { tenantId: tenant.id },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const avg = stats._avg.rating ? Number(stats._avg.rating).toFixed(1) : "—";

  return (
    <div>
      <section className="bg-brand-navy py-10 text-white sm:py-12">
        <div className="page-wrap">
          <Link
            href={ROUTES.tenant(tenantSlug)}
            className="text-xs font-bold text-brand-lime hover:underline"
          >
            ← 返回 {tenant.displayName}
          </Link>
          <h1 className="type-head mt-3 text-white">關於 {tenant.displayName}</h1>
          <p className="mt-3 max-w-2xl whitespace-pre-wrap text-base leading-relaxed text-white/85">
            {tenant.description ?? "歡迎來到球場切磋球技！"}
          </p>
        </div>
      </section>

      <div className="page-wrap py-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-5">
            <section className="bg-brand-teal p-7 text-white">
              <h2 className="text-xs font-extrabold tracking-wide text-brand-lime">
                球友綜合評價
              </h2>
              <p className="mt-2 text-5xl font-black text-white tabular-nums">
                {avg}
                <span className="ml-2 text-base font-bold text-white/80">
                  / 5.0（共 {stats._count} 則評價）
                </span>
              </p>
            </section>

            {session?.user && (
              <form
                action={submitTenantReview.bind(null, tenantSlug)}
                className="space-y-4 bg-[var(--surface)] p-6"
              >
                <h3 className="text-lg font-extrabold text-brand-navy">留下您的打球體驗</h3>
                {saved && (
                  <p className="bg-brand-lime-soft px-3 py-2 text-sm font-bold text-brand-navy">
                    感謝您的評價！
                  </p>
                )}
                {error && (
                  <p className="bg-rose-100 px-3 py-2 text-sm font-bold text-rose-900">
                    {error}
                  </p>
                )}
                <div>
                  <label htmlFor="review-rating" className="block text-xs font-bold text-brand-navy">
                    星級評分
                  </label>
                  <select
                    id="review-rating"
                    name="rating"
                    required
                    className="mt-1.5 w-full border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-bold text-brand-navy"
                  >
                    <option value="">請選擇星級</option>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} 星
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="review-comment" className="block text-xs font-bold text-brand-navy">
                    球友心得（選填）
                  </label>
                  <textarea
                    id="review-comment"
                    name="comment"
                    rows={3}
                    placeholder="分享場地品質、燈光或球敘體驗…"
                    className="mt-1.5 w-full border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-brand-navy"
                  />
                </div>
                <button type="submit" className="btn-brand">
                  送出評價 →
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-7">
            <h2 className="text-xl font-extrabold text-brand-navy">最新球友評論</h2>
            {reviews.length === 0 ? (
              <div className="mt-4 bg-[var(--surface)] p-8">
                <p className="text-sm font-medium text-[var(--muted)]">目前尚無球友評論。</p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="bg-[var(--surface)] p-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-extrabold text-brand-navy">
                        {r.user.name?.charAt(0) ?? "會"}**
                      </span>
                      <span className="font-bold text-brand-teal">{"★".repeat(r.rating)}</span>
                    </div>
                    {r.comment && (
                      <p className="mt-2.5 text-sm leading-relaxed text-brand-navy">{r.comment}</p>
                    )}
                    <p className="mt-2 text-xs text-[var(--muted)] tabular-nums">
                      {r.createdAt.toLocaleDateString("zh-TW")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
