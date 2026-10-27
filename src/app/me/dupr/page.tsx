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
    <section className="bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-extrabold text-brand-navy">DUPR 積分連結與設定</h2>
      <p className="mt-2 max-w-[54ch] text-base text-[var(--muted)]">
        登入你的 DUPR 帳號完成連結，即可在這裡查看自己的單打、雙打積分，並報名需要 DUPR 門檻的賽事。
      </p>
      {saved && (
        <p className="mt-3 bg-brand-lime-soft px-4 py-2.5 text-sm font-bold text-brand-navy">
          已儲存 DUPR 設定
        </p>
      )}
      {imported && (
        <p className="mt-3 bg-brand-lime-soft px-4 py-2.5 text-sm font-bold text-brand-navy">
          已從 DUPR 帶入資料
        </p>
      )}
      {synced && (
        <p className="mt-3 bg-brand-lime-soft px-4 py-2.5 text-sm font-bold text-brand-navy">
          已重新同步積分
        </p>
      )}
      {unlinked && (
        <p className="mt-3 bg-[var(--surface-alt)] px-4 py-2.5 text-sm font-bold text-brand-navy">
          已解除 DUPR 連結
        </p>
      )}
      {message && (
        <p className="mt-3 bg-amber-100 px-4 py-2.5 text-sm font-bold text-amber-950">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 bg-rose-100 px-4 py-2.5 text-sm font-bold text-rose-900">
          {error}
        </p>
      )}

      <div className="mt-6">
        {linked && profile ? (
          <DuprRatingCard profile={profile} />
        ) : (
          <div className="bg-[var(--bg)] px-6 py-8 text-center">
            <p className="text-base font-bold text-[var(--muted)]">尚未連結 DUPR 帳號</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-3">
        {sso ? (
          <DuprConnectButton
            iframeSrc={sso.iframeSrc}
            origin={sso.origin}
            label={linked ? "重新登入 DUPR 更新積分" : "登入 DUPR 連結帳號"}
          />
        ) : (
          <p className="bg-brand-lime-soft px-4 py-2.5 text-sm font-bold text-brand-navy">
            DUPR 單一登入即將開放，目前可先用下方表單手動填寫。
          </p>
        )}
        {linked && profile?.duprId && apiReady && (
          <form action={syncDuprAction}>
            <button
              type="submit"
              className="btn-brand-outline bg-[var(--bg)] px-4 py-2.5 text-sm font-bold text-brand-navy"
            >
              重新同步積分
            </button>
          </form>
        )}
        {linked && (
          <form action={unlinkDuprAction}>
            <button
              type="submit"
              className="bg-rose-100 px-4 py-2.5 text-sm font-bold text-rose-900 hover:bg-rose-200"
            >
              解除連結
            </button>
          </form>
        )}
      </div>

      {profile?.profileUrl && linked && (
        <Link
          href={profile.profileUrl}
          target="_blank"
          className="mt-4 inline-block text-sm font-extrabold text-[#1D6D75] hover:text-brand-navy"
        >
          → 開啟 DUPR 官方個人頁
        </Link>
      )}

      {!sso && (
        <details className="mt-8 bg-[var(--bg)] p-6" open={!linked}>
          <summary className="cursor-pointer text-base font-extrabold text-brand-navy">
            手動填寫 DUPR 資料
          </summary>
          <form action={saveDuprProfile} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-bold text-brand-navy" htmlFor="duprId">
                DUPR ID *
              </label>
              <input
                id="duprId"
                name="duprId"
                required
                placeholder="例：GB0NV05E"
                defaultValue={profile?.duprId ?? ""}
                className="mt-1.5 w-full bg-white px-4 py-3 text-base font-bold text-brand-navy uppercase tabular-nums outline-none focus:outline-2 focus:outline-brand-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-navy">顯示名稱</label>
              <input
                name="duprName"
                defaultValue={profile?.duprName ?? ""}
                className="mt-1.5 w-full bg-white px-4 py-3 text-base font-semibold text-brand-navy outline-none focus:outline-2 focus:outline-brand-teal"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-brand-navy">雙打積分</label>
                <input
                  name="doublesRating"
                  type="number"
                  step="0.001"
                  defaultValue={profile?.doublesRating?.toString() ?? ""}
                  className="mt-1.5 w-full bg-white px-4 py-3 text-base font-bold text-brand-navy tabular-nums outline-none focus:outline-2 focus:outline-brand-teal"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-navy">單打積分</label>
                <input
                  name="singlesRating"
                  type="number"
                  step="0.001"
                  defaultValue={profile?.singlesRating?.toString() ?? ""}
                  className="mt-1.5 w-full bg-white px-4 py-3 text-base font-bold text-brand-navy tabular-nums outline-none focus:outline-2 focus:outline-brand-teal"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              {apiReady && (
                <button
                  type="submit"
                  formAction={importDuprFromApiAction}
                  className="bg-[#1B6B73] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-navy"
                >
                  從 DUPR API 帶入
                </button>
              )}
              <button
                type="submit"
                className="btn-brand px-6 py-2.5 text-sm font-extrabold text-white"
              >
                儲存 DUPR 資料
              </button>
            </div>
          </form>
        </details>
      )}
    </section>
  );
}
