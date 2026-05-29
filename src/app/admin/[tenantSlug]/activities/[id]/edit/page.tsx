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
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-slate-800">編輯活動</h2>
      {created && <p className="mt-2 text-sm text-emerald-600">活動已建立</p>}
      {saved && <p className="mt-2 text-sm text-emerald-600">已儲存</p>}
      {cancelled && <p className="mt-2 text-sm text-amber-600">活動已取消，已通知報名者</p>}
      {duprSaved && <p className="mt-2 text-sm text-emerald-600">DUPR 戰績已記錄</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {activity.status !== "CANCELLED" && (
        <form action={cancelActivityAsAdmin.bind(null, tenantSlug, activity.id)} className="mt-4">
          <button type="submit" className="text-sm text-red-600 underline">
            取消此活動（停課）
          </button>
        </form>
      )}

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

      <ActivityRoster activityId={activity.id} tenantId={tenant.id} />

      {activity.requiresDupr && (
        <section className="mt-8 rounded-xl border border-blue-100 bg-blue-50/30 p-5">
          <h3 className="font-semibold text-blue-900">DUPR 戰績上傳</h3>
          <form action={submitDuprMatchResult.bind(null, tenantSlug, activity.id)} className="mt-3 space-y-2">
            <textarea name="notes" rows={2} placeholder="備註" className="w-full rounded-lg border px-3 py-2 text-sm" />
            <textarea
              name="payload"
              rows={3}
              placeholder='JSON 戰績（例：{"matches":[]})'
              className="w-full rounded-lg border px-3 py-2 font-mono text-xs"
            />
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
              儲存戰績
            </button>
          </form>
          {duprSubmissions.length > 0 && (
            <ul className="mt-4 text-xs text-slate-600 space-y-1">
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
