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
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <p className="mb-2 text-[14px] font-bold text-brand-navy">場館狀態</p>
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
              className="bg-[#FFF4E5] px-3 py-1.5 text-[14px] font-black text-[#9A5B00] hover:bg-[#FEE8C8]"
            >
              停用場館
            </button>
          </form>
        ) : (
          <form action={reactivateAction}>
            <button
              type="submit"
              className="bg-brand-lime px-3 py-1.5 text-[14px] font-black text-brand-navy hover:bg-[#9BD35A]"
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
              className="bg-[#FCECE9] px-3 py-1.5 text-[14px] font-black text-[#B42318] hover:bg-[#F8D7D1]"
            >
              刪除場館
            </button>
          </form>
        ) : (
          <p className="self-center text-[14px] text-[var(--muted)]">
            已有活動或租借紀錄時無法刪除，請改用停用。
          </p>
        )}
      </div>
    </div>
  );
}
