/**
 * 把已完成、且會員已連結官方 DUPR 的分析，補成待確認訓練樣本。
 * 用法：npx tsx scripts/backfill-skill-training-samples.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensureTrainingCandidate } from "../src/lib/skill-training";

async function main() {
  const jobs = await prisma.skillAnalysisJob.findMany({
    where: { status: "COMPLETED", report: { isNot: null } },
    select: { id: true, userId: true },
  });
  let created = 0;
  let skipped = 0;
  for (const job of jobs) {
    const before = await prisma.skillTrainingSample.findUnique({ where: { jobId: job.id } });
    const sample = await ensureTrainingCandidate(job.id, job.userId);
    if (!before && sample) created += 1;
    else skipped += 1;
  }
  console.log(`backfill done: created=${created} existing_or_ineligible=${skipped} jobs=${jobs.length}`);
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
