import Link from "next/link";
import { notFound } from "next/navigation";
import { createPaddle, deletePaddle } from "@/app/platform/paddles/actions";
import { ConfirmSubmitButton } from "@/components/platform/confirm-submit-button";
import { PaddleRichEditor } from "@/components/paddles/paddle-rich-editor";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function PlatformPaddleBrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ brandId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { brandId } = await params;
  const { error, saved } = await searchParams;

  const brand = await prisma.paddleBrand.findUnique({
    where: { id: brandId },
    include: {
      paddles: { orderBy: [{ sortOrder: "asc" }, { nameZh: "asc" }] },
    },
  });
  if (!brand) notFound();

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link
            href={ROUTES.platformPaddles}
            className="text-sm text-slate-600 hover:text-brand-navy"
          >
            ← 品牌列表
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-800">{brand.name}</h1>
          <p className="mt-1 text-sm text-slate-600">管理此品牌的球拍與縮圖</p>
        </div>
        <Link href={ROUTES.paddles} className="text-sm text-brand-teal hover:underline">
          查看前台
        </Link>
      </div>

      {saved && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          已儲存
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">新增球拍</h2>
        <form
          action={createPaddle.bind(null, brandId)}
          encType="multipart/form-data"
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <Field label="中文全名" name="nameZh" required />
          <Field label="英文全名" name="nameEn" required />
          <Field label="款式／系列" name="series" required />
          <Field label="子版本／顏色" name="variant" placeholder="無則填 -" defaultValue="-" />
          <Field
            label="Slug（前台網址，可空白自動產生）"
            name="slug"
            placeholder="例：luzz-inferno-zero"
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              詳細介紹
            </label>
            <p className="mt-1 text-xs text-slate-500">
              可用工具列設定粗體、標題與列表。
            </p>
            <PaddleRichEditor name="description" required />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="highlights">
              特點（逗號或換行分隔）
            </label>
            <textarea
              id="highlights"
              name="highlights"
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="例：地獄火系列, 控球取向"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="image">
              縮圖（JPG／PNG／WebP，&lt; 1MB）
            </label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 block w-full text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              新增球拍
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">縮圖</th>
              <th className="px-4 py-3 font-medium">名稱</th>
              <th className="px-4 py-3 font-medium">系列</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {brand.paddles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-slate-500">
                  尚無球拍
                </td>
              </tr>
            ) : (
              brand.paddles.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    {p.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageDataUrl}
                        alt=""
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">
                        無圖
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{p.nameZh}</p>
                    <p className="text-xs text-slate-500">{p.nameEn}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.series}
                    {p.variant !== "-" ? ` · ${p.variant}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={ROUTES.platformPaddleEdit(brandId, p.id)}
                      className="text-brand-teal hover:underline"
                    >
                      編輯
                    </Link>
                    {" · "}
                    <Link
                      href={ROUTES.paddle(p.slug)}
                      className="text-slate-600 hover:underline"
                    >
                      前台
                    </Link>
                    {" · "}
                    <form action={deletePaddle.bind(null, brandId, p.id)} className="inline">
                      <ConfirmSubmitButton
                        label="刪除"
                        confirmMessage={`確定刪除「${p.nameZh}」？`}
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

function Field({
  label,
  name,
  required,
  placeholder,
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </div>
  );
}
