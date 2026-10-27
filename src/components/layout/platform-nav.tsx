"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants";

const LINKS = [
  { href: ROUTES.platformAdmin, label: "租戶俱樂部" },
  { href: ROUTES.platformPaddles, label: "匹克球拍目錄" },
  { href: ROUTES.platformSkillTraining, label: "實力訓練集" },
  { href: ROUTES.platformContact, label: "站內聯繫" },
] as const;

export function PlatformNav({ contactUnread = 0 }: { contactUnread?: number }) {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex flex-wrap gap-1.5">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex items-center gap-2 px-4 py-2 text-[14px] font-black transition-colors ${
              active
                ? "bg-brand-lime text-brand-navy"
                : "bg-[#163560] text-white hover:bg-[#1f467a]"
            }`}
          >
            {link.label}
            {link.href === ROUTES.platformContact && contactUnread > 0 ? (
              <span className="bg-[#FCECE9] px-1.5 py-0.5 text-[14px] font-black text-[#B42318]">
                {contactUnread > 9 ? "9+" : contactUnread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
