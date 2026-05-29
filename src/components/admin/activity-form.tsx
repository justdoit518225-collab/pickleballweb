"use client";

import { useEffect, useRef, useState } from "react";
import type { Activity, Court, Venue } from "@/generated/prisma/client";
import { toDatetimeLocalValue } from "@/lib/datetime";
import { createActivity, updateActivity } from "@/app/admin/[tenantSlug]/actions";

type VenueWithCourts = Venue & { courts: Court[] };

type Props = {
  tenantSlug: string;
  venues: VenueWithCourts[];
  activity?: Activity;
  error?: string;
  defaultType?: "OPEN_PLAY" | "COURSE";
  duprMode?: boolean;
  allowBatch?: boolean;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800";
const labelClass = "block text-sm font-medium text-slate-700";

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 0, label: "日" },
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
];

export function ActivityForm({
  tenantSlug,
  venues,
  activity,
  error,
  defaultType,
  duprMode = false,
  allowBatch = false,
}: Props) {
  const lockedType = defaultType ?? activity?.type ?? "OPEN_PLAY";
  const isEdit = Boolean(activity);
  const showDuprFields = duprMode || (isEdit && Boolean(activity?.requiresDupr));
  const action = isEdit
    ? updateActivity.bind(null, tenantSlug, activity!.id)
    : createActivity.bind(null, tenantSlug);

  const defaultStart = activity
    ? toDatetimeLocalValue(activity.startAt)
    : toDatetimeLocalValue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
  const defaultEnd = activity
    ? toDatetimeLocalValue(activity.endAt)
    : toDatetimeLocalValue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000));

  const defaultCancelDeadline =
    activity?.cancelDeadlineAt != null
      ? toDatetimeLocalValue(activity.cancelDeadlineAt)
      : defaultStart;

  const today = toDatetimeLocalValue(new Date()).slice(0, 10);
  const monthLater = toDatetimeLocalValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).slice(
    0,
    10,
  );

  const [batchEnabled, setBatchEnabled] = useState(false);
  const [batchDeadlineAtStart, setBatchDeadlineAtStart] = useState(true);
  const [cancelPolicyType, setCancelPolicyType] = useState(
    activity?.cancelPolicyType ?? "HOURS_BEFORE",
  );
  const [startAt, setStartAt] = useState(defaultStart);
  const [cancelDeadlineAt, setCancelDeadlineAt] = useState(defaultCancelDeadline);
  const deadlineTouched = useRef(Boolean(activity?.cancelDeadlineAt));

  useEffect(() => {
    if (cancelPolicyType === "DEADLINE" && !deadlineTouched.current && startAt) {
      setCancelDeadlineAt(startAt);
    }
  }, [cancelPolicyType, startAt]);

  return (
    <form action={action} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div>
        <label className={labelClass} htmlFor="title">
          活動標題
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={activity?.title}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="description">
          說明
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={activity?.description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="type">
            類型
          </label>
          {defaultType && !activity ? (
            <>
              <input type="hidden" name="type" value={defaultType} />
              {duprMode && <input type="hidden" name="requiresDupr" value="on" />}
              <p className="mt-1 text-sm text-slate-600">
                {duprMode
                  ? "DUPR 專場"
                  : defaultType === "OPEN_PLAY"
                    ? "球敘"
                    : "課程"}
              </p>
            </>
          ) : (
            <select id="type" name="type" defaultValue={lockedType} className={inputClass}>
              <option value="OPEN_PLAY">球敘</option>
              <option value="COURSE">課程</option>
            </select>
          )}
        </div>
        <div>
          <label className={labelClass} htmlFor="status">
            狀態
          </label>
          <select
            id="status"
            name="status"
            defaultValue={activity?.status ?? "DRAFT"}
            className={inputClass}
          >
            <option value="DRAFT">草稿</option>
            <option value="PUBLISHED">已發布</option>
            <option value="CANCELLED">已取消</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="venueId">
            場館
          </label>
          <select
            id="venueId"
            name="venueId"
            required
            defaultValue={activity?.venueId ?? venues[0]?.id}
            className={inputClass}
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="courtId">
            球場（選填）
          </label>
          <select
            id="courtId"
            name="courtId"
            defaultValue={activity?.courtId ?? ""}
            className={inputClass}
          >
            <option value="">（不指定）</option>
            {venues.flatMap((v) =>
              v.courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {v.name} · {c.name}
                </option>
              )),
            )}
          </select>
        </div>
      </div>

      {allowBatch && !isEdit && (
        <fieldset className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <input
              type="checkbox"
              name="batchEnabled"
              checked={batchEnabled}
              onChange={(e) => setBatchEnabled(e.target.checked)}
              className="rounded border-slate-300"
            />
            批次建立重複場次
          </label>
          <p className="mt-1 text-xs text-emerald-800/80">
            適合每週固定課程或球敘，可一次建立一個月內的多個場次。
          </p>

          {batchEnabled && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="batchStartDate">
                    開始日期
                  </label>
                  <input
                    id="batchStartDate"
                    name="batchStartDate"
                    type="date"
                    required={batchEnabled}
                    defaultValue={today}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="batchEndDate">
                    結束日期
                  </label>
                  <input
                    id="batchEndDate"
                    name="batchEndDate"
                    type="date"
                    required={batchEnabled}
                    defaultValue={monthLater}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="batchSlotStart">
                    每日開始時間
                  </label>
                  <input
                    id="batchSlotStart"
                    name="batchSlotStart"
                    type="time"
                    required={batchEnabled}
                    defaultValue="19:00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="batchSlotEnd">
                    每日結束時間
                  </label>
                  <input
                    id="batchSlotEnd"
                    name="batchSlotEnd"
                    type="time"
                    required={batchEnabled}
                    defaultValue="21:00"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <span className={labelClass}>重複星期</span>
                <div className="mt-2 flex flex-wrap gap-3">
                  {WEEKDAYS.map((d) => (
                    <label key={d.value} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        name="repeatDays"
                        value={d.value}
                        defaultChecked={d.value === 3}
                        className="rounded border-slate-300"
                      />
                      週{d.label}
                    </label>
                  ))}
                </div>
              </div>

              {cancelPolicyType === "DEADLINE" && (
                <div className="space-y-3 border-t border-emerald-200/80 pt-4">
                  <p className="text-sm font-medium text-emerald-900">批次取消截止</p>
                  <input type="hidden" name="batchDeadlineAtStart" value="off" />
                  <label className="flex items-center gap-2 text-sm text-emerald-900">
                    <input
                      type="checkbox"
                      name="batchDeadlineAtStart"
                      value="on"
                      checked={batchDeadlineAtStart}
                      onChange={(e) => setBatchDeadlineAtStart(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    各場截止時間 = 該場活動開始時間
                  </label>
                  {!batchDeadlineAtStart && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass} htmlFor="batchCancelDeadlineDaysBefore">
                          提前幾天（0 = 當天）
                        </label>
                        <input
                          id="batchCancelDeadlineDaysBefore"
                          name="batchCancelDeadlineDaysBefore"
                          type="number"
                          min={0}
                          defaultValue={0}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="batchCancelDeadlineTime">
                          截止時刻
                        </label>
                        <input
                          id="batchCancelDeadlineTime"
                          name="batchCancelDeadlineTime"
                          type="time"
                          defaultValue="18:00"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-emerald-800/80">勾選時，每場活動的取消截止會自動設為該場開始時間。</p>
                </div>
              )}
            </div>
          )}
        </fieldset>
      )}

      {!batchEnabled && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="startAt">
              開始時間
            </label>
            <input
              id="startAt"
              name="startAt"
              type="datetime-local"
              required={!batchEnabled}
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="endAt">
              結束時間
            </label>
            <input
              id="endAt"
              name="endAt"
              type="datetime-local"
              required={!batchEnabled}
              defaultValue={defaultEnd}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="capacity">
          名額
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min={1}
          required
          defaultValue={activity?.capacity ?? 12}
          className={inputClass}
        />
      </div>

      <fieldset className="rounded-lg border border-slate-100 p-4">
        <legend className="text-sm font-medium text-slate-700">取消政策</legend>
        <div className="mt-2">
          <label className={labelClass} htmlFor="cancelPolicyType">
            取消規則
          </label>
          <select
            id="cancelPolicyType"
            name="cancelPolicyType"
            value={cancelPolicyType}
            onChange={(e) => setCancelPolicyType(e.target.value as "HOURS_BEFORE" | "DEADLINE")}
            className={inputClass}
          >
            <option value="HOURS_BEFORE">活動開始前 N 小時內不可取消</option>
            <option value="DEADLINE">指定截止時間前可取消</option>
          </select>
        </div>
        <div className="mt-3">
          <label className={labelClass} htmlFor="cancelHoursBefore">
            小時數（適用 HOURS_BEFORE）
          </label>
          <input
            id="cancelHoursBefore"
            name="cancelHoursBefore"
            type="number"
            min={0}
            defaultValue={activity?.cancelHoursBefore ?? 4}
            className={inputClass}
          />
        </div>
        {!batchEnabled && cancelPolicyType === "DEADLINE" && (
          <div className="mt-3">
            <label className={labelClass} htmlFor="cancelDeadlineAt">
              截止時間（適用 DEADLINE）
            </label>
            <input
              id="cancelDeadlineAt"
              name="cancelDeadlineAt"
              type="datetime-local"
              value={cancelDeadlineAt}
              onChange={(e) => {
                deadlineTouched.current = true;
                setCancelDeadlineAt(e.target.value);
              }}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">預設與活動開始時間相同，可自行調整。</p>
          </div>
        )}
        {batchEnabled && cancelPolicyType === "DEADLINE" && (
          <p className="mt-3 text-xs text-slate-500">批次建立時，請在上方「批次建立重複場次」區塊設定取消截止。</p>
        )}
      </fieldset>

      {showDuprFields && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
          {isEdit && activity?.requiresDupr && (
            <input type="hidden" name="requiresDupr" value="on" />
          )}
          <p className="text-sm font-medium text-indigo-900">DUPR 設定</p>
          <div>
            <label className={labelClass} htmlFor="duprEventName">
              DUPR 活動名稱
            </label>
            <input
              id="duprEventName"
              name="duprEventName"
              placeholder="例：Friday DUPR Social"
              defaultValue={activity?.duprEventName ?? ""}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-indigo-800/80">選填，方便對照 DUPR 平台上的賽事名稱。</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          className="rounded-lg bg-brand-navy px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {isEdit ? "儲存" : batchEnabled ? "批次建立活動" : "建立活動"}
        </button>
      </div>
    </form>
  );
}
