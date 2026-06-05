import Link from "next/link";
import { ROUTES } from "@/lib/constants";

const links = (slug: string) => [
  { href: ROUTES.tenantAdmin(slug), label: "總覽" },
  { href: ROUTES.tenantAdminBoard(slug), label: "當日看板" },
  { href: ROUTES.tenantAdminRentals(slug), label: "場地租借" },
  { href: ROUTES.tenantAdminVenues(slug), label: "場館/球場" },
  { href: ROUTES.tenantAdminMembers(slug), label: "會員" },
  { href: ROUTES.tenantAdminStaff(slug), label: "員工權限" },
  { href: ROUTES.tenantAdminSettings(slug), label: "設定" },
];

export function AdminNav({ tenantSlug }: { tenantSlug: string }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {links(tenantSlug).map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-brand-teal-soft hover:text-brand-navy"
        >
          {l.label}
        </Link>
      ))}
      <Link
        href={ROUTES.tenant(tenantSlug)}
        className="rounded-lg px-3 py-1.5 text-sm text-brand-teal"
      >
        前往前台
      </Link>
    </nav>
  );
}
