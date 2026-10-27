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
      <div className="space-y-1">
        {hasUsd ? (
          <p className="text-sm font-medium text-[var(--muted)] line-through tabular-nums">
            {usdNode}
          </p>
        ) : null}
        {showMemberPrice ? (
          hasMemberNumber ? (
            <p className="text-base font-extrabold text-brand-navy tabular-nums">
              {formatTwdMemberPrice(memberPriceTwd!)}
              {memberPriceNote ? (
                <span className="ml-1 text-sm font-normal text-[var(--muted)]">
                  （{memberPriceNote}）
                </span>
              ) : null}
            </p>
          ) : hasMemberNoteOnly ? (
            <p className="text-base font-extrabold text-brand-navy">
              {memberPriceNote}
            </p>
          ) : (
            <p className="text-sm text-[var(--muted)]">俱樂部售價待補</p>
          )
        ) : (
          <p className="text-sm leading-snug text-[#1D6D75]">
            <Link href={joinHref} className="font-bold hover:underline">
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
        <dd className="space-y-1 text-base font-bold text-brand-navy tabular-nums">
          {hasUsd ? (
            <p>
              <span className="text-[var(--muted)]">原價 </span>
              <span className="line-through">{usdNode}</span>
              {priceNote ? (
                <span className="ml-1.5 text-sm font-normal text-[var(--muted)]">
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
                  <span className="ml-1 text-sm font-normal text-[var(--muted)]">
                    （{memberPriceNote}）
                  </span>
                ) : null}
              </p>
            ) : hasMemberNoteOnly ? (
              <p className="text-brand-navy">俱樂部售價 {memberPriceNote}</p>
            ) : null
          ) : (
            <p className="text-sm font-bold text-[#1D6D75]">
              <Link href={joinHref} className="hover:underline">
                {joinCtaLabel}
              </Link>
            </p>
          )}
        </dd>
        <dt className="mt-0.5 text-sm text-[var(--muted)]">參考價格</dt>
      </div>
    );
  }

  // detail (rendered inside bg-brand-navy header)
  return (
    <div className="space-y-1.5 pt-1">
      {hasUsd ? (
        <p className="text-base font-semibold text-white/80 tabular-nums">
          原價{" "}
          <span className="line-through">{usdNode}</span>
          {priceNote ? (
            <span className="ml-2 text-sm font-normal text-white/75">
              （{priceNote}）
            </span>
          ) : null}
        </p>
      ) : null}
      {showMemberPrice ? (
        hasMemberNumber ? (
          <p className="text-xl font-extrabold text-brand-lime tabular-nums">
            俱樂部售價 {formatTwdMemberPrice(memberPriceTwd!)}
            {memberPriceNote ? (
              <span className="ml-2 text-sm font-normal text-white/80">
                （{memberPriceNote}）
              </span>
            ) : null}
          </p>
        ) : hasMemberNoteOnly ? (
          <p className="text-xl font-extrabold text-brand-lime">
            俱樂部售價 {memberPriceNote}
          </p>
        ) : null
      ) : (
        <p className="text-sm">
          <Link
            href={joinHref}
            className="inline-block bg-brand-lime px-3.5 py-1.5 font-extrabold text-brand-navy hover:bg-white"
          >
            {joinCtaLabel} →
          </Link>
        </p>
      )}
    </div>
  );
}
