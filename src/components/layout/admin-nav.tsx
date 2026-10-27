"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants";

const links = (slug: string, isTenantAdmin: boolean) => [
  { href: ROUTES.tenantAdmin(slug), label: "活動總覽", exact: true },
  { href: ROUTES.tenantAdminDuprEvents(slug), label: "DUPR 對戰" },
  { href: ROUTES.tenantAdminVenues(slug), label: "場館／球場" },
  { href: ROUTES.tenantAdminRentals(slug), label: "租借時段" },
  { href: ROUTES.tenantAdminMembers(slug), label: "會員名單" },
  ...(isTenantAdmin
    ? [
        { href: ROUTES.tenantAdminStaff(slug), label: "員工權限" },
        { href: ROUTES.tenantAdminSettings(slug), label: "存取設定" },
      ]
    : []),
];

export function AdminNav({
  tenantSlug,
  isTenantAdmin,
}: {
  tenantSlug: string;
  isTenantAdmin: boolean;
}) {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-1.5">
        {links(tenantSlug, isTenantAdmin).map((l) => {
          const active = l.exact
            ? pathname === l.href
            : pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-2 text-[14px] font-black transition-colors ${
                active
                  ? "bg-brand-lime text-brand-navy"
                  : "bg-[#163560] text-white hover:bg-[#1f467a]"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
      <Link
        href={ROUTES.tenant(tenantSlug)}
        className="bg-white px-4 py-2 text-[14px] font-black text-brand-navy transition-colors hover:bg-brand-lime"
      >
        前往俱樂部前台 →
      </Link>
    </nav>
  );
}
