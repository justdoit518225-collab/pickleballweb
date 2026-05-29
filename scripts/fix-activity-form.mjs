import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const rel = "src/components/admin/activity-form.tsx";
const ZH = {
  sun: "\u65e5",
  mon: "\u4e00",
  tue: "\u4e8c",
  wed: "\u4e09",
  thu: "\u56db",
  fri: "\u4e94",
  sat: "\u516d",
  title: "\u6d3b\u52d5\u6a19\u984c",
  desc: "\u8aaa\u660e",
  type: "\u985e\u578b",
  openPlay: "\u7403\u6558",
  course: "\u8ab2\u7a0b",
  status: "\u72c0\u614b",
  draft: "\u8349\u7a3f",
  published: "\u5df2\u767c\u5e03",
  cancelled: "\u5df2\u53d6\u6d88",
  venue: "\u5834\u9928",
  courtOpt: "\u7403\u5834\uff08\u9078\u586b\uff09",
  courtNone: "\uff08\u4e0d\u6307\u5b9a\uff09",
  batchTitle: "\u6279\u6b21\u5efa\u7acb\u91cd\u8907\u5834\u6b21",
  batchHint:
    "\u9069\u5408\u6bcf\u9031\u56fa\u5b9a\u8ab2\u7a0b\u6216\u7403\u6558\uff0c\u53ef\u4e00\u6b21\u5efa\u7acb\u4e00\u500b\u6708\u5167\u7684\u591a\u500b\u5834\u6b21\u3002",
  batchStart: "\u958b\u59cb\u65e5\u671f",
  batchEnd: "\u7d50\u675f\u65e5\u671f",
  batchSlotStart: "\u6bcf\u65e5\u958b\u59cb\u6642\u9593",
  batchSlotEnd: "\u6bcf\u65e5\u7d50\u675f\u6642\u9593",
  repeatWeek: "\u91cd\u8907\u661f\u671f",
  weekPrefix: "\u9031",
  startAt: "\u958b\u59cb\u6642\u9593",
  endAt: "\u7d50\u675f\u6642\u9593",
  capacity: "\u540d\u984d",
  cancelLegend: "\u53d6\u6d88\u653f\u7b56",
  cancelRule: "\u53d6\u6d88\u898f\u5247",
  hoursBefore: "\u6d3b\u52d5\u958b\u59cb\u524d N \u5c0f\u6642\u5167\u4e0d\u53ef\u53d6\u6d88",
  deadline: "\u6307\u5b9a\u622a\u6b62\u6642\u9593\u524d\u53ef\u53d6\u6d88",
  hoursLabel: "\u5c0f\u6642\u6578\uff08\u9069\u7528 HOURS_BEFORE\uff09",
  deadlineLabel: "\u622a\u6b62\u6642\u9593\uff08\u9069\u7528 DEADLINE\uff09",
  deadlineHint: "\u9810\u8a2d\u8207\u6d3b\u52d5\u958b\u59cb\u6642\u9593\u76f8\u540c\uff0c\u53ef\u81ea\u884c\u8abf\u6574\u3002",
  duprTypeLabel: "DUPR \u5c08\u5834",
  duprSetting: "DUPR \u8a2d\u5b9a",
  duprEventName: "DUPR \u6d3b\u52d5\u540d\u7a31",
  duprEventPh: "\u4f8b\uff1aFriday DUPR Social",
  duprEventHint:
    "\u9078\u586b\uff0c\u65b9\u4fbf\u5c0d\u7167 DUPR \u5e73\u53f0\u4e0a\u7684\u8cfd\u4e8b\u540d\u7a31\u3002",
  save: "\u5132\u5b58",
  batchSubmit: "\u6279\u6b21\u5efa\u7acb\u6d3b\u52d5",
  create: "\u5efa\u7acb\u6d3b\u52d5",
  batchCancelLegend: "\u6279\u6b21\u53d6\u6d88\u622a\u6b62",
  batchDeadlineAtStart: "\u5404\u5834\u622a\u6b62\u6642\u9593 = \u8a72\u5834\u6d3b\u52d5\u958b\u59cb\u6642\u9593",
  batchDaysBefore: "\u63d0\u524d\u5e7e\u5929\uff080 = \u7576\u5929\uff09",
  batchDeadlineTime: "\u622a\u6b62\u6642\u523b",
  batchDeadlineHint:
    "\u52fe\u9078\u6642\uff0c\u6bcf\u5834\u6d3b\u52d5\u7684\u53d6\u6d88\u622a\u6b62\u6703\u81ea\u52d5\u8a2d\u70ba\u8a72\u5834\u958b\u59cb\u6642\u9593\u3002",
  batchDeadlineMoveHint:
    "\u6279\u6b21\u5efa\u7acb\u6642\uff0c\u8acb\u5728\u4e0a\u65b9\u300c\u6279\u6b21\u5efa\u7acb\u91cd\u8907\u5834\u6b21\u300d\u5340\u584a\u8a2d\u5b9a\u53d6\u6d88\u622a\u6b62\u3002",
};

