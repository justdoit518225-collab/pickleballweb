import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MeCenterNav } from "@/components/layout/me-center-nav";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">會員中心</h1>
      <p className="mt-1 text-sm text-zinc-600">你好，{session.user.name ?? "會員"}</p>
      <MeCenterNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
