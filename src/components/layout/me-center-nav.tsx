"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants";

const nav = [
  { href: ROUTES.me, label: "總覽" },
  { href: ROUTES.meBookings, label: "我的預約" },
  { href: ROUTES.meInbox, label: "通知收件匣" },
  { href: ROUTES.meProfile, label: "個人資料" },
  { href: ROUTES.meAccounts, label: "登入方式" },
  { href: ROUTES.meDupr, label: "DUPR" },
  { href: ROUTES.meNotifications, label: "通知設定" },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === ROUTES.me) return pathname === ROUTES.me;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MeCenterNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mt-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-4"
      aria-label="會員中心導覽"
    >
      {nav.map((item) => {
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-lg bg-brand-navy px-3 py-1.5 text-sm font-semibold text-white shadow-sm ring-1 ring-brand-navy/10"
                : "rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white hover:text-brand-navy"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
