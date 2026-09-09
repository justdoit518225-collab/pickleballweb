import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createJobBodySchema,
  isAllowedVideo,
  isSkillAnalyzerConfigured,
  serializeJob,
  signJobToken,
  uploadUrl,
} from "@/lib/skill-estimate";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const jobs = await prisma.skillAnalysisJob.findMany({
    where: { userId: session.user.id },
    include: { report: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    analyzerConfigured: isSkillAnalyzerConfigured(),
    jobs: jobs.map((job) => serializeJob(job)),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  if (!isSkillAnalyzerConfigured()) {
    return NextResponse.json({ error: "分析服務未連線" }, { status: 503 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createJobBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "上傳資訊不正確" }, { status: 400 });
  }

  const { filename, contentType, size } = parsed.data;
  if (!isAllowedVideo(filename, contentType)) {
    return NextResponse.json({ error: "僅支援 MP4 / WebM / MOV" }, { status: 400 });
  }

  const job = await prisma.skillAnalysisJob.create({
    data: {
      userId: session.user.id,
      originalFilename: filename.slice(0, 240),
      status: "CREATED",
    },
  });

  const token = signJobToken(job.id);
  const url = uploadUrl(job.id, token);
  if (!url) {
    return NextResponse.json({ error: "分析服務未連線" }, { status: 503 });
  }

  return NextResponse.json({
    jobId: job.id,
    uploadUrl: url,
    token,
    maxBytes: size,
  });
}
