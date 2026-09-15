"use client";

import { leaveClub } from "@/app/me/actions";
import { ConfirmSubmitButton } from "@/components/platform/confirm-submit-button";

export function LeaveClubButton({
  tenantId,
  clubName,
}: {
  tenantId: string;
  clubName: string;
}) {
  return (
    <form action={leaveClub}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <ConfirmSubmitButton
        label="退出俱樂部"
        confirmMessage={`確定要退出「${clubName}」嗎？退出後將失去該俱樂部會員資格與優惠，私人俱樂部需重新輸入邀請碼才能再加入。`}
        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
      />
    </form>
  );
}
