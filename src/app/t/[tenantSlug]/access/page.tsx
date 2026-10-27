import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { submitTenantAccessCode } from "@/app/t/[tenantSlug]/actions";
import { Badge } from "@/components/ui/badge";
import { canAccessTenant } from "@/lib/tenant-access";
import { getTenantBySlug } from "@/lib/tenant";
import { ROUTES } from "@/lib/constants";

export default async function TenantAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenantSlug } = await params;
  const { error } = await searchParams;
  const [tenant, session] = await Promise.all([
    getTenantBySlug(tenantSlug),
    auth(),
  ]);

  if (!tenant) {
    redirect(
      `${ROUTES.home}?privateError=${encodeURIComponent("找不到此俱樂部，請在首頁輸入邀請碼")}#private-club`,
    );
  }

  if (tenant.visibility === "PUBLIC") {
    redirect(ROUTES.tenant(tenantSlug));
  }

  if (await canAccessTenant(tenant)) {
    redirect(ROUTES.tenant(tenantSlug));
  }

  const loggedIn = Boolean(session?.user?.id);
  const submit = submitTenantAccessCode.bind(null, tenantSlug);
  const loginHref = ROUTES.loginWithCallback(ROUTES.tenantAccess(tenantSlug));

  return (
    <div className="page-wrap py-16 sm:py-24">
      <div className="mx-auto max-w-lg bg-brand-navy p-8 text-white sm:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="success">PRIVATE CLUB · 私人俱樂部</Badge>
        </div>
        <h1 className="type-head mt-4 text-white">{tenant.displayName}</h1>
        <p className="mt-3 text-base leading-relaxed text-white/80">
          此俱樂部僅限受邀會員進入。請先以 Google 或 LINE 登入，再輸入場館提供的通行邀請碼。
        </p>

        {!loggedIn ? (
          <div className="mt-8 space-y-4">
            <p className="bg-white/10 px-4 py-3 text-sm font-semibold text-brand-lime">
              訪客無法直接加入，請先登入成為會員。
            </p>
            <Link href={loginHref} className="btn-brand-lime w-full">
              使用 Google / LINE 登入 →
            </Link>
          </div>
        ) : (
          <>
            {error ? (
              <p className="mt-4 bg-rose-950/90 px-4 py-2.5 text-sm font-bold text-rose-200">
                {error}
              </p>
            ) : null}
            <form action={submit} className="mt-8 space-y-4">
              <div>
                <label
                  className="block text-xs font-extrabold tracking-wide text-brand-lime"
                  htmlFor="accessCode"
                >
                  俱樂部邀請碼
                </label>
                <input
                  id="accessCode"
                  name="accessCode"
                  required
                  autoComplete="off"
                  placeholder="請輸入邀請碼"
                  className="mt-2 w-full bg-white px-4 py-3 text-base font-bold tracking-widest text-brand-navy uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-[#4a5d73]"
                />
              </div>
              <button type="submit" className="btn-brand-lime w-full">
                驗證邀請碼並加入 →
              </button>
            </form>
          </>
        )}

        <Link
          href={ROUTES.home}
          className="mt-8 inline-block text-sm font-bold text-white/75 hover:text-brand-lime"
        >
          ← 返回首頁探索其他俱樂部
        </Link>
      </div>
    </div>
  );
}
