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
    <div className="space-y-6">
      <div>
        <h2 className="text-[24px] font-black text-brand-navy">匹克球拍 · 品牌</h2>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          新增／刪除品牌；點品牌進入管理該品牌球拍。刪除品牌會一併刪除底下所有球拍。
        </p>
      </div>

      {saved && (
        <p className="bg-[var(--surface-tint)] px-4 py-3 text-[14px] font-bold text-[#1B6B73]">
          已儲存
        </p>
      )}
      {error && (
        <p className="bg-[#FCECE9] px-4 py-3 text-[14px] font-bold text-[#B42318]">{error}</p>
      )}

      <section className="bg-white p-6">
        <h3 className="text-[20px] font-black text-brand-navy">新增品牌</h3>
        <form action={createPaddleBrand} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="brand-name" className="block text-[14px] font-bold text-brand-navy">
              品牌名稱
            </label>
            <input
              id="brand-name"
              name="name"
              required
              className="mt-1 w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
              placeholder="例：LUZZ"
            />
          </div>
          <button type="submit" className="btn-brand">
            新增
          </button>
        </form>
      </section>

      <section className="overflow-hidden bg-white">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-brand-navy text-white">
            <tr>
              <th className="px-4 py-3 font-black">品牌</th>
              <th className="px-4 py-3 font-black">球拍數</th>
              <th className="px-4 py-3 font-black">操作</th>
            </tr>
          </thead>
          <tbody>
            {brands.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-[var(--muted)]">
                  尚無品牌
                </td>
              </tr>
            ) : (
              brands.map((b) => (
                <tr key={b.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-black text-brand-navy">{b.name}</td>
                  <td className="px-4 py-3 font-mono font-bold text-brand-navy">{b._count.paddles}</td>
                  <td className="px-4 py-3 font-bold">
                    <Link
                      href={ROUTES.platformPaddleBrand(b.id)}
                      className="text-[#1B6B73] hover:underline"
                    >
                      管理球拍
                    </Link>
                    {" · "}
                    <form action={deletePaddleBrand.bind(null, b.id)} className="inline">
                      <ConfirmSubmitButton
                        label="刪除"
                        confirmMessage={`確定刪除品牌「${b.name}」？底下 ${b._count.paddles} 款球拍也會一併刪除。`}
                        className="font-bold text-[#B42318] hover:underline"
                      />
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
