import { notFound } from "next/navigation";
import { ActivityForm } from "@/components/admin/activity-form";
import { ActivityRoster } from "@/components/admin/activity-roster";
import { DeleteActivityButton } from "@/components/admin/delete-activity-button";
import { DuplicateActivityButton } from "@/components/admin/duplicate-activity-button";
import { cancelActivityAsAdmin, submitDuprMatchResult } from "@/app/admin/[tenantSlug]/manage-actions";
import { requireTenantStaff } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function EditActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
  searchParams: Promise<{
    created?: string;
    saved?: string;
    error?: string;
    cancelled?: string;
    duprSaved?: string;
  }>;
}) {
  const { tenantSlug, id } = await params;
  const { created, saved, error, cancelled, duprSaved } = await searchParams;
  const { tenant } = await requireTenantStaff(tenantSlug);

  const [activity, venues, duprSubmissions] = await Promise.all([
    prisma.activity.findFirst({ where: { id, tenantId: tenant.id } }),
    prisma.venue.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { courts: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.duprMatchSubmission.findMany({
      where: { activityId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  if (!activity) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[24px] font-black text-brand-navy">編輯活動</h2>
          {activity.status !== "CANCELLED" && (
            <form action={cancelActivityAsAdmin.bind(null, tenantSlug, activity.id)}>
              <button
                type="submit"
                className="bg-[#FCECE9] px-4 py-2 text-[14px] font-black text-[#B42318] transition-colors hover:bg-[#F8D7D1]"
              >
                取消此活動（停課）
              </button>
            </form>
          )}
        </div>

        {created && <p className="mt-3 bg-[var(--surface-tint)] px-4 py-2 text-[14px] font-bold text-[#1B6B73]">活動已建立</p>}
        {saved && <p className="mt-3 bg-[var(--surface-tint)] px-4 py-2 text-[14px] font-bold text-[#1B6B73]">已儲存</p>}
        {cancelled && <p className="mt-3 bg-[#FFF4E5] px-4 py-2 text-[14px] font-bold text-[#9A5B00]">活動已取消，已通知報名者</p>}
        {duprSaved && <p className="mt-3 bg-[var(--surface-tint)] px-4 py-2 text-[14px] font-bold text-[#1B6B73]">DUPR 戰績已記錄</p>}
        {error && <p className="mt-3 bg-[#FCECE9] px-4 py-2 text-[14px] font-bold text-[#B42318]">{error}</p>}

        <div className="mt-6">
          <DuplicateActivityButton tenantSlug={tenantSlug} activityId={activity.id} />
          <ActivityForm
            tenantSlug={tenantSlug}
            venues={venues}
            activity={activity}
            error={error}
            duprMode={activity.requiresDupr}
          />
          <DeleteActivityButton tenantSlug={tenantSlug} activityId={activity.id} />
        </div>
      </div>

      <ActivityRoster activityId={activity.id} tenantId={tenant.id} />

      {activity.requiresDupr && (
        <section className="bg-brand-navy p-6 text-white">
          <h3 className="text-[20px] font-black text-white">DUPR 戰績上傳</h3>
          <form action={submitDuprMatchResult.bind(null, tenantSlug, activity.id)} className="mt-4 space-y-3">
            <textarea
              name="notes"
              rows={2}
              placeholder="備註"
              className="w-full bg-white px-4 py-2.5 text-[14px] text-brand-navy focus:outline-none"
            />
            <textarea
              name="payload"
              rows={3}
              placeholder='JSON 戰績（例：{"matches":[]})'
              className="w-full bg-white px-4 py-2.5 font-mono text-[14px] text-brand-navy focus:outline-none"
            />
            <button
              type="submit"
              className="bg-brand-lime px-5 py-2.5 text-[14px] font-black text-brand-navy transition-colors hover:bg-white"
            >
              儲存戰績
            </button>
          </form>
          {duprSubmissions.length > 0 && (
            <ul className="mt-4 space-y-1 text-[14px] text-[#C8D8E4]">
              {duprSubmissions.map((s) => (
                <li key={s.id}>
                  {s.status} · {s.createdAt.toLocaleString("zh-TW")}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
