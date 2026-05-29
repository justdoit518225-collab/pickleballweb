"use client";

import { duplicateActivity } from "@/app/admin/[tenantSlug]/actions";

export function DuplicateActivityButton({
  tenantSlug,
  activityId,
}: {
  tenantSlug: string;
  activityId: string;
}) {
  const action = duplicateActivity.bind(null, tenantSlug, activityId);

  return (
    <form action={action} className="mt-4">
      <button
        type="submit"
        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand-teal-soft hover:text-brand-navy"
      >
        複製活動
      </button>
      <p className="mt-1 text-xs text-slate-500">複製為草稿，可再調整時間與內容後發布。</p>
    </form>
  );
}
