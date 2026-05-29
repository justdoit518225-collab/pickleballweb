import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROUTES } from "@/lib/constants";

const nav = [
  { href: ROUTES.me, label: "總覽" },
  { href: ROUTES.meBookings, label: "我的預約" },
  { href: ROUTES.meInbox, label: "通知收件匣" },
  { href: ROUTES.meProfile, label: "個人資料" },
  { href: ROUTES.meDupr, label: "DUPR" },
  { href: ROUTES.meNotifications, label: "通知設定" },
] as const;

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">會員中心</h1>
      <p className="mt-1 text-sm text-zinc-600">你好，{session.user.name ?? "會員"}</p>
      <nav className="mt-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-4">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-800"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
