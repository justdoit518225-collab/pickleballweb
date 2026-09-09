import { prisma } from "@/lib/prisma";
import {
  isSkillAnalyzerConfigured,
  mediaUrl,
  serializeJob,
  signJobToken,
  uploadUrl,
} from "@/lib/skill-estimate";

export async function getSkillEstimatePayload(userId: string, jobId: string) {
  const job = await prisma.skillAnalysisJob.findFirst({
    where: { id: jobId, userId },
    include: { report: true },
  });
  if (!job) return null;

  const dupr = await prisma.duprProfile.findUnique({
    where: { userId },
    select: {
      linkStatus: true,
      singlesRating: true,
      doublesRating: true,
      duprName: true,
    },
  });

  const token = isSkillAnalyzerConfigured() ? signJobToken(job.id) : null;
  return {
    job: serializeJob(job),
    uploadUrl: token && job.status === "CREATED" ? uploadUrl(job.id, token) : null,
    videoUrl: token && job.storageKey ? mediaUrl(job.id, "video", token) : null,
    previewUrl: token && job.storageKey ? mediaUrl(job.id, "preview", token) : null,
    officialDupr: dupr
      ? {
          linked: dupr.linkStatus === "LINKED",
          name: dupr.duprName,
          singles: dupr.singlesRating?.toString() ?? null,
          doubles: dupr.doublesRating?.toString() ?? null,
        }
      : { linked: false, name: null, singles: null, doubles: null },
  };
}
