import Link from "next/link";
import { notFound } from "next/navigation";
import { updatePaddle } from "@/app/platform/paddles/actions";
import { PaddleRichEditor } from "@/components/paddles/paddle-rich-editor";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function PlatformPaddleEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ brandId: string; paddleId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { brandId, paddleId } = await params;
  const { error, saved } = await searchParams;

  const paddle = await prisma.paddle.findFirst({
    where: { id: paddleId, brandId },
    include: { brand: true },
  });
  if (!paddle) notFound();

  return (
    <>
      <Link
        href={ROUTES.platformPaddleBrand(brandId)}
        className="text-sm text-slate-600 hover:text-brand-navy"
      >
        ← 返回 {paddle.brand.name}
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-slate-800">編輯球拍</h1>
      <p className="mt-1 text-sm text-slate-600">{paddle.nameZh}</p>

      {saved && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          已儲存
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form
          action={updatePaddle.bind(null, brandId, paddleId)}
          encType="multipart/form-data"
          className="grid gap-3 sm:grid-cols-2"
        >
          <Field label="中文全名" name="nameZh" required defaultValue={paddle.nameZh} />
          <Field label="英文全名" name="nameEn" required defaultValue={paddle.nameEn} />
          <Field label="款式／系列" name="series" required defaultValue={paddle.series} />
          <Field label="子版本／顏色" name="variant" defaultValue={paddle.variant} />
          <Field
            label="Slug（前台網址）"
            name="slug"
            required
            defaultValue={paddle.slug}
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              詳細介紹
            </label>
            <p className="mt-1 text-xs text-slate-500">
              可用工具列設定粗體、標題與列表。
            </p>
            <PaddleRichEditor
              name="description"
              initialValue={paddle.description}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="highlights">
              特點（逗號或換行分隔）
            </label>
            <textarea
              id="highlights"
              name="highlights"
              rows={2}
              defaultValue={paddle.highlights.join("\n")}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <p className="text-sm font-medium text-slate-700">目前縮圖</p>
            {paddle.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={paddle.imageDataUrl}
                alt=""
                className="h-32 w-32 rounded-lg object-cover"
              />
            ) : (
              <p className="text-sm text-slate-500">尚無縮圖</p>
            )}
            <label className="block text-sm font-medium text-slate-700" htmlFor="image">
              更換縮圖（JPG／PNG／WebP，&lt; 1MB）
            </label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 block w-full text-sm"
            />
            {paddle.imageDataUrl ? (
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="clearImage" value="1" />
                清除現有縮圖
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              儲存
            </button>
            <Link
              href={ROUTES.paddle(paddle.slug)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              查看前台
            </Link>
          </div>
        </form>
      </section>
    </>
  );
}

function Field({
  label,
  name,
  required,
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  required?: boolean;
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
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </div>
  );
}
