import { z } from "zod";
import type { Prisma, SkillMatchFormat, SkillTrainingStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isDuprApiConfigured, syncDuprFromApi } from "@/lib/dupr";

export const SKILL_FEATURE_KEYS = [
  "consistency",
  "kitchenPresence",
  "dinkPatience",
  "thirdShotDrop",
  "resetTransition",
  "footwork",
  "handSpeed",
  "cognition",
] as const;

export type SkillFeatureKey = (typeof SKILL_FEATURE_KEYS)[number];

export const trainingConfirmBodySchema = z.object({
  action: z.enum(["confirm", "exclude"]),
  format: z.enum(["DOUBLES", "SINGLES"]).optional(),
  reason: z.string().trim().max(240).optional(),
});

export type SkillTrainingSamplePayload = {
  id: string;
  status: SkillTrainingStatus;
  format: SkillMatchFormat;
  labelRating: string;
  officialSingles: string | null;
  officialDoubles: string | null;
  consentAt: string | null;
};

type MetricsLike = {
  rubricMatch?: { observed?: Record<string, unknown> };
} & Record<string, unknown>;

export function extractFeatureVector(metrics: unknown): Record<SkillFeatureKey, number> | null {
  if (!metrics || typeof metrics !== "object") return null;
  const observed = (metrics as MetricsLike).rubricMatch?.observed;
  if (!observed || typeof observed !== "object") return null;
  const vector = {} as Record<SkillFeatureKey, number>;
  for (const key of SKILL_FEATURE_KEYS) {
    const value = Number(observed[key]);
    if (!Number.isFinite(value)) return null;
    vector[key] = Math.max(0, Math.min(1, value));
  }
  return vector;
}

function decimalToString(value: { toString(): string } | number | null | undefined) {
  if (value == null) return null;
  return value.toString();
}

