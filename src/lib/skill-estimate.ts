import { createHmac } from "crypto";
import { z } from "zod";

export const SKILL_ESTIMATE_DISCLAIMER =
  "此評級係基於個人技術動作估算，非正式 DUPR，亦非雙打團隊戰績。";

export const SKILL_MAX_DURATION_SEC = 5 * 60;
export const SKILL_MAX_BYTES = 200 * 1024 * 1024;
export const SKILL_ALLOWED_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
export const SKILL_ALLOWED_EXT = new Set([".mp4", ".webm", ".mov"]);

export const SKILL_STATUS_LABELS = {
  CREATED: "待上傳",
  AWAITING_PLAYER: "請選球員與球場",
  QUEUED: "排隊中",
  PROCESSING: "分析中",
  COMPLETED: "已完成",
  FAILED: "失敗",
} as const;

export type SkillAnalysisStatus = keyof typeof SKILL_STATUS_LABELS;

export type SkillPoint = { x: number; y: number };

export type SkillDetectionBox = {
  trackId: number;
  x: number;
  y: number;
  w: number;
  h: number;
  conf: number;
};

export type SkillDetections = {
  frameWidth: number;
  frameHeight: number;
  boxes: SkillDetectionBox[];
};

export type SkillMetrics = {
  errorRate: number;
  kitchenPct: number;
  smoothness: number;
  shotCount?: number;
  trackCoverage?: number;
  ballDetections?: number;
  notes?: string[];
};

const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const createJobBodySchema = z.object({
  filename: z.string().trim().min(1).max(240),
  contentType: z.string().trim().min(1).max(80),
  size: z.number().int().positive().max(SKILL_MAX_BYTES),
});

export const selectPlayerBodySchema = z.object({
  playerClick: pointSchema,
  selectedTrackId: z.number().int().nullable().optional(),
  courtQuad: z.array(pointSchema).length(4),
});

export function isSkillAnalyzerConfigured() {
  return Boolean(process.env.SKILL_ANALYZER_URL?.trim() && process.env.SKILL_ANALYZER_SECRET?.trim());
}

export function getSkillAnalyzerUrl() {
  return (process.env.SKILL_ANALYZER_URL ?? "").replace(/\/$/, "");
}

function getSkillAnalyzerSecret() {
  const secret = process.env.SKILL_ANALYZER_SECRET?.trim();
  if (!secret) {
    throw new Error("SKILL_ANALYZER_SECRET is not set");
  }
  return secret;
}

export function signJobToken(jobId: string, ttlSec = 7200) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${jobId}.${exp}`;
  const sig = createHmac("sha256", getSkillAnalyzerSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function extensionOf(filename: string) {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

export function isAllowedVideo(filename: string, contentType: string) {
  const ext = extensionOf(filename);
  return SKILL_ALLOWED_EXT.has(ext) || SKILL_ALLOWED_MIME.has(contentType);
}

export function mediaUrl(jobId: string, kind: "video" | "preview", token: string) {
  const base = getSkillAnalyzerUrl();
  if (!base) return null;
  return `${base}/jobs/${encodeURIComponent(jobId)}/${kind}?token=${encodeURIComponent(token)}`;
}

export function uploadUrl(jobId: string, token: string) {
  const base = getSkillAnalyzerUrl();
  if (!base) return null;
  return `${base}/jobs/${encodeURIComponent(jobId)}/upload?token=${encodeURIComponent(token)}`;
}

export async function enqueueAnalyze(jobId: string, token: string) {
  const base = getSkillAnalyzerUrl();
  if (!base) {
    throw new Error("分析服務未連線");
  }
  const res = await fetch(`${base}/jobs/${encodeURIComponent(jobId)}/analyze`, {
    method: "POST",
    headers: {
      "X-Skill-Token": token,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `分析服務回應 ${res.status}`);
  }
}

function decimalToNumber(value: { toString(): string } | number | null | undefined) {
  if (value == null) return null;
  return Number(value.toString());
}

export function serializeReport(report: {
  estimatedMid: { toString(): string } | number;
  estimatedLow: { toString(): string } | number;
  estimatedHigh: { toString(): string } | number;
  metrics: unknown;
  overlaySummary: unknown;
  modelVersion: string;
  createdAt: Date;
}) {
  return {
    estimatedMid: decimalToNumber(report.estimatedMid),
    estimatedLow: decimalToNumber(report.estimatedLow),
    estimatedHigh: decimalToNumber(report.estimatedHigh),
    metrics: report.metrics,
    overlaySummary: report.overlaySummary,
    modelVersion: report.modelVersion,
    createdAt: report.createdAt.toISOString(),
    disclaimer: SKILL_ESTIMATE_DISCLAIMER,
  };
}

export function serializeJob(job: {
  id: string;
  status: SkillAnalysisStatus;
  originalFilename: string | null;
  durationSec: number | null;
  detections: unknown;
  selectedTrackId: number | null;
  playerClick: unknown;
  courtQuad: unknown;
  progress: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  report?: Parameters<typeof serializeReport>[0] | null;
}) {
  return {
    id: job.id,
    status: job.status,
    statusLabel: SKILL_STATUS_LABELS[job.status],
    originalFilename: job.originalFilename,
    durationSec: job.durationSec,
    detections: (job.detections as SkillDetections | null) ?? null,
    selectedTrackId: job.selectedTrackId,
    playerClick: (job.playerClick as SkillPoint | null) ?? null,
    courtQuad: (job.courtQuad as SkillPoint[] | null) ?? null,
    progress: job.progress,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    report: job.report ? serializeReport(job.report) : null,
  };
}
