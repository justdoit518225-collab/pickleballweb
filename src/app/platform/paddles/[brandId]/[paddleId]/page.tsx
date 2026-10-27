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
    <div className="space-y-6">
      <div>
        <Link
          href={ROUTES.platformPaddleBrand(brandId)}
          className="text-[14px] font-black text-[#1B6B73] hover:text-brand-navy"
        >
          ← 返回 {paddle.brand.name}
        </Link>
        <h2 className="mt-1 text-[24px] font-black text-brand-navy">編輯球拍</h2>
        <p className="mt-1 text-[14px] text-[var(--muted)]">{paddle.nameZh}</p>
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
        <form
          action={updatePaddle.bind(null, brandId, paddleId)}
          className="grid gap-4 sm:grid-cols-2"
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
          <Field
            label="原價 USD（MSRP，可空白）"
            name="listPriceUsd"
            placeholder="例：109 或 299.95"
            inputMode="decimal"
            defaultValue={
              paddle.listPriceUsd != null ? paddle.listPriceUsd.toString() : ""
            }
          />
          <Field
            label="原價來源網址"
            name="priceSourceUrl"
            placeholder="https://…"
            defaultValue={paddle.priceSourceUrl ?? ""}
          />
          <Field
            label="原價備註（可空白）"
            name="priceNote"
            placeholder="例：14/16mm 同價"
            defaultValue={paddle.priceNote ?? ""}
            className="sm:col-span-2"
          />
          <Field
            label="會員售價 TWD（可空白）"
            name="memberPriceTwd"
            placeholder="例：6700"
            inputMode="numeric"
            defaultValue={
              paddle.memberPriceTwd != null ? paddle.memberPriceTwd.toString() : ""
            }
          />
          <Field
            label="會員售價備註（可空白）"
            name="memberPriceNote"
            placeholder="例：贈拍套、電洽"
            defaultValue={paddle.memberPriceNote ?? ""}
          />
          <div className="sm:col-span-2">
            <label className="block text-[14px] font-bold text-brand-navy">
              詳細介紹
            </label>
            <p className="mt-1 text-[14px] text-[var(--muted)]">
              可用工具列設定粗體、標題與列表。
            </p>
            <PaddleRichEditor
              name="description"
              initialValue={paddle.description}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[14px] font-bold text-brand-navy" htmlFor="highlights">
              特點（逗號或換行分隔）
            </label>
            <textarea
              id="highlights"
              name="highlights"
              rows={2}
              defaultValue={paddle.highlights.join("\n")}
              className="mt-1 w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <p className="text-[14px] font-bold text-brand-navy">目前縮圖</p>
            {paddle.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={paddle.imageDataUrl}
                alt=""
                className="h-32 w-32 object-cover"
              />
            ) : (
              <p className="text-[14px] text-[var(--muted)]">尚無縮圖</p>
            )}
            <label className="block text-[14px] font-bold text-brand-navy" htmlFor="image">
              更換縮圖（JPG／PNG／WebP，&lt; 1MB）
            </label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 block w-full text-[14px]"
            />
            {paddle.imageDataUrl ? (
              <label className="mt-2 flex items-center gap-2 text-[14px] font-bold text-brand-navy">
                <input type="checkbox" name="clearImage" value="1" />
                清除現有縮圖
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button type="submit" className="btn-brand">
              儲存
            </button>
            <Link
              href={ROUTES.paddle(paddle.slug)}
              className="bg-[var(--bg)] px-5 py-2.5 text-[14px] font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
            >
              查看前台
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  defaultValue,
  className,
  placeholder,
  inputMode,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
  placeholder?: string;
  inputMode?: "decimal" | "text" | "numeric" | "url";
}) {
  return (
    <div className={className}>
      <label className="block text-[14px] font-bold text-brand-navy" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-1 w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
      />
    </div>
  );
}
