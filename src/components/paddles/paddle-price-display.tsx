import Link from "next/link";
import {
  formatTwdMemberPrice,
  formatUsdListPrice,
} from "@/lib/paddle-price";

type Props = {
  listPriceUsd: number | null;
  priceSourceUrl?: string | null;
  priceNote?: string | null;
  showMemberPrice: boolean;
  memberPriceTwd?: number | null;
  memberPriceNote?: string | null;
  joinHref: string;
  joinCtaLabel: string;
  /** catalog = 緊湊；detail = 標題下大字 */
  variant?: "catalog" | "detail" | "spec";
};

export function PaddlePriceDisplay({
  listPriceUsd,
  priceSourceUrl,
  priceNote,
  showMemberPrice,
  memberPriceTwd,
  memberPriceNote,
  joinHref,
  joinCtaLabel,
  variant = "catalog",
}: Props) {
  const hasUsd = listPriceUsd != null;
  const hasMemberNumber = showMemberPrice && memberPriceTwd != null;
  const hasMemberNoteOnly =
    showMemberPrice && memberPriceTwd == null && Boolean(memberPriceNote);
  const hasMember = hasMemberNumber || hasMemberNoteOnly;

  if (!hasUsd && !hasMember) return null;

  const usdText = hasUsd ? formatUsdListPrice(listPriceUsd!) : null;
  const usdNode =
    usdText && priceSourceUrl ? (
      <a
        href={priceSourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-2 hover:underline"
      >
        {usdText}
      </a>
    ) : (
      usdText
    );

  if (variant === "catalog") {
    return (
      <div className="space-y-0.5">
        {hasUsd ? (
          <p className="text-xs font-medium text-slate-500 line-through decoration-slate-400">
            {usdNode}
          </p>
        ) : null}
        {showMemberPrice ? (
          hasMemberNumber ? (
            <p className="text-xs font-semibold text-brand-navy">
              {formatTwdMemberPrice(memberPriceTwd!)}
              {memberPriceNote ? (
                <span className="ml-1 font-normal text-slate-500">
                  （{memberPriceNote}）
                </span>
              ) : null}
            </p>
          ) : hasMemberNoteOnly ? (
            <p className="text-xs font-semibold text-brand-navy">
              {memberPriceNote}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">俱樂部售價待補</p>
          )
        ) : (
          <p className="text-[11px] leading-snug text-brand-teal">
            <Link href={joinHref} className="font-medium hover:underline">
              {joinCtaLabel}
            </Link>
          </p>
        )}
      </div>
    );
  }

  if (variant === "spec") {
    return (
      <div>
        <dt className="text-xs text-slate-500">價格</dt>
        <dd className="mt-0.5 space-y-1 font-medium text-slate-900">
          {hasUsd ? (
            <p>
              <span className="text-slate-500">原價 </span>
              <span className="line-through decoration-slate-400">{usdNode}</span>
              {priceNote ? (
                <span className="ml-1.5 text-xs font-normal text-slate-500">
                  （{priceNote}）
                </span>
              ) : null}
            </p>
          ) : null}
          {showMemberPrice ? (
            hasMemberNumber ? (
              <p className="text-brand-navy">
                俱樂部售價 {formatTwdMemberPrice(memberPriceTwd!)}
                {memberPriceNote ? (
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    （{memberPriceNote}）
                  </span>
                ) : null}
              </p>
            ) : hasMemberNoteOnly ? (
              <p className="text-brand-navy">俱樂部售價 {memberPriceNote}</p>
            ) : null
          ) : (
            <p className="text-sm font-normal text-brand-teal">
              <Link href={joinHref} className="hover:underline">
                {joinCtaLabel}
              </Link>
            </p>
          )}
        </dd>
      </div>
    );
  }

  // detail
  return (
    <div className="space-y-1 pt-1">
      {hasUsd ? (
        <p className="text-base font-semibold text-slate-600">
          原價{" "}
          <span className="line-through decoration-slate-400">{usdNode}</span>
          {priceNote ? (
            <span className="ml-2 text-sm font-normal text-slate-500">
              （{priceNote}）
            </span>
          ) : null}
        </p>
      ) : null}
      {showMemberPrice ? (
        hasMemberNumber ? (
          <p className="text-lg font-bold text-brand-navy">
            俱樂部售價 {formatTwdMemberPrice(memberPriceTwd!)}
            {memberPriceNote ? (
              <span className="ml-2 text-sm font-normal text-slate-500">
                （{memberPriceNote}）
              </span>
            ) : null}
          </p>
        ) : hasMemberNoteOnly ? (
          <p className="text-lg font-bold text-brand-navy">
            俱樂部售價 {memberPriceNote}
          </p>
        ) : null
      ) : (
        <p className="text-sm text-brand-teal">
          <Link href={joinHref} className="font-semibold hover:underline">
            {joinCtaLabel}
          </Link>
        </p>
      )}
    </div>
  );
}
