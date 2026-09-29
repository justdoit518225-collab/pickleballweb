import { ConfirmForm } from "@/components/admin/confirm-form";
import { requireTenantAdmin } from "@/lib/authz";
import { getFitbookStore } from "@/lib/fitbook";
import { getFitbookConnection } from "@/lib/fitbook-session";
import { formatTaipeiDateTime } from "@/lib/format-datetime";
import { prisma } from "@/lib/prisma";
import {
  clearFitbookCookie,
  saveFitbookCookie,
  updateTenantAccessSettings,
} from "@/app/admin/[tenantSlug]/manage-actions";

export default async function TenantSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ saved?: string; error?: string; fbSaved?: string; fbError?: string }>;
}) {
  const { tenantSlug } = await params;
  const { saved, error, fbSaved, fbError } = await searchParams;
  const { tenant } = await requireTenantAdmin(tenantSlug);

  const full = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenant.id },
    select: { visibility: true, accessCodeHash: true },
  });
  const fitbookStore = getFitbookStore(tenantSlug);
  const fitbook = fitbookStore ? await getFitbookConnection(tenant.id) : null;

  const action = updateTenantAccessSettings.bind(null, tenantSlug);

  return (
    <div className="space-y-6">
      <section className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">俱樂部存取設定</h2>
        <p className="mt-2 text-sm text-slate-600">
          公開俱樂部會顯示在首頁，任何人可進入。私人俱樂部需邀請碼，不會出現在公開列表。
        </p>
        {saved && <p className="mt-2 text-sm text-brand-teal">已儲存</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <form action={action} className="mt-6 space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">可見性</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="visibility"
                value="PUBLIC"
                defaultChecked={full.visibility === "PUBLIC"}
              />
              公開（顯示於首頁，可直接進入）
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="visibility"
                value="PRIVATE"
                defaultChecked={full.visibility === "PRIVATE"}
              />
              私人（需邀請碼）
            </label>
          </fieldset>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="accessCode">
              邀請碼
            </label>
            <input
              id="accessCode"
              name="accessCode"
              placeholder={full.accessCodeHash ? "留空則不變更" : "設定新邀請碼"}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono uppercase"
            />
            <p className="mt-1 text-xs text-slate-500">
              {full.accessCodeHash ? "目前已設定邀請碼。輸入新碼可覆蓋。" : "私人俱樂部必須設定邀請碼。"}
            </p>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white"
          >
            儲存設定
          </button>
        </form>
      </section>

      {fitbook && (
        <section id="fitbook" className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">FitBook 連線</h2>
          <p className="mt-2 text-sm text-slate-600">
            設定後，DUPR 對戰按「匯入名單」會即時到 FitBook 抓取該場「已預約會員」。FitBook 只能用 LINE 登入，
            需由你提供瀏覽器登入後的 Cookie；它等同該 FitBook 帳號的登入權限，會加密保存，只用來讀取課程頁。
          FitBook 登入效期 7 天、每次使用會延長，系統每天自動讀取一次維持登入；若在 FitBook 按「登出」會立即失效。
          </p>

          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
            {fitbook.status === "none" && <p className="text-slate-600">尚未連線</p>}
            {fitbook.status === "ok" && (
              <p className="text-emerald-700">
                已連線{fitbook.accountName ? `（帳號：${fitbook.accountName}）` : ""}
              </p>
            )}
            {fitbook.status === "expired" && (
              <p className="text-red-600">登入已失效，請重新貼上 Cookie</p>
            )}
            {fitbook.status !== "none" && (
              <p className="mt-1 text-xs text-slate-500">
                {fitbook.setAt && `設定於 ${formatTaipeiDateTime(fitbook.setAt)}`}
                {fitbook.lastOkAt && ` · 最後成功 ${formatTaipeiDateTime(fitbook.lastOkAt)}`}
              </p>
            )}
          </div>
          {fbSaved && <p className="mt-2 text-sm text-brand-teal">{fbSaved}</p>}
          {fbError && <p className="mt-2 text-sm text-red-600">{fbError}</p>}

          <details className="mt-4 text-sm text-slate-600" open={fitbook.status !== "ok"}>
            <summary className="cursor-pointer font-medium text-slate-700">如何取得 Cookie</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
              <li>用電腦版 Chrome 開啟 FitBook，以 LINE 登入（建議用場館專用帳號）。</li>
              <li>打開任一場課程頁，按 F12 開啟開發者工具，切到「Network」分頁後重新整理。</li>
              <li>點清單最上面那一筆（網址含 /member/course/），在「Request Headers」找到「cookie」。</li>
              <li>在 cookie 的值上按右鍵「Copy value」，貼到下方。</li>
            </ol>
          </details>

          <form action={saveFitbookCookie.bind(null, tenantSlug)} className="mt-4 space-y-3">
            <textarea
              name="cookie"
              rows={4}
              required
              placeholder="XSRF-TOKEN=...; laravel_session=..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
            />
            <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">
              儲存並測試
            </button>
          </form>

          {fitbook.status !== "none" && (
            <ConfirmForm
              action={clearFitbookCookie.bind(null, tenantSlug)}
              message="確定移除 FitBook 連線？之後匯入名單會改回模擬名單或需手動貼上。"
              className="mt-3"
            >
              <button type="submit" className="text-xs text-red-600 hover:underline">
                移除連線
              </button>
            </ConfirmForm>
          )}
        </section>
      )}
    </div>
  );
}
