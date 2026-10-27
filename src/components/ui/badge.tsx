import type { ReactNode } from "react";

const variants = {
  default: "bg-[var(--surface-alt)] text-[var(--ink)]",
  success: "bg-brand-lime text-brand-navy",
  course: "bg-brand-teal text-white",
  warning: "bg-amber-200 text-amber-950",
  dupr: "bg-brand-navy text-white",
  /** 活動狀態（管理後台），與類型標籤區隔，嚴格遵循無紫/靛色規範 */
  published: "bg-brand-lime-soft text-brand-navy",
  draft: "bg-[var(--surface-alt)] text-[var(--muted)]",
  cancelled: "bg-rose-100 text-rose-900",
} as const;

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-bold tracking-tight ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
