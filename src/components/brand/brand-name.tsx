import { BRAND } from "@/lib/brand";

type BrandNameProps = {
  className?: string;
  /** 整體字級，各段依比例微調 */
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  /** 淺底或深底文字對比模式 */
  tone?: "light" | "dark";
};

const sizeClasses = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-3xl",
  hero: "text-4xl sm:text-5xl",
};

/** 三色 PlayPlayPlay 字樣（通過 WCAG 4.5:1 對比度） */
export function BrandName({
  className = "",
  size = "md",
  tone = "light",
}: BrandNameProps) {
  const firstColor = tone === "dark" ? "#FFFFFF" : BRAND.navy;
  const secondColor = tone === "dark" ? "#4CC9D4" : "#1D6D75";
  const thirdColor = tone === "dark" ? BRAND.lime : "#3E6B14";

  return (
    <span
      className={`inline font-extrabold tracking-tight ${sizeClasses[size]} ${className}`}
      aria-label="PlayPlayPlay"
    >
      <span style={{ color: firstColor }}>Play</span>
      <span style={{ color: secondColor }}>Play</span>
      <span style={{ color: thirdColor }}>Play</span>
    </span>
  );
}
