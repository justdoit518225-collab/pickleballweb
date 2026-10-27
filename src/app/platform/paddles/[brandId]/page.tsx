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
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link
            href={ROUTES.platformPaddles}
            className="text-[14px] font-black text-[#1B6B73] hover:text-brand-navy"
          >
            ← 品牌列表
          </Link>
          <h2 className="mt-1 text-[24px] font-black text-brand-navy">{brand.name}</h2>
          <p className="mt-1 text-[14px] text-[var(--muted)]">管理此品牌的球拍與縮圖</p>
        </div>
        <Link href={ROUTES.paddles} className="text-[14px] font-black text-[#1B6B73] hover:underline">
          查看前台 →
        </Link>
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
        <h3 className="text-[20px] font-black text-brand-navy">新增球拍</h3>
        <form
          action={createPaddle.bind(null, brandId)}
          className="mt-4 grid gap-4 sm:grid-cols-2"
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
          <Field
            label="原價 USD（MSRP，可空白）"
            name="listPriceUsd"
            placeholder="例：109 或 299.95"
            inputMode="decimal"
          />
          <Field
            label="原價來源網址"
            name="priceSourceUrl"
            placeholder="https://…"
          />
          <Field
            label="原價備註（可空白）"
            name="priceNote"
            placeholder="例：14/16mm 同價"
            className="sm:col-span-2"
          />
          <Field
            label="會員售價 TWD（可空白）"
            name="memberPriceTwd"
            placeholder="例：6700"
            inputMode="numeric"
          />
          <Field
            label="會員售價備註（可空白）"
            name="memberPriceNote"
            placeholder="例：贈拍套、電洽"
          />
          <div className="sm:col-span-2">
            <label className="block text-[14px] font-bold text-brand-navy">
              詳細介紹
            </label>
            <p className="mt-1 text-[14px] text-[var(--muted)]">
              可用工具列設定粗體、標題與列表。
            </p>
            <PaddleRichEditor name="description" required />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[14px] font-bold text-brand-navy" htmlFor="highlights">
              特點（逗號或換行分隔）
            </label>
            <textarea
              id="highlights"
              name="highlights"
              rows={2}
              className="mt-1 w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
              placeholder="例：地獄火系列, 控球取向"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[14px] font-bold text-brand-navy" htmlFor="image">
              縮圖（JPG／PNG／WebP，&lt; 1MB）
            </label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 block w-full text-[14px]"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-brand">
              新增球拍
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden bg-white">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-brand-navy text-white">
            <tr>
              <th className="px-4 py-3 font-black">縮圖</th>
              <th className="px-4 py-3 font-black">名稱</th>
              <th className="px-4 py-3 font-black">系列</th>
              <th className="px-4 py-3 font-black">操作</th>
            </tr>
          </thead>
          <tbody>
            {brand.paddles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-[var(--muted)]">
                  尚無球拍
                </td>
              </tr>
            ) : (
              brand.paddles.map((p) => (
                <tr key={p.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    {p.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageDataUrl}
                        alt=""
                        className="h-12 w-12 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center bg-[var(--bg)] text-[14px] font-bold text-[var(--muted)]">
                        無圖
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-black text-brand-navy">{p.nameZh}</p>
                    <p className="text-[14px] text-[var(--muted)]">{p.nameEn}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {p.series}
                    {p.variant !== "-" ? ` · ${p.variant}` : ""}
                  </td>
                  <td className="px-4 py-3 font-bold">
                    <Link
                      href={ROUTES.platformPaddleEdit(brandId, p.id)}
                      className="text-[#1B6B73] hover:underline"
                    >
                      編輯
                    </Link>
                    {" · "}
                    <Link
                      href={ROUTES.paddle(p.slug)}
                      className="text-brand-navy hover:underline"
                    >
                      前台
                    </Link>
                    {" · "}
                    <form action={deletePaddle.bind(null, brandId, p.id)} className="inline">
                      <ConfirmSubmitButton
                        label="刪除"
                        confirmMessage={`確定刪除「${p.nameZh}」？`}
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

function Field({
  label,
  name,
  required,
  placeholder,
  defaultValue,
  className,
  inputMode,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
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
        placeholder={placeholder}
        defaultValue={defaultValue}
        inputMode={inputMode}
        className="mt-1 w-full bg-[var(--bg)] px-4 py-2.5 text-[14px] text-brand-navy"
      />
    </div>
  );
}
