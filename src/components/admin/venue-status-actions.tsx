"use client";

import {
  deactivateVenue,
  deleteVenue,
  reactivateVenue,
} from "@/app/admin/[tenantSlug]/manage-actions";

export function VenueStatusActions({
  tenantSlug,
  venueId,
  isActive,
  canDelete,
}: {
  tenantSlug: string;
  venueId: string;
  isActive: boolean;
  canDelete: boolean;
}) {
  const deactivateAction = deactivateVenue.bind(null, tenantSlug, venueId);
  const reactivateAction = reactivateVenue.bind(null, tenantSlug, venueId);
  const deleteAction = deleteVenue.bind(null, tenantSlug, venueId);

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <p className="mb-2 text-xs font-medium text-slate-500">場館狀態</p>
      <div className="flex flex-wrap gap-2">
      {isActive ? (
        <form
          action={deactivateAction}
          onSubmit={(e) => {
            if (
              !confirm(
                "確定停用此場館？\n\n停用後不會出現在新增活動／租借選項，既有歷史資料會保留。",
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100"
          >
            停用場館
          </button>
        </form>
      ) : (
        <form action={reactivateAction}>
          <button
            type="submit"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-100"
          >
            重新啟用
          </button>
        </form>
      )}
      {canDelete ? (
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (
              !confirm(
                "確定永久刪除此場館？\n\n僅適用於誤建且無任何活動／租借紀錄的場館，刪除後無法復原。",
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            刪除場館
          </button>
        </form>
      ) : (
        <p className="self-center text-xs text-slate-500">
          已有活動或租借紀錄時無法刪除，請改用停用。
        </p>
      )}
      </div>
    </div>
  );
}
