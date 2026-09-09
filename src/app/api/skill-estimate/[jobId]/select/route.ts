import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enqueueAnalyze, selectPlayerBodySchema, signJobToken } from "@/lib/skill-estimate";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { jobId } = await params;
  const json = await req.json().catch(() => null);
  const parsed = selectPlayerBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "請點選球員並完成球場四點校正" }, { status: 400 });
  }

  const job = await prisma.skillAnalysisJob.findFirst({
    where: { id: jobId, userId: session.user.id },
  });
  if (!job) {
    return NextResponse.json({ error: "找不到分析任務" }, { status: 404 });
  }
  if (job.status !== "AWAITING_PLAYER") {
    return NextResponse.json({ error: "此任務目前無法選擇球員" }, { status: 409 });
  }
  if (!job.storageKey) {
    return NextResponse.json({ error: "影片尚未上傳完成" }, { status: 409 });
  }

  await prisma.skillAnalysisJob.update({
    where: { id: job.id },
    data: {
      selectedTrackId: parsed.data.selectedTrackId ?? null,
      playerClick: parsed.data.playerClick,
      courtQuad: parsed.data.courtQuad,
      status: "QUEUED",
      progress: 5,
      errorMessage: null,
    },
  });

  try {
    await enqueueAnalyze(job.id, signJobToken(job.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "無法排入分析佇列";
    await prisma.skillAnalysisJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: message },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
