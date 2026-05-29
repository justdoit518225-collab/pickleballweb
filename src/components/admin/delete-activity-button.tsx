"use client";

import { deleteActivity } from "@/app/admin/[tenantSlug]/actions";

export function DeleteActivityButton({
  tenantSlug,
  activityId,
}: {
  tenantSlug: string;
  activityId: string;
}) {
  const action = deleteActivity.bind(null, tenantSlug, activityId);

  return (
    <form
      action={action}
      className="mt-4"
      onSubmit={(e) => {
        if (!confirm("確定刪除此活動？已報名資料一併刪除。")) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
      >
        刪除活動
      </button>
    </form>
  );
}
