/**
 * 匯出已確認的官方 DUPR 標註樣本（JSONL）。
 * 用法：npx tsx scripts/export-skill-training-samples.ts [out.jsonl]
 */
import "dotenv/config";
import { writeFileSync } from "fs";
import { prisma } from "../src/lib/prisma";
import { toTrainingExportRow } from "../src/lib/skill-training";

async function main() {
  const out = process.argv[2] ?? "storage/skill-training-confirmed.jsonl";
  const samples = await prisma.skillTrainingSample.findMany({
    where: { status: "CONFIRMED" },
    orderBy: { consentAt: "asc" },
  });
  const body = samples.map((sample) => JSON.stringify(toTrainingExportRow(sample))).join("\n");
  writeFileSync(out, body ? `${body}\n` : "", "utf8");
  console.log(`exported ${samples.length} confirmed samples → ${out}`);
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