const body = `"use client";

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
  { value: 0, label: "${ZH.sun}" },
  { value: 1, label: "${ZH.mon}" },
  { value: 2, label: "${ZH.tue}" },
  { value: 3, label: "${ZH.wed}" },
  { value: 4, label: "${ZH.thu}" },
  { value: 5, label: "${ZH.fri}" },
  { value: 6, label: "${ZH.sat}" },
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
          ${ZH.title}
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
          ${ZH.desc}
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
            ${ZH.type}
          </label>
          {defaultType && !activity ? (
            <>
              <input type="hidden" name="type" value={defaultType} />
              {duprMode && <input type="hidden" name="requiresDupr" value="on" />}
              <p className="mt-1 text-sm text-slate-600">
                {duprMode
                  ? "${ZH.duprTypeLabel}"
                  : defaultType === "OPEN_PLAY"
                    ? "${ZH.openPlay}"
                    : "${ZH.course}"}
              </p>
            </>
          ) : (
            <select id="type" name="type" defaultValue={lockedType} className={inputClass}>
              <option value="OPEN_PLAY">${ZH.openPlay}</option>
              <option value="COURSE">${ZH.course}</option>
            </select>
          )}
        </div>
        <div>
          <label className={labelClass} htmlFor="status">
            ${ZH.status}
          </label>
          <select
            id="status"
            name="status"
            defaultValue={activity?.status ?? "DRAFT"}
            className={inputClass}
          >
            <option value="DRAFT">${ZH.draft}</option>
            <option value="PUBLISHED">${ZH.published}</option>
            <option value="CANCELLED">${ZH.cancelled}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="venueId">
            ${ZH.venue}
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
            ${ZH.courtOpt}
          </label>
          <select
            id="courtId"
            name="courtId"
            defaultValue={activity?.courtId ?? ""}
            className={inputClass}
          >
            <option value="">${ZH.courtNone}</option>
            {venues.flatMap((v) =>
              v.courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {v.name} ${"\u00b7"} {c.name}
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
            ${ZH.batchTitle}
          </label>
          <p className="mt-1 text-xs text-emerald-800/80">
            ${ZH.batchHint}
          </p>

          {batchEnabled && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="batchStartDate">
                    ${ZH.batchStart}
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
                    ${ZH.batchEnd}
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
                    ${ZH.batchSlotStart}
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
                    ${ZH.batchSlotEnd}
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
                <span className={labelClass}>${ZH.repeatWeek}</span>
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
                      ${ZH.weekPrefix}{d.label}
                    </label>
                  ))}
                </div>
              </div>

              {cancelPolicyType === "DEADLINE" && (
                <div className="space-y-3 border-t border-emerald-200/80 pt-4">
                  <p className="text-sm font-medium text-emerald-900">${ZH.batchCancelLegend}</p>
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
                    ${ZH.batchDeadlineAtStart}
                  </label>
                  {!batchDeadlineAtStart && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass} htmlFor="batchCancelDeadlineDaysBefore">
                          ${ZH.batchDaysBefore}
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
                          ${ZH.batchDeadlineTime}
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
                  <p className="text-xs text-emerald-800/80">${ZH.batchDeadlineHint}</p>
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
              ${ZH.startAt}
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
              ${ZH.endAt}
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
          ${ZH.capacity}
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
        <legend className="text-sm font-medium text-slate-700">${ZH.cancelLegend}</legend>
        <div className="mt-2">
          <label className={labelClass} htmlFor="cancelPolicyType">
            ${ZH.cancelRule}
          </label>
          <select
            id="cancelPolicyType"
            name="cancelPolicyType"
            value={cancelPolicyType}
            onChange={(e) => setCancelPolicyType(e.target.value as "HOURS_BEFORE" | "DEADLINE")}
            className={inputClass}
          >
            <option value="HOURS_BEFORE">${ZH.hoursBefore}</option>
            <option value="DEADLINE">${ZH.deadline}</option>
          </select>
        </div>
        <div className="mt-3">
          <label className={labelClass} htmlFor="cancelHoursBefore">
            ${ZH.hoursLabel}
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
              ${ZH.deadlineLabel}
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
            <p className="mt-1 text-xs text-slate-500">${ZH.deadlineHint}</p>
          </div>
        )}
        {batchEnabled && cancelPolicyType === "DEADLINE" && (
          <p className="mt-3 text-xs text-slate-500">${ZH.batchDeadlineMoveHint}</p>
        )}
      </fieldset>

      {showDuprFields && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
          {isEdit && activity?.requiresDupr && (
            <input type="hidden" name="requiresDupr" value="on" />
          )}
          <p className="text-sm font-medium text-indigo-900">${ZH.duprSetting}</p>
          <div>
            <label className={labelClass} htmlFor="duprEventName">
              ${ZH.duprEventName}
            </label>
            <input
              id="duprEventName"
              name="duprEventName"
              placeholder="${ZH.duprEventPh}"
              defaultValue={activity?.duprEventName ?? ""}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-indigo-800/80">${ZH.duprEventHint}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          className="rounded-lg bg-brand-navy px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {isEdit ? "${ZH.save}" : batchEnabled ? "${ZH.batchSubmit}" : "${ZH.create}"}
        </button>
      </div>
    </form>
  );
}
`;

const full = path.join(root, rel);
fs.writeFileSync(full, body, "utf8");
new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(full));
if (/"(\?{2,})"/.test(body)) throw new Error("template still has ??");
console.log("OK", rel);
