"use client";

import Link from "next/link";
import { useState } from "react";
import { ROUTES } from "@/lib/constants";
import type { SkillTrainingSamplePayload } from "@/lib/skill-training";

type OfficialDupr = {
  linked: boolean;
  singles: string | null;
  doubles: string | null;
};

export function SkillTrainingDonate({
  jobId,
  officialDupr,
  initial,
}: {
  jobId: string;
  officialDupr: OfficialDupr;
  initial: SkillTrainingSamplePayload | null;
}) {
  const [sample, setSample] = useState(initial);
  const [format, setFormat] = useState<"DOUBLES" | "SINGLES">(initial?.format ?? "DOUBLES");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rating = format === "DOUBLES" ? officialDupr.doubles : officialDupr.singles;

  async function submit(action: "confirm" | "exclude") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/skill-estimate/${jobId}/training`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, format }),
      });
      const payload = (await res.json()) as { error?: string; trainingSample?: SkillTrainingSamplePayload };
      if (!res.ok || !payload.trainingSample) {
        throw new Error(payload.error ?? "無法儲存");
      }
      setSample(payload.trainingSample);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法儲存");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 bg-[var(--surface-tint)] p-5">
      <h4 className="text-[16px] font-black text-brand-navy">協助訓練更準的等級模型</h4>
      <p className="mt-1 text-[14px] text-[#1B6B73]">
        監督訓練需要「影片特徵 + 官方 DUPR」。只會存特徵向量與積分，不會把影片公開。
      </p>

      {!officialDupr.linked ? (
        <p className="mt-3 text-[14px] font-bold text-brand-navy">
          請先連結官方 DUPR，這支影片才能成為有標籤的訓練樣本。
          <Link href={ROUTES.meDupr} className="ml-1 text-brand-navy underline">
            前往連結
          </Link>
        </p>
      ) : sample?.status === "CONFIRMED" ? (
        <p className="mt-3 text-[14px] font-bold text-brand-navy">
          已加入訓練集：{sample.format === "DOUBLES" ? "雙打" : "單打"} {sample.labelRating}
        </p>
      ) : sample?.status === "EXCLUDED" ? (
        <p className="mt-3 text-[14px] text-[var(--muted)]">這支影片已排除，不會用於訓練。</p>
      ) : (
        <>
          <p className="mt-3 text-[14px] font-bold text-brand-navy">
            確認這支影片是你打的，且能代表你目前的官方 DUPR？
          </p>
          <fieldset className="mt-2 flex flex-wrap gap-3 text-[14px] font-bold text-brand-navy">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="format"
                checked={format === "DOUBLES"}
                onChange={() => setFormat("DOUBLES")}
              />
              雙打 {officialDupr.doubles ?? "—"}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="format"
                checked={format === "SINGLES"}
                onChange={() => setFormat("SINGLES")}
              />
              單打 {officialDupr.singles ?? "—"}
            </label>
          </fieldset>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-brand"
              disabled={busy || !rating}
              onClick={() => void submit("confirm")}
            >
              {busy ? "儲存中…" : `確認，標成 ${rating ?? "—"}`}
            </button>
            <button
              type="button"
              className="btn-brand-outline"
              disabled={busy}
              onClick={() => void submit("exclude")}
            >
              這支不能代表我
            </button>
          </div>
          {!rating ? (
            <p className="mt-2 text-[14px] text-[var(--muted)]">所選項目還沒有官方積分。</p>
          ) : null}
        </>
      )}
      {error ? <p className="mt-2 text-[14px] font-bold text-[#B42318]">{error}</p> : null}
    </div>
  );
}
