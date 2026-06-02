"use client";

import { useMemo, useState, useTransition } from "react";
import {
  blockRentalSlot,
  bulkBlockRentalSlots,
  bulkDeleteRentalSlots,
  deleteRentalSlot,
} from "@/app/admin/[tenantSlug]/rental-actions";

export type RentalSlotRow = {
  id: string;
  startLabel: string;
  venueName: string;
  courtName: string;
  status: "OPEN" | "BOOKED" | "BLOCKED";
  bookedByLabel: string | null;
};

function isSelectable(status: RentalSlotRow["status"]) {
  return status === "OPEN" || status === "BLOCKED";
}

export function RentalSlotsList({
  tenantSlug,
  slots,
}: {
  tenantSlug: string;
  slots: RentalSlotRow[];
}) {
  const selectableIds = useMemo(
    () => slots.filter((s) => isSelectable(s.status)).map((s) => s.id),
    [slots],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();

  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const selectedCount = selectableIds.filter((id) => selected.has(id)).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  function submitBulk(action: (formData: FormData) => Promise<void>, message: string) {
    if (selectedCount === 0) {
      alert("請先勾選要處理的時段");
      return;
    }
    if (!confirm(message)) return;

    const formData = new FormData();
    for (const id of selected) {
      if (selectableIds.includes(id)) formData.append("slotIds", id);
    }

    startTransition(() => {
      void action(formData);
    });
  }

  const bulkDeleteAction = bulkDeleteRentalSlots.bind(null, tenantSlug);
  const bulkBlockAction = bulkBlockRentalSlots.bind(null, tenantSlug);

  return (
    <div className="mt-3 space-y-3">
      {selectableIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
          >
            {allSelected ? "取消全選" : "全選可刪除"}
          </button>
          <span className="text-slate-500">
            已選 {selectedCount} / {selectableIds.length}（不含已預約）
          </span>
          <button
            type="button"
            disabled={pending || selectedCount === 0}
            onClick={() =>
              submitBulk(
                bulkBlockAction,
                `確定封鎖所選 ${selectedCount} 個開放時段？`,
              )
            }
            className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
          >
            批量封鎖
          </button>
          <button
            type="button"
            disabled={pending || selectedCount === 0}
            onClick={() =>
              submitBulk(
                bulkDeleteAction,
                `確定刪除所選 ${selectedCount} 個時段？此動作無法復原。`,
              )
            }
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {pending ? "處理中…" : "批量刪除"}
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {slots.map((s) => {
          const selectable = isSelectable(s.status);
          const blockAction = blockRentalSlot.bind(null, tenantSlug, s.id);
          const deleteAction = deleteRentalSlot.bind(null, tenantSlug, s.id);

          return (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              {selectable ? (
                <input
                  type="checkbox"
                  className="rounded"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  aria-label={`選取 ${s.startLabel}`}
                />
              ) : (
                <span className="w-4 shrink-0" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                {s.startLabel} · {s.venueName} {s.courtName} · {s.status}
                {s.bookedByLabel && ` · ${s.bookedByLabel}`}
              </span>
              <span className="flex gap-2">
                {s.status === "OPEN" && (
                  <form
                    action={blockAction}
                    onSubmit={(e) => {
                      if (!confirm("確定封鎖此時段？")) e.preventDefault();
                    }}
                  >
                    <button type="submit" className="text-amber-600 hover:underline">
                      封鎖
                    </button>
                  </form>
                )}
                {selectable && (
                  <form
                    action={deleteAction}
                    onSubmit={(e) => {
                      if (!confirm("確定刪除此時段？")) e.preventDefault();
                    }}
                  >
                    <button type="submit" className="text-red-600 hover:underline">
                      刪除
                    </button>
                  </form>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {slots.length === 0 && (
        <p className="text-sm text-slate-500">此區間尚無時段</p>
      )}
    </div>
  );
}
