"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { leaveClub } from "@/app/me/actions";
import { ROUTES } from "@/lib/constants";

export function LeaveClubButton({
  tenantId,
  clubName,
}: {
  tenantId: string;
  clubName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onLeave() {
    const ok = window.confirm(
      `確定要退出「${clubName}」嗎？退出後將失去該俱樂部會員資格與優惠，私人俱樂部需重新輸入邀請碼才能再加入。`,
    );
    if (!ok) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("tenantId", tenantId);
      const result = await leaveClub(formData);
      if (result.ok) {
        router.push(`${ROUTES.home}?left=${encodeURIComponent(result.clubName)}`);
        router.refresh();
      } else {
        router.push(`${ROUTES.home}?leaveError=${encodeURIComponent(result.error)}`);
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onLeave}
      className="bg-rose-100 px-3.5 py-2 text-sm font-bold text-rose-900 transition-colors hover:bg-rose-200 disabled:opacity-60"
    >
      {pending ? "退出中…" : "退出俱樂部"}
    </button>
  );
}
