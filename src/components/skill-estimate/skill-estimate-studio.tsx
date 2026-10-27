"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SkillEstimateUpload } from "@/components/skill-estimate/skill-estimate-upload";
import { ROUTES } from "@/lib/constants";
import { SkillTrainingDonate } from "@/components/skill-estimate/skill-training-donate";
import {
  SKILL_ESTIMATE_DISCLAIMER,
  type SkillAnalysisStatus,
  type SkillDetectionBox,
  type SkillDetections,
  type SkillMetrics,
  type SkillPoint,
} from "@/lib/skill-estimate";
import type { SkillTrainingSamplePayload } from "@/lib/skill-training";

type OfficialDupr = {
  linked: boolean;
  name: string | null;
  singles: string | null;
  doubles: string | null;
};

type JobPayload = {
  id: string;
  status: SkillAnalysisStatus;
  statusLabel: string;
  originalFilename: string | null;
  durationSec: number | null;
  detections: SkillDetections | null;
  selectedTrackId: number | null;
  playerClick: SkillPoint | null;
  courtQuad: SkillPoint[] | null;
  progress: number;
  errorMessage: string | null;
  report: {
    estimatedMid: number | null;
    estimatedLow: number | null;
    estimatedHigh: number | null;
    metrics: SkillMetrics;
    modelVersion: string;
    disclaimer: string;
  } | null;
};

export type SkillEstimateClientPayload = {
  job: JobPayload;
  uploadUrl: string | null;
  videoUrl: string | null;
  previewUrl: string | null;
  officialDupr: OfficialDupr;
  trainingSample: SkillTrainingSamplePayload | null;
  error?: string;
};

const COURT_LABELS = ["近端左（底線）", "近端右（底線）", "遠端右（近網／底線）", "遠端左（近網／底線）"];

