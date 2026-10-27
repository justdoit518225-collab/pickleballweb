import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toTrainingExportRow } from "@/lib/skill-training";

export async function GET() {
  const session = await auth();
  if (session?.user?.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const samples = await prisma.skillTrainingSample.findMany({
    where: { status: "CONFIRMED" },
    orderBy: { consentAt: "asc" },
  });
  const body = samples.map((sample) => JSON.stringify(toTrainingExportRow(sample))).join("\n");
  const filename = `skill-training-${new Date().toISOString().slice(0, 10)}.jsonl`;

  return new NextResponse(body ? `${body}\n` : "", {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
