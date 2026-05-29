import type { ReactNode } from "react";

const variants = {
  default: "bg-zinc-100 text-zinc-700",
  success: "bg-brand-lime-soft text-brand-navy",
  course: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  dupr: "bg-blue-100 text-blue-800",
  /** 活動狀態（管理後台），與類型標籤區隔 */
  published: "bg-violet-100 text-violet-800",
  draft: "bg-slate-200 text-slate-700",
  cancelled: "bg-rose-100 text-rose-800",
} as const;

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
