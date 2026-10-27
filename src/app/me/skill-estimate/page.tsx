import Link from "next/link";
import { auth } from "@/auth";
import { SkillEstimateUpload } from "@/components/skill-estimate/skill-estimate-upload";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  isSkillAnalyzerConfigured,
  serializeJob,
  SKILL_ESTIMATE_DISCLAIMER,
} from "@/lib/skill-estimate";
import { countTrainingByStatus } from "@/lib/skill-training";

export default async function MeSkillEstimatePage() {
  const session = await auth();
  const userId = session!.user!.id;
  const analyzerConfigured = isSkillAnalyzerConfigured();

  const [jobs, dupr, trainingCounts] = await Promise.all([
    prisma.skillAnalysisJob.findMany({
      where: { userId },
      include: { report: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.duprProfile.findUnique({
      where: { userId },
      select: { linkStatus: true, doublesRating: true, singlesRating: true },
    }),
    countTrainingByStatus(userId),
  ]);
  const duprLinked = dupr?.linkStatus === "LINKED";

  return (
    <div className="space-y-6">
      <section className="bg-white p-6">
        <h2 className="text-[20px] font-black text-brand-navy">估算實力等級</h2>
        <p className="mt-2 text-[14px] text-[var(--muted)]">
          上傳 3–5 分鐘對打精華（建議從球場後方高處拍攝）。系統會抽出站位、第三球
          Drop、過渡區 reset、dink 耐心、腳步與手速，再對齊公開的各等級「該做到的事」算出分數。
        </p>
        <p className="mt-2 text-[14px] text-[var(--muted)]">{SKILL_ESTIMATE_DISCLAIMER}</p>
        <div className="mt-4">
          <SkillEstimateUpload analyzerConfigured={analyzerConfigured} />
        </div>
        <p className="mt-4 text-[14px] text-[var(--muted)]">
          {duprLinked
            ? `官方 DUPR 已連結。已確認 ${trainingCounts.confirmed} 支、待確認 ${trainingCounts.candidate} 支訓練樣本。`
            : "連結官方 DUPR 後，完成的分析可標成監督訓練樣本。"}
          {!duprLinked ? (
            <Link href={ROUTES.meDupr} className="ml-1 font-bold text-brand-navy underline">
              前往連結
            </Link>
          ) : null}
        </p>
      </section>

      <section className="bg-white p-6">
        <h3 className="text-[20px] font-black text-brand-navy">分析紀錄</h3>
        {jobs.length === 0 ? (
          <p className="mt-3 text-[14px] text-[var(--muted)]">尚無紀錄。</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {jobs.map((job) => {
              const row = serializeJob(job);
              return (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-2 bg-[var(--bg)] px-5 py-4"
                >
                  <div>
                    <Link
                      href={ROUTES.meSkillEstimateJob(job.id)}
                      className="text-[16px] font-black text-brand-navy hover:text-[#1B6B73]"
                    >
                      {job.originalFilename ?? job.id}
                    </Link>
                    <p className="text-[14px] text-[var(--muted)]">
                      {new Date(job.createdAt).toLocaleString("zh-TW")}
                      {row.report
                        ? ` · 估算 ${row.report.estimatedLow?.toFixed(1)}–${row.report.estimatedHigh?.toFixed(1)}`
                        : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      job.status === "COMPLETED"
                        ? "success"
                        : job.status === "FAILED"
                          ? "cancelled"
                          : "default"
                    }
                  >
                    {row.statusLabel}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
