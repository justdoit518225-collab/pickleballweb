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
    // 常見情況：把邀請碼誤當 slug（例如 /t/1234/access）
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
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">{tenant.displayName}</h1>
          <Badge variant="default">私人俱樂部</Badge>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          此俱樂部僅限受邀會員進入。請先以 Google 或 LINE 登入，再輸入場館提供的邀請碼。
        </p>

        {!loggedIn ? (
          <div className="mt-6 space-y-3">
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              訪客無法直接加入。請先登入成為會員。
            </p>
            <Link
              href={loginHref}
              className="flex w-full items-center justify-center rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              使用 Google / LINE 登入
            </Link>
          </div>
        ) : (
          <>
            {error ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <form action={submit} className="mt-6 space-y-4">
              <div>
                <label
                  className="block text-sm font-medium text-slate-700"
                  htmlFor="accessCode"
                >
                  邀請碼
                </label>
                <input
                  id="accessCode"
                  name="accessCode"
                  required
                  autoComplete="off"
                  placeholder="請輸入邀請碼"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono uppercase tracking-wider"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                驗證並加入
              </button>
            </form>
          </>
        )}

        <Link href={ROUTES.home} className="mt-6 inline-block text-sm text-brand-teal">
          ← 返回首頁探索其他俱樂部
        </Link>
      </div>
    </div>
  );
}
