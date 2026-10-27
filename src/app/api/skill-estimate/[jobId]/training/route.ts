import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  confirmTrainingSample,
  excludeTrainingSample,
  serializeTrainingSample,
  trainingConfirmBodySchema,
} from "@/lib/skill-training";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { jobId } = await params;
  const parsed = trainingConfirmBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "請選擇確認或排除" }, { status: 400 });
  }

  try {
    const sample =
      parsed.data.action === "confirm"
        ? await confirmTrainingSample(jobId, session.user.id, parsed.data.format ?? "DOUBLES")
        : await excludeTrainingSample(jobId, session.user.id, parsed.data.reason);
    return NextResponse.json({ trainingSample: serializeTrainingSample(sample) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "無法更新訓練標籤" },
      { status: 400 },
    );
  }
}
