import { BRAND } from "@/lib/brand";

type BrandNameProps = {
  className?: string;
  /** 整體字級，各段依比例微調 */
  size?: "sm" | "md" | "lg" | "xl" | "hero";
};

const sizeClasses = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-3xl",
  hero: "text-4xl sm:text-5xl",
};

/** 三色 PlayPlayPlay 字樣 */
export function BrandName({ className = "", size = "md" }: BrandNameProps) {
  return (
    <span
      className={`inline font-bold tracking-tight ${sizeClasses[size]} ${className}`}
      aria-label="PlayPlayPlay"
    >
      <span style={{ color: BRAND.navy }}>Play</span>
      <span style={{ color: BRAND.teal }}>Play</span>
      <span style={{ color: BRAND.lime }}>Play</span>
    </span>
  );
}