export function SkillEstimateStudio({
  jobId,
  initial,
}: {
  jobId: string;
  initial: SkillEstimateClientPayload;
}) {
  const [data, setData] = useState<SkillEstimateClientPayload>(initial);
  const [error, setError] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<SkillDetectionBox[]>(initial.job.detections?.boxes ?? []);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(initial.job.selectedTrackId);
  const [playerClick, setPlayerClick] = useState<SkillPoint | null>(initial.job.playerClick);
  const [courtQuad, setCourtQuad] = useState<SkillPoint[]>(initial.job.courtQuad ?? []);
  const [step, setStep] = useState<"player" | "court">(initial.job.playerClick ? "court" : "player");
  const [submitting, setSubmitting] = useState(false);
  const waitingDetect = !data.job.detections?.boxes?.length;

  const load = useCallback(async () => {
    const res = await fetch(`/api/skill-estimate/${jobId}`, { cache: "no-store" });
    const payload = (await res.json()) as SkillEstimateClientPayload;
    if (!res.ok) {
      setError(payload.error ?? "讀取任務失敗");
      return;
    }
    setData(payload);
    setError(null);
    if (payload.job.detections?.boxes) setBoxes(payload.job.detections.boxes);
  }, [jobId]);

  useEffect(() => {
    const status = data.job.status;
    if (status === "COMPLETED" || status === "FAILED") return;
    if (status === "AWAITING_PLAYER" && !waitingDetect) return;
    const timer = window.setInterval(() => void load(), 2500);
    return () => window.clearInterval(timer);
  }, [data.job.status, load, waitingDetect]);

  const job = data?.job;
  const canSelect = job?.status === "AWAITING_PLAYER";

  async function submit() {
    if (!playerClick || courtQuad.length !== 4) {
      setError("請先點選球員並完成四個場角");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/skill-estimate/${jobId}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerClick, selectedTrackId, courtQuad }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "無法開始分析");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法開始分析");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-6">
        <div>
          <h2 className="text-[20px] font-black text-brand-navy">估算實力等級</h2>
          <p className="mt-1 text-[14px] text-[var(--muted)]">{job.originalFilename ?? job.id}</p>
        </div>
        <Badge variant={statusVariant(job.status)}>{job.statusLabel}</Badge>
      </div>

      <p className="text-[14px] text-[var(--muted)]">{SKILL_ESTIMATE_DISCLAIMER}</p>

      {job.status === "CREATED" && !data.videoUrl && (
        <div className="bg-white p-6">
          <SkillEstimateUpload analyzerConfigured existingJobId={job.id} />
        </div>
      )}
      {job.status === "CREATED" && data.videoUrl && (
        <p className="bg-white p-6 text-[14px] text-[var(--muted)]">
          影片已上傳，正在偵測畫面中的球員…
        </p>
      )}

      {(data.videoUrl || data.previewUrl) && (
        <VideoAnnotator
          videoUrl={data.videoUrl}
          previewUrl={data.previewUrl}
          detections={job.detections}
          boxes={boxes}
          selectedTrackId={selectedTrackId}
          playerClick={playerClick}
          courtQuad={courtQuad}
          interactive={Boolean(canSelect)}
          step={step}
          onPlayerPick={(click, trackId) => {
            setPlayerClick(click);
            setSelectedTrackId(trackId);
            setStep("court");
          }}
          onCourtPick={(points) => setCourtQuad(points)}
        />
      )}

      {canSelect && (
        <section className="bg-white p-6 text-[14px]">
          <p className="font-black text-brand-navy">
            {step === "player"
              ? "步驟 1：在畫面中點選要分析的球員"
              : `步驟 2：依序點球場四角（已點 ${courtQuad.length}/4）`}
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[var(--muted)]">
            {COURT_LABELS.map((label, i) => (
              <li key={label} className={courtQuad[i] ? "font-bold text-[#1B6B73]" : ""}>
                {label}
                {courtQuad[i] ? " ✓" : ""}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-brand-outline"
              onClick={() => {
                setStep("player");
                setPlayerClick(null);
                setSelectedTrackId(null);
                setCourtQuad([]);
              }}
            >
              重選
            </button>
            <button
              type="button"
              className="btn-brand"
              disabled={submitting || !playerClick || courtQuad.length !== 4}
              onClick={() => void submit()}
            >
              {submitting ? "送出中…" : "開始分析"}
            </button>
          </div>
        </section>
      )}

      {(job.status === "QUEUED" || job.status === "PROCESSING") && (
        <div className="bg-white p-6">
          <p className="text-[14px] font-bold text-brand-navy">分析進行中，請稍候（短片約數分鐘）。</p>
          <div className="mt-3 h-2 overflow-hidden bg-[var(--bg)]">
            <div className="h-full bg-[#1B6B73] transition-all" style={{ width: `${job.progress}%` }} />
          </div>
        </div>
      )}

      {job.status === "FAILED" && (
        <p className="bg-[#FCECE9] p-4 text-[14px] font-bold text-[#B42318]">
          {job.errorMessage ?? "分析失敗"}
        </p>
      )}

      {job.report && data.officialDupr && (
        <SkillEstimateReport
          jobId={job.id}
          report={job.report}
          officialDupr={data.officialDupr}
          trainingSample={data.trainingSample}
        />
      )}

      {error && (
        <p className="bg-[#FCECE9] p-4 text-[14px] font-bold text-[#B42318]">{error}</p>
      )}

      <Link
        href={ROUTES.meSkillEstimate}
        className="inline-block text-[14px] font-black text-[#1B6B73] hover:text-brand-navy"
      >
        ← 回到列表
      </Link>
    </div>
  );
}

function statusVariant(status: SkillAnalysisStatus) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "FAILED") return "cancelled" as const;
  if (status === "PROCESSING" || status === "QUEUED") return "dupr" as const;
  return "default" as const;
}

