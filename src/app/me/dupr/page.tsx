import Link from "next/link";
import { auth } from "@/auth";
import {
  importDuprFromApiAction,
  saveDuprProfile,
  syncDuprAction,
  unlinkDuprAction,
} from "@/app/me/actions";
import { DuprConnectButton } from "@/components/me/dupr-connect-button";
import { DuprRatingCard } from "@/components/me/dupr-rating-card";
import { isDuprApiConfigured } from "@/lib/dupr";
import { getDuprSsoConfig } from "@/lib/dupr-sso";
import { prisma } from "@/lib/prisma";

export default async function MeDuprPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    synced?: string;
    imported?: string;
    unlinked?: string;
    message?: string;
    error?: string;
  }>;
}) {
  const session = await auth();
  const { saved, synced, imported, unlinked, message, error } = await searchParams;
  const apiReady = isDuprApiConfigured();
  const sso = getDuprSsoConfig();
  const profile = await prisma.duprProfile.findUnique({
    where: { userId: session!.user!.id },
  });
  const linked = profile?.linkStatus === "LINKED" && Boolean(profile.duprId);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">DUPR</h2>
      <p className="mt-1 text-sm text-slate-600">
        登入你的 DUPR 帳號完成連結，即可在這裡查看自己的單打、雙打積分，並報名需要 DUPR 的活動。
      </p>
      {saved && <p className="mt-2 text-sm text-brand-teal">已儲存</p>}
      {imported && <p className="mt-2 text-sm text-brand-teal">已從 DUPR 帶入資料</p>}
      {synced && <p className="mt-2 text-sm text-brand-teal">已重新同步</p>}
      {unlinked && <p className="mt-2 text-sm text-brand-teal">已解除 DUPR 連結</p>}
      {message && <p className="mt-2 text-sm text-amber-700">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-5">
        {linked && profile ? (
          <DuprRatingCard profile={profile} />
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            尚未連結 DUPR
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-start gap-3">
        {sso ? (
          <DuprConnectButton
            iframeSrc={sso.iframeSrc}
            origin={sso.origin}
            label={linked ? "重新登入 DUPR 更新積分" : "登入 DUPR 連結帳號"}
          />
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            DUPR 登入連結即將開放，目前可先用下方手動填寫。
          </p>
        )}
        {linked && profile?.duprId && apiReady && (
          <form action={syncDuprAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              重新同步積分
            </button>
          </form>
        )}
        {linked && (
          <form action={unlinkDuprAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
            >
              解除連結
            </button>
          </form>
        )}
      </div>

      {profile?.profileUrl && linked && (
        <Link href={profile.profileUrl} target="_blank" className="mt-4 inline-block text-sm text-brand-teal">
          → DUPR 官方個人頁
        </Link>
      )}

      {!sso && (
        <details className="mt-6 rounded-lg border border-slate-200 p-4" open={!linked}>
          <summary className="cursor-pointer text-sm font-medium text-slate-700">手動填寫 DUPR 資料</summary>
          <form action={saveDuprProfile} className="mt-4 space-y-3">
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
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">顯示名稱</label>
              <input
                name="duprName"
                defaultValue={profile?.duprName ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">雙打積分</label>
                <input
                  name="doublesRating"
                  type="number"
                  step="0.001"
                  defaultValue={profile?.doublesRating?.toString() ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">單打積分</label>
                <input
                  name="singlesRating"
                  type="number"
                  step="0.001"
                  defaultValue={profile?.singlesRating?.toString() ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {apiReady && (
                <button
                  type="submit"
                  formAction={importDuprFromApiAction}
                  className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  從 DUPR 帶入
                </button>
              )}
              <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">
                儲存
              </button>
            </div>
          </form>
        </details>
      )}
    </section>
  );
}
