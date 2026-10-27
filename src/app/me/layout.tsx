import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MeCenterNav } from "@/components/layout/me-center-nav";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div>
      <section className="bg-brand-navy py-10 text-white sm:py-14">
        <div className="page-wrap mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-11">
          <h1 className="type-head font-extrabold text-white">會員中心</h1>
          <p className="mt-2 text-base text-white/85">
            你好，{session.user.name ?? "會員"} · 管理你的場館預約、DUPR 積分與個人檔案
          </p>
          <MeCenterNav />
        </div>
      </section>
      <div
        className="page-wrap mx-auto w-full max-w-[1600px] px-5 py-10 sm:px-8 sm:py-14 lg:px-11"
        data-ui
      >
        {children}
      </div>
    </div>
  );
}
