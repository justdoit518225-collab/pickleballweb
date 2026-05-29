import Image from "next/image";
import Link from "next/link";
import { BrandName } from "@/components/brand/brand-name";
import { ROUTES } from "@/lib/constants";

type LogoProps = {
  href?: string;
  /** 僅圖示 | 圖示+文字橫排 | 圖示+文字直排（首頁用大圖） */
  variant?: "icon" | "horizontal" | "stacked";
  /** 圖示路徑；header 僅圖示時預設為球拍 icon */
  iconSrc?: string;
  iconSize?: number;
  nameSize?: "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
};

export const LOGO_ICON_SRC = "/logo-icon.png";

export function Logo({
  href = ROUTES.home,
  variant = "horizontal",
  iconSrc = LOGO_ICON_SRC,
  iconSize = 40,
  nameSize = "md",
  className = "",
}: LogoProps) {
  const src = iconSrc;

  const icon = (
    <Image
      src={src}
      alt="PlayPlayPlay"
      width={iconSize}
      height={iconSize}
      className="logo-mark h-auto w-auto object-contain"
      priority
    />
  );

  const content =
    variant === "icon" ? (
      icon
    ) : variant === "stacked" ? (
      <span className={`flex flex-col items-center gap-3 ${className}`}>
        <Image
          src={src}
          alt=""
          width={iconSize}
          height={iconSize}
          className="logo-mark h-auto w-auto object-contain"
          priority
        />
        <BrandName size={nameSize} />
      </span>
    ) : (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        {icon}
        <BrandName size={nameSize} />
      </span>
    );

  if (!href) return content;

  return (
    <Link href={href} className="transition-opacity hover:opacity-90">
      {content}
    </Link>
  );
}
