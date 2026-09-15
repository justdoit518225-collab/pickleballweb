import Link from "next/link";
import { ROUTES } from "@/lib/constants";

const LINKS = [
  { href: ROUTES.platformAdmin, label: "租戶" },
  { href: ROUTES.platformPaddles, label: "匹克球拍" },
  { href: ROUTES.platformContact, label: "站內聯繫" },
] as const;

export function PlatformNav({ contactUnread = 0 }: { contactUnread?: number }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-brand-teal-soft hover:text-brand-navy"
        >
          {link.label}
          {link.href === ROUTES.platformContact && contactUnread > 0 ? (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {contactUnread > 9 ? "9+" : contactUnread}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