function VideoAnnotator({
  videoUrl,
  previewUrl,
  detections,
  boxes,
  selectedTrackId,
  playerClick,
  courtQuad,
  interactive,
  step,
  onPlayerPick,
  onCourtPick,
}: {
  videoUrl: string | null;
  previewUrl: string | null;
  detections: SkillDetections | null;
  boxes: SkillDetectionBox[];
  selectedTrackId: number | null;
  playerClick: SkillPoint | null;
  courtQuad: SkillPoint[];
  interactive: boolean;
  step: "player" | "court";
  onPlayerPick: (click: SkillPoint, trackId: number | null) => void;
  onCourtPick: (points: SkillPoint[]) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const native = useMemo(
    () => ({
      w: detections?.frameWidth || 1280,
      h: detections?.frameHeight || 720,
    }),
    [detections],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const media = videoRef.current ?? imageRef.current;
    if (!canvas || !wrap || !media) return;
    const rect = media.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(rect.height);
    canvas.style.left = `${rect.left - wrapRect.left}px`;
    canvas.style.top = `${rect.top - wrapRect.top}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sx = canvas.width / native.w;
    const sy = canvas.height / native.h;

    for (const box of boxes) {
      const selected = selectedTrackId != null && box.trackId === selectedTrackId;
      ctx.strokeStyle = selected ? "#2d8b94" : "#0b2447";
      ctx.lineWidth = selected ? 3 : 1.5;
      ctx.strokeRect(box.x * sx, box.y * sy, box.w * sx, box.h * sy);
      ctx.fillStyle = selected ? "#2d8b94" : "#0b2447";
      ctx.font = "12px sans-serif";
      ctx.fillText(`#${box.trackId}`, box.x * sx, Math.max(12, box.y * sy - 4));
    }

    if (playerClick) {
      ctx.fillStyle = "#8bc34a";
      ctx.beginPath();
      ctx.arc(playerClick.x * sx, playerClick.y * sy, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (courtQuad.length) {
      ctx.strokeStyle = "#2d8b94";
      ctx.lineWidth = 2;
      ctx.beginPath();
      courtQuad.forEach((p, i) => {
        const x = p.x * sx;
        const y = p.y * sy;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (courtQuad.length === 4) ctx.closePath();
      ctx.stroke();
      courtQuad.forEach((p, i) => {
        ctx.fillStyle = "#0b2447";
        ctx.beginPath();
        ctx.arc(p.x * sx, p.y * sy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "11px sans-serif";
        ctx.fillText(String(i + 1), p.x * sx - 3, p.y * sy + 4);
      });
    }
  }, [boxes, courtQuad, native.h, native.w, playerClick, selectedTrackId]);

  useEffect(() => {
    redraw();
    const onResize = () => redraw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [redraw, videoUrl, previewUrl]);

  function toNative(clientX: number, clientY: number): SkillPoint | null {
    const media = videoRef.current ?? imageRef.current;
    if (!media) return null;
    const rect = media.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * native.w,
      y: ((clientY - rect.top) / rect.height) * native.h,
    };
  }

  function onClick(ev: React.MouseEvent) {
    if (!interactive) return;
    const point = toNative(ev.clientX, ev.clientY);
    if (!point) return;
    if (step === "player") {
      const hit = nearestBox(point, boxes);
      onPlayerPick(point, hit?.trackId ?? null);
      return;
    }
    if (courtQuad.length >= 4) {
      onCourtPick([point]);
      return;
    }
    onCourtPick([...courtQuad, point]);
  }

  return (
    <div ref={wrapRef} className="relative overflow-hidden bg-black">
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          controls={!interactive}
          className="block max-h-[70vh] w-full"
          onLoadedMetadata={redraw}
          onPlay={redraw}
        />
      ) : (
        previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imageRef}
            src={previewUrl}
            alt="分析預覽幀"
            className="block max-h-[70vh] w-full object-contain"
            onLoad={redraw}
          />
        )
      )}
      <canvas ref={canvasRef} className="pointer-events-none absolute" />
      {interactive && (
        <button
          type="button"
          aria-label={step === "player" ? "點選球員" : "點選場角"}
          className="absolute inset-0 cursor-crosshair bg-transparent"
          onClick={onClick}
        />
      )}
    </div>
  );
}

function nearestBox(point: SkillPoint, boxes: SkillDetectionBox[]) {
  let best: SkillDetectionBox | null = null;
  let bestDist = Infinity;
  for (const box of boxes) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const d = (cx - point.x) ** 2 + (cy - point.y) ** 2;
    const inside =
      point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h;
    const dist = inside ? d * 0.25 : d;
    if (dist < bestDist) {
      best = box;
      bestDist = dist;
    }
  }
  return best;
}

