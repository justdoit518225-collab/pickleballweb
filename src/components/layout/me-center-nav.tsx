"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants";

const nav = [
  { href: ROUTES.me, label: "總覽" },
  { href: ROUTES.meBookings, label: "我的預約" },
  { href: ROUTES.meInbox, label: "通知收件匣" },
  { href: ROUTES.meDupr, label: "DUPR 積分" },
  { href: ROUTES.meProfile, label: "個人資料" },
  { href: ROUTES.meAccounts, label: "登入方式" },
  { href: ROUTES.meNotifications, label: "推播設定" },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === ROUTES.me) return pathname === ROUTES.me;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MeCenterNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mt-7 flex flex-wrap gap-2"
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
                ? "bg-brand-lime px-4 py-2 text-sm font-extrabold text-brand-navy"
                : "bg-[#163560] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-teal"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
