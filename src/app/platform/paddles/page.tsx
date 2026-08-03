import Link from "next/link";
import { createPaddleBrand, deletePaddleBrand } from "@/app/platform/paddles/actions";
import { ConfirmSubmitButton } from "@/components/platform/confirm-submit-button";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function PlatformPaddlesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const brands = await prisma.paddleBrand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { paddles: true } } },
  });

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-800">匹克球拍 · 品牌</h1>
      <p className="mt-1 text-sm text-slate-600">
        新增／刪除品牌；點品牌進入管理該品牌球拍。刪除品牌會一併刪除底下所有球拍。
      </p>

      {saved && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          已儲存
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">新增品牌</h2>
        <form action={createPaddleBrand} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="brand-name" className="block text-sm font-medium text-slate-700">
              品牌名稱
            </label>
            <input
              id="brand-name"
              name="name"
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="例：LUZZ"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            新增
          </button>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">品牌</th>
              <th className="px-4 py-3 font-medium">球拍數</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {brands.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-slate-500">
                  尚無品牌
                </td>
              </tr>
            ) : (
              brands.map((b) => (
                <tr key={b.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                  <td className="px-4 py-3 text-slate-600">{b._count.paddles}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={ROUTES.platformPaddleBrand(b.id)}
                      className="text-brand-teal hover:underline"
                    >
                      管理球拍
                    </Link>
                    {" · "}
                    <form action={deletePaddleBrand.bind(null, b.id)} className="inline">
                      <ConfirmSubmitButton
                        label="刪除"
                        confirmMessage={`確定刪除品牌「${b.name}」？底下 ${b._count.paddles} 款球拍也會一併刪除。`}
                        className="text-red-600 hover:underline"
                      />
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
