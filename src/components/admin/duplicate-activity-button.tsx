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
    <form action={action} className="mb-4">
      <button
        type="submit"
        className="bg-[var(--bg)] px-4 py-2 text-[14px] font-black text-brand-navy hover:bg-brand-lime"
      >
        複製活動
      </button>
      <p className="mt-1 text-[14px] text-[var(--muted)]">
        複製為草稿，可再調整時間與內容後發布。
      </p>
    </form>
  );
}
