import Link from "next/link";
import { auth } from "@/auth";
import { importDuprFromApiAction, saveDuprProfile, syncDuprAction } from "@/app/me/actions";
import { Badge } from "@/components/ui/badge";
import { isDuprApiConfigured } from "@/lib/dupr";
import { prisma } from "@/lib/prisma";

export default async function MeDuprPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    synced?: string;
    imported?: string;
    message?: string;
    error?: string;
  }>;
}) {
  const session = await auth();
  const { saved, synced, imported, message, error } = await searchParams;
  const apiReady = isDuprApiConfigured();
  const profile = await prisma.duprProfile.findUnique({
    where: { userId: session!.user!.id },
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800">DUPR 個人資料</h2>
        <Badge variant="dupr">{apiReady ? "API 已設定" : "手動模式"}</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        請先輸入您的 DUPR ID，再按「從 DUPR 帶入」自動填入名稱與積分；若 API 未設定，可改用手動填寫後儲存。
      </p>
      {saved && <p className="mt-2 text-sm text-brand-teal">已儲存</p>}
      {imported && <p className="mt-2 text-sm text-brand-teal">已從 DUPR 帶入資料</p>}
      {synced && <p className="mt-2 text-sm text-brand-teal">已重新同步</p>}
      {message && <p className="mt-2 text-sm text-amber-700">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {profile && (
        <dl className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-slate-500">狀態</dt>
            <dd>{profile.linkStatus}</dd>
          </div>
          <div>
            <dt className="text-slate-500">DUPR ID</dt>
            <dd className="font-mono">{profile.duprId}</dd>
          </div>
          {profile.lastSyncedAt && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">上次同步</dt>
              <dd>{profile.lastSyncedAt.toLocaleString("zh-TW")}</dd>
            </div>
          )}
        </dl>
      )}

      <form action={saveDuprProfile} className="mt-6 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="duprId">
            DUPR ID *
          </label>
          <input
            id="duprId"
            name="duprId"
            required
            placeholder="例：GB0NV05E"
            defaultValue={profile?.duprId ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono uppercase"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            formAction={apiReady ? importDuprFromApiAction : undefined}
            disabled={!apiReady}
            className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            從 DUPR 帶入
          </button>
          <button
            type="submit"
            className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white"
          >
            儲存（含手動修改）
          </button>
        </div>

        {!apiReady && (
          <p className="text-xs text-slate-500">
            尚未設定 DUPR_API_KEY 或 DUPR_CLIENT_ID / DUPR_CLIENT_SECRET，請於 .env 填入後重啟開發伺服器。
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700">顯示名稱</label>
          <input
            name="duprName"
            defaultValue={profile?.duprName ?? ""}
            placeholder="可由 DUPR 帶入"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">單打積分</label>
            <input
              name="singlesRating"
              type="number"
              step="0.01"
              defaultValue={profile?.singlesRating?.toString() ?? ""}
              placeholder="可由 DUPR 帶入"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">雙打積分</label>
            <input
              name="doublesRating"
              type="number"
              step="0.01"
              defaultValue={profile?.doublesRating?.toString() ?? ""}
              placeholder="可由 DUPR 帶入"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </form>

      {profile?.duprId && apiReady && (
        <form action={syncDuprAction} className="mt-4">
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            依目前 DUPR ID 重新同步
          </button>
        </form>
      )}

      {profile?.profileUrl && (
        <Link href={profile.profileUrl} target="_blank" className="mt-4 inline-block text-sm text-brand-teal">
          → DUPR 官方個人頁
        </Link>
      )}
    </section>
  );
}