function ratingNumber(value: { toString(): string } | number | null | undefined) {
  if (value == null) return null;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

export function serializeTrainingSample(sample: {
  id: string;
  status: SkillTrainingStatus;
  format: SkillMatchFormat;
  labelRating: { toString(): string } | number;
  officialSingles: { toString(): string } | number | null;
  officialDoubles: { toString(): string } | number | null;
  consentAt: Date | null;
}): SkillTrainingSamplePayload {
  return {
    id: sample.id,
    status: sample.status,
    format: sample.format,
    labelRating: sample.labelRating.toString(),
    officialSingles: decimalToString(sample.officialSingles),
    officialDoubles: decimalToString(sample.officialDoubles),
    consentAt: sample.consentAt?.toISOString() ?? null,
  };
}

export async function ensureTrainingCandidate(jobId: string, userId: string) {
  const existing = await prisma.skillTrainingSample.findUnique({ where: { jobId } });
  if (existing) return existing;

  const job = await prisma.skillAnalysisJob.findFirst({
    where: { id: jobId, userId, status: "COMPLETED" },
    include: { report: true },
  });
  if (!job?.report) return null;

  const features = extractFeatureVector(job.report.metrics);
  if (!features) return null;

  const dupr = await prisma.duprProfile.findUnique({ where: { userId } });
  if (dupr?.linkStatus !== "LINKED") return null;

  const doubles = ratingNumber(dupr.doublesRating);
  const singles = ratingNumber(dupr.singlesRating);
  if (doubles == null && singles == null) return null;

  const format: SkillMatchFormat = doubles != null ? "DOUBLES" : "SINGLES";
  const labelRating = (format === "DOUBLES" ? doubles : singles) as number;

  return prisma.skillTrainingSample.create({
    data: {
      jobId,
      userId,
      storageKey: job.storageKey,
      featureVector: features,
      rawMetrics: job.report.metrics as Prisma.InputJsonValue,
      labelRating,
      officialSingles: singles,
      officialDoubles: doubles,
      officialDuprId: dupr.duprId,
      officialDuprName: dupr.duprName,
      duprSyncedAt: dupr.lastSyncedAt,
      format,
      status: "CANDIDATE",
      modelVersion: job.report.modelVersion,
      estimatedMid: job.report.estimatedMid,
    },
  });
}

export async function confirmTrainingSample(
  jobId: string,
  userId: string,
  format: SkillMatchFormat,
) {
  await ensureTrainingCandidate(jobId, userId);

  if (isDuprApiConfigured()) {
    try {
      await syncDuprFromApi(userId);
    } catch {
      // 同步失敗仍可用資料庫裡的官方積分
    }
  }

  const sample = await prisma.skillTrainingSample.findFirst({
    where: { jobId, userId },
  });
  if (!sample) {
    const job = await prisma.skillAnalysisJob.findFirst({
      where: { id: jobId, userId },
      include: { report: true },
    });
    if (!extractFeatureVector(job?.report?.metrics)) {
      throw new Error("這支舊分析沒有完整特徵，請重新上傳分析後再標註");
    }
    throw new Error("這支影片還沒有官方 DUPR 可當標籤，請先到 DUPR 頁面連結");
  }

  const dupr = await prisma.duprProfile.findUnique({ where: { userId } });
  const doubles = ratingNumber(dupr?.doublesRating ?? sample.officialDoubles);
  const singles = ratingNumber(dupr?.singlesRating ?? sample.officialSingles);
  const labelRating = format === "DOUBLES" ? doubles : singles;
  if (labelRating == null) {
    throw new Error(format === "DOUBLES" ? "尚未有官方雙打 DUPR" : "尚未有官方單打 DUPR");
  }

  return prisma.skillTrainingSample.update({
    where: { id: sample.id },
    data: {
      format,
      labelRating,
      officialSingles: singles,
      officialDoubles: doubles,
      officialDuprId: dupr?.duprId ?? sample.officialDuprId,
      officialDuprName: dupr?.duprName ?? sample.officialDuprName,
      duprSyncedAt: dupr?.lastSyncedAt ?? sample.duprSyncedAt,
      status: "CONFIRMED",
      consentAt: new Date(),
      excludedReason: null,
    },
  });
}

export async function excludeTrainingSample(jobId: string, userId: string, reason?: string) {
  const sample = (await ensureTrainingCandidate(jobId, userId)) ??
    (await prisma.skillTrainingSample.findFirst({ where: { jobId, userId } }));
  if (!sample) {
    throw new Error("找不到可排除的樣本");
  }
  return prisma.skillTrainingSample.update({
    where: { id: sample.id },
    data: {
      status: "EXCLUDED",
      excludedReason: reason || "使用者排除",
    },
  });
}

export async function countTrainingByStatus(userId?: string) {
  const where = userId ? { userId } : {};
  const [candidate, confirmed, excluded] = await Promise.all([
    prisma.skillTrainingSample.count({ where: { ...where, status: "CANDIDATE" } }),
    prisma.skillTrainingSample.count({ where: { ...where, status: "CONFIRMED" } }),
    prisma.skillTrainingSample.count({ where: { ...where, status: "EXCLUDED" } }),
  ]);
  return { candidate, confirmed, excluded };
}

export function toTrainingExportRow(sample: {
  id: string;
  jobId: string;
  userId: string;
  storageKey: string | null;
  featureVector: unknown;
  format: SkillMatchFormat;
  labelRating: { toString(): string } | number;
  officialSingles: { toString(): string } | number | null;
  officialDoubles: { toString(): string } | number | null;
  officialDuprId: string | null;
  modelVersion: string;
  estimatedMid: { toString(): string } | number | null;
  consentAt: Date | null;
  status: SkillTrainingStatus;
}) {
  const features = extractFeatureVector({ rubricMatch: { observed: sample.featureVector } }) ??
    (sample.featureVector as Record<string, number>);
  const x = SKILL_FEATURE_KEYS.map((key) => Number(features[key] ?? 0));
  return {
    id: sample.id,
    jobId: sample.jobId,
    userId: sample.userId,
    storageKey: sample.storageKey,
    status: sample.status,
    format: sample.format,
    y: Number(sample.labelRating.toString()),
    officialSingles: ratingNumber(sample.officialSingles),
    officialDoubles: ratingNumber(sample.officialDoubles),
    officialDuprId: sample.officialDuprId,
    featureOrder: SKILL_FEATURE_KEYS,
    features,
    x,
    modelVersion: sample.modelVersion,
    estimatedMid: ratingNumber(sample.estimatedMid),
    consentAt: sample.consentAt?.toISOString() ?? null,
  };
}
