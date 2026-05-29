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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={ROUTES.tenant(tenantSlug)} className="text-sm text-emerald-600">
        ← {tenant.displayName}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-800">關於場館</h1>
      <p className="mt-4 whitespace-pre-wrap text-slate-700">{tenant.description ?? "歡迎來打球！"}</p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">評價</h2>
        <p className="mt-1 text-2xl font-bold text-amber-600">
          {avg} <span className="text-sm font-normal text-slate-500">/ 5（{stats._count} 則）</span>
        </p>
      </section>

      {session?.user && (
        <form
          action={submitTenantReview.bind(null, tenantSlug)}
          className="mt-6 rounded-xl border border-slate-200 bg-white p-5 space-y-3"
        >
          <h3 className="font-medium">留下評價</h3>
          {saved && <p className="text-sm text-emerald-600">感謝您的評價！</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <select name="rating" required className="rounded-lg border px-3 py-2 text-sm">
            <option value="">星級</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} 星
              </option>
            ))}
          </select>
          <textarea name="comment" rows={3} placeholder="心得（選填）" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
            送出
          </button>
        </form>
      )}

      <ul className="mt-8 space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-100 bg-white p-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{r.user.name?.charAt(0) ?? "會"}**</span>
              <span className="text-amber-600">{"★".repeat(r.rating)}</span>
            </div>
            {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
            <p className="mt-1 text-xs text-slate-400">{r.createdAt.toLocaleDateString("zh-TW")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
