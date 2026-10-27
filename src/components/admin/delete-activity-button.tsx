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
        className="bg-[#FCECE9] px-4 py-2 text-[14px] font-black text-[#B42318] hover:bg-[#F8D7D1]"
      >
        刪除活動
      </button>
    </form>
  );
}
