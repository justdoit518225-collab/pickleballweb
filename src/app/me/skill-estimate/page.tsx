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

export default async function MeSkillEstimatePage() {
  const session = await auth();
  const userId = session!.user!.id;
  const analyzerConfigured = isSkillAnalyzerConfigured();

  const jobs = await prisma.skillAnalysisJob.findMany({
    where: { userId },
    include: { report: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">估算實力等級</h2>
        <p className="mt-2 text-sm text-slate-600">
          上傳 3–5 分鐘對打精華（建議從球場後方高處拍攝），點選自己後即可得到技術估算區間。
        </p>
        <p className="mt-2 text-xs text-slate-500">{SKILL_ESTIMATE_DISCLAIMER}</p>
        <div className="mt-4">
          <SkillEstimateUpload analyzerConfigured={analyzerConfigured} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-800">分析紀錄</h3>
        {jobs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">尚無紀錄。</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {jobs.map((job) => {
              const row = serializeJob(job);
              return (
                <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <Link
                      href={ROUTES.meSkillEstimateJob(job.id)}
                      className="font-medium text-brand-navy hover:underline"
                    >
                      {job.originalFilename ?? job.id}
                    </Link>
                    <p className="text-xs text-slate-500">
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
