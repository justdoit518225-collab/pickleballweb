import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  SkillEstimateStudio,
  type SkillEstimateClientPayload,
} from "@/components/skill-estimate/skill-estimate-studio";
import { getSkillEstimatePayload } from "@/lib/skill-estimate-query";

export default async function MeSkillEstimateJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { jobId } = await params;
  const initial = await getSkillEstimatePayload(session.user.id, jobId);
  if (!initial) notFound();

  return <SkillEstimateStudio jobId={jobId} initial={initial as SkillEstimateClientPayload} />;
}
