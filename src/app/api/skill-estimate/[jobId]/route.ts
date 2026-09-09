import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSkillEstimatePayload } from "@/lib/skill-estimate-query";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { jobId } = await params;
  const payload = await getSkillEstimatePayload(session.user.id, jobId);
  if (!payload) {
    return NextResponse.json({ error: "找不到分析任務" }, { status: 404 });
  }
  return NextResponse.json(payload);
}
