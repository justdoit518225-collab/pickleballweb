import { requireTenantStaff } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { updateTenantAccessSettings } from "@/app/admin/[tenantSlug]/manage-actions";

export default async function TenantSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const { saved, error } = await searchParams;
  const { tenant } = await requireTenantStaff(tenantSlug);

  const full = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenant.id },
    select: { visibility: true, accessCodeHash: true },
  });

  const action = updateTenantAccessSettings.bind(null, tenantSlug);

  return (
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
  );
}
