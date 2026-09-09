"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SkillEstimateUpload } from "@/components/skill-estimate/skill-estimate-upload";
import { ROUTES } from "@/lib/constants";
import {
  SKILL_ESTIMATE_DISCLAIMER,
  type SkillAnalysisStatus,
  type SkillDetectionBox,
  type SkillDetections,
  type SkillMetrics,
  type SkillPoint,
} from "@/lib/skill-estimate";

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">估算實力等級</h2>
          <p className="mt-1 text-sm text-slate-500">{job.originalFilename ?? job.id}</p>
        </div>
        <Badge variant={statusVariant(job.status)}>{job.statusLabel}</Badge>
      </div>

      <p className="text-xs text-slate-500">{SKILL_ESTIMATE_DISCLAIMER}</p>

      {job.status === "CREATED" && !data.videoUrl && (
        <SkillEstimateUpload analyzerConfigured existingJobId={job.id} />
      )}
      {job.status === "CREATED" && data.videoUrl && (
        <p className="text-sm text-slate-600">影片已上傳，正在偵測畫面中的球員…</p>
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
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="font-medium text-slate-800">
            {step === "player"
              ? "步驟 1：在畫面中點選要分析的球員"
              : `步驟 2：依序點球場四角（已點 ${courtQuad.length}/4）`}
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600">
            {COURT_LABELS.map((label, i) => (
              <li key={label} className={courtQuad[i] ? "text-brand-teal" : ""}>
                {label}
                {courtQuad[i] ? " ✓" : ""}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
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
        <div>
          <p className="text-sm text-slate-600">分析進行中，請稍候（短片約數分鐘）。</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-brand-teal transition-all" style={{ width: `${job.progress}%` }} />
          </div>
        </div>
      )}

      {job.status === "FAILED" && (
        <p className="text-sm text-red-600">{job.errorMessage ?? "分析失敗"}</p>
      )}

      {job.report && data.officialDupr && (
        <SkillEstimateReport report={job.report} officialDupr={data.officialDupr} />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Link href={ROUTES.meSkillEstimate} className="inline-block text-sm text-brand-navy">
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
    <div ref={wrapRef} className="relative overflow-hidden rounded-xl border border-slate-200 bg-black">
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
  report,
  officialDupr,
}: {
  report: NonNullable<JobPayload["report"]>;
  officialDupr: OfficialDupr;
}) {
  const metrics = report.metrics ?? { errorRate: 0, kitchenPct: 0, smoothness: 0 };
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-800">估算結果</h3>
      <p className="mt-2 text-3xl font-bold text-brand-navy">
        {fmt(report.estimatedLow)} – {fmt(report.estimatedHigh)}
        <span className="ml-2 text-base font-medium text-slate-500">中間值 {fmt(report.estimatedMid)}</span>
      </p>
      <p className="mt-2 text-xs text-slate-500">{report.disclaimer}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
        <Metric label="非受迫性失誤（代理）" value={pct(metrics.errorRate)} />
        <Metric label="廚房區停留比例" value={pct(metrics.kitchenPct)} />
        <Metric label="擊球動作流暢度" value={pct(metrics.smoothness)} />
      </dl>
      {metrics.notes?.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
          {metrics.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-xs text-slate-400">模型 {report.modelVersion}</p>

      <div className="mt-5 rounded-lg bg-brand-navy-soft p-4">
        <h4 className="text-sm font-semibold text-brand-navy">官方 DUPR 對照</h4>
        {officialDupr.linked ? (
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>名稱</dt>
              <dd>{officialDupr.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>單打</dt>
              <dd>{officialDupr.singles ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>雙打</dt>
              <dd>{officialDupr.doubles ?? "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            尚未連結官方 DUPR。
            <Link href={ROUTES.meDupr} className="ml-1 text-brand-navy">
              前往設定
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-800">{value}</dd>
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