function SkillEstimateReport({
  jobId,
  report,
  officialDupr,
  trainingSample,
}: {
  jobId: string;
  report: NonNullable<JobPayload["report"]>;
  officialDupr: OfficialDupr;
  trainingSample: SkillTrainingSamplePayload | null;
}) {
  const metrics = report.metrics ?? { errorRate: 0, kitchenPct: 0, smoothness: 0 };
  const match = metrics.rubricMatch;
  const copy = match?.copy;
  const dims = match ? Object.keys(match.dimensionLabels) : [];
  const levelScores = match
    ? Object.entries(match.levelScores).sort((a, b) => Number(a[0]) - Number(b[0]))
    : [];

  return (
    <section className="bg-white p-6">
      <h3 className="text-[20px] font-black text-brand-navy">估算結果</h3>
      <p className="mt-2 font-mono text-[32px] font-black text-brand-navy">
        {fmt(report.estimatedLow)} – {fmt(report.estimatedHigh)}
        <span className="ml-2 text-[16px] font-bold text-[var(--muted)]">
          中間值 {fmt(report.estimatedMid)}
        </span>
      </p>
      {match ? (
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          最近等級剖面：<span className="font-black text-brand-navy">{match.nearestLabel}</span>
          {metrics.confidence != null ? ` · 匹配信心 ${pct(metrics.confidence)}` : ""}
        </p>
      ) : null}
      <p className="mt-2 text-[14px] text-[var(--muted)]">{report.disclaimer}</p>
      <p className="mt-1 text-[14px] text-[var(--muted)]">
        目前用影片特徵對齊公開技能定義。確認官方 DUPR 後，這支影片可進入監督訓練集。
      </p>

      {copy ? (
        <dl className="mt-4 grid gap-3 text-[14px] sm:grid-cols-2">
          <CopyCard title="這個等級該做到" text={copy.can} />
          <CopyCard title="通常還做不到" text={copy.notYet} />
          <CopyCard title="腳步" text={copy.footwork} />
          <CopyCard title="認知／決策" text={copy.cognition} />
        </dl>
      ) : null}

      {dims.length > 0 && match ? (
        <div className="mt-5">
          <h4 className="text-[16px] font-black text-brand-navy">影片特徵 vs 該級期望</h4>
          <ul className="mt-3 space-y-3">
            {dims.map((dim) => (
              <DimensionBar
                key={dim}
                label={match.dimensionLabels[dim] ?? dim}
                observed={match.observed[dim] ?? 0}
                expected={match.expected[dim] ?? 0}
              />
            ))}
          </ul>
        </div>
      ) : (
        <dl className="mt-4 grid gap-3 text-[14px] sm:grid-cols-3">
          <Metric label="非受迫性失誤（代理）" value={pct(metrics.errorRate)} />
          <Metric label="廚房區停留比例" value={pct(metrics.kitchenPct)} />
          <Metric label="擊球動作流暢度" value={pct(metrics.smoothness)} />
        </dl>
      )}

      {levelScores.length > 0 ? (
        <div className="mt-5">
          <h4 className="text-[16px] font-black text-brand-navy">各等級匹配度</h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {levelScores.map(([level, score]) => (
              <li
                key={level}
                className={`px-3 py-1 font-mono text-[14px] font-black ${
                  Number(level) === match?.nearestLevel
                    ? "bg-brand-lime text-brand-navy"
                    : "bg-[var(--bg)] text-brand-navy"
                }`}
              >
                {Number(level).toFixed(1)} · {pct(score)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {match?.gaps?.length ? (
        <p className="mt-3 text-[14px] text-[var(--muted)]">
          相對「{match.nearestLabel}」較弱：{match.gaps.join("、")}
        </p>
      ) : null}

      {metrics.notes?.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-[var(--muted)]">
          {metrics.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {match?.sources?.length ? (
        <p className="mt-3 text-[14px] text-[var(--muted)]">依據：{match.sources.join("；")}</p>
      ) : null}
      <p className="mt-2 font-mono text-[14px] text-[var(--muted)]">模型 {report.modelVersion}</p>

      <div className="mt-5 bg-[var(--bg)] p-5">
        <h4 className="text-[16px] font-black text-brand-navy">官方 DUPR 對照</h4>
        {officialDupr.linked ? (
          <dl className="mt-2 space-y-1 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">名稱</dt>
              <dd className="font-bold text-brand-navy">{officialDupr.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">單打</dt>
              <dd className="font-mono font-bold text-brand-navy">{officialDupr.singles ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">雙打</dt>
              <dd className="font-mono font-bold text-brand-navy">{officialDupr.doubles ?? "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-[14px] text-[var(--muted)]">
            尚未連結官方 DUPR。
            <Link href={ROUTES.meDupr} className="ml-1 font-bold text-brand-navy underline">
              前往設定
            </Link>
          </p>
        )}
      </div>

      <SkillTrainingDonate jobId={jobId} officialDupr={officialDupr} initial={trainingSample} />
    </section>
  );
}

function CopyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-[var(--bg)] p-4">
      <dt className="text-[14px] font-bold text-[#1B6B73]">{title}</dt>
      <dd className="mt-1 text-[14px] text-brand-navy">{text}</dd>
    </div>
  );
}

function DimensionBar({
  label,
  observed,
  expected,
}: {
  label: string;
  observed: number;
  expected: number;
}) {
  return (
    <li>
      <div className="mb-1 flex justify-between text-[14px] font-bold text-brand-navy">
        <span>{label}</span>
        <span className="font-mono text-[var(--muted)]">
          影片 {pct(observed)} · 期望 {pct(expected)}
        </span>
      </div>
      <div className="relative h-2 bg-[var(--bg)]">
        <div
          className="h-full bg-[#1B6B73]"
          style={{ width: `${Math.round(Math.min(1, Math.max(0, observed)) * 100)}%` }}
        />
        <span
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-brand-navy"
          style={{ left: `${Math.round(Math.min(1, Math.max(0, expected)) * 100)}%` }}
          title="該級期望"
        />
      </div>
    </li>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--bg)] p-4">
      <dt className="text-[14px] font-bold text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 font-mono text-[20px] font-black text-brand-navy">{value}</dd>
    </div>
  );
}

function fmt(n: number | null) {
  return n == null || Number.isNaN(n) ? "—" : n.toFixed(1);
}

function pct(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 100)}%`;
}
