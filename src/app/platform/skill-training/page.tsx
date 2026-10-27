import Link from "next/link";
import { requireSuperAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { countTrainingByStatus } from "@/lib/skill-training";

export default async function PlatformSkillTrainingPage() {
  await requireSuperAdmin();
  const counts = await countTrainingByStatus();
  const confirmed = await prisma.skillTrainingSample.findMany({
    where: { status: "CONFIRMED" },
    orderBy: { consentAt: "desc" },
    take: 80,
    select: {
      id: true,
      format: true,
      labelRating: true,
      estimatedMid: true,
      modelVersion: true,
      consentAt: true,
      officialDuprId: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[24px] font-black text-brand-navy">實力訓練集</h2>
        <p className="mt-2 text-[14px] text-[var(--muted)]">
          只收集使用者確認過的「影片特徵 + 官方 DUPR」。標籤是對戰積分，不是技術檢核表；樣本夠多後才能監督訓練。
        </p>
      </div>

      <dl className="grid gap-4 text-[14px] sm:grid-cols-3">
        <Stat label="待確認" value={counts.candidate} />
        <Stat label="已確認（可訓練）" value={counts.confirmed} />
        <Stat label="已排除" value={counts.excluded} />
      </dl>

      <div>
        <Link
          href="/api/platform/skill-training/export"
          className="btn-brand inline-flex"
        >
          下載已確認 JSONL
        </Link>
        <p className="mt-2 text-[14px] text-[var(--muted)]">
          建議至少約 50 支已確認、且涵蓋 2.5–5.0 再跑訓練腳本。
        </p>
      </div>

      <section className="overflow-hidden bg-white">
        <div className="border-b border-[var(--line)] px-6 py-4">
          <h3 className="text-[20px] font-black text-brand-navy">最近確認</h3>
        </div>
        {confirmed.length === 0 ? (
          <p className="px-6 py-8 text-[14px] text-[var(--muted)]">
            尚無已確認樣本。請先連結 DUPR 並在分析報告頁按確認。
          </p>
        ) : (
          <table className="w-full text-left text-[14px]">
            <thead className="bg-brand-navy text-white">
              <tr>
                <th className="px-4 py-3 font-black">官方 DUPR</th>
                <th className="px-4 py-3 font-black">項目</th>
                <th className="px-4 py-3 font-black">影片估算</th>
                <th className="px-4 py-3 font-black">模型</th>
                <th className="px-4 py-3 font-black">確認時間</th>
              </tr>
            </thead>
            <tbody>
              {confirmed.map((row) => (
                <tr key={row.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-mono font-black text-brand-navy">
                    {row.labelRating.toString()}
                  </td>
                  <td className="px-4 py-3 font-bold text-brand-navy">
                    {row.format === "DOUBLES" ? "雙打" : "單打"}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-[#1B6B73]">
                    {row.estimatedMid?.toString() ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--muted)]">{row.modelVersion}</td>
                  <td className="px-4 py-3 font-mono text-[var(--muted)]">
                    {row.consentAt ? new Date(row.consentAt).toLocaleString("zh-TW") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-6">
      <dt className="text-[14px] font-bold text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 font-mono text-[32px] font-black text-brand-navy">{value}</dd>
    </div>
  );
}
