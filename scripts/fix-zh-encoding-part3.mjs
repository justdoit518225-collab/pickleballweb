import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function write(rel, body) {
  const full = path.join(root, rel);
  fs.writeFileSync(full, body, "utf8");
  new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(full));
  if (body.includes("????")) throw new Error(`still has ???? in ${rel}`);
  console.log("OK", rel);
}

write("src/components/rental/rental-calendar.tsx", `"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type RentalSlotView = {
  id: string;
  courtId: string;
  courtName: string;
  venueName: string;
  startAt: string;
  endAt: string;
  status: "OPEN" | "BOOKED" | "BLOCKED";
  isMine: boolean;
  cancelHoursBefore: number;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", weekday: "short" });
}

export function RentalCalendar({
  slots,
  loggedIn,
}: {
  slots: RentalSlotView[];
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const courts = useMemo(() => {
    const map = new Map<string, { courtName: string; venueName: string }>();
    for (const s of slots) {
      if (!map.has(s.courtId)) map.set(s.courtId, { courtName: s.courtName, venueName: s.venueName });
    }
    return [...map.entries()].map(([id, v]) => ({ id, ...v }));
  }, [slots]);

  const days = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      set.add(new Date(s.startAt).toDateString());
    }
    return [...set].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [slots]);

  async function book(slotId: string) {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    setLoadingId(slotId);
    setError(null);
    const res = await fetch(\`/api/rentals/\${slotId}/book\`, { method: "POST" });
    const data = (await res.json()) as { error?: string };
    setLoadingId(null);
    if (!res.ok) {
      setError(data.error ?? "${"\u9810\u7d04\u5931\u6557"}");
      return;
    }
    router.refresh();
  }

  async function cancel(slotId: string) {
    setLoadingId(slotId);
    setError(null);
    const res = await fetch(\`/api/rentals/\${slotId}/cancel\`, { method: "POST" });
    const data = (await res.json()) as { error?: string };
    setLoadingId(null);
    if (!res.ok) {
      setError(data.error ?? "${"\u53d6\u6d88\u5931\u6557"}");
      return;
    }
    router.refresh();
  }

  if (courts.length === 0) {
    return <p className="text-sm text-slate-500">${"\u8fd1 30 \u5929\u5c1a\u7121\u958b\u653e\u79df\u501f\u6642\u6bb5"}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-brand-teal-soft bg-brand-lime-soft" /> ${"\u53ef\u9810\u7d04"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-slate-200" /> ${"\u5df2\u6eff"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-blue-300 bg-blue-100" /> ${"\u6211\u7684\u9810\u7d04"}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-left">${"\u7403\u5834"}</th>
              {days.map((d) => (
                <th key={d} className="min-w-[88px] px-1 py-2 text-center font-medium text-slate-600">
                  {formatDay(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courts.map((court) => (
              <tr key={court.id} className="border-b border-slate-50">
                <td className="sticky left-0 z-10 bg-white px-2 py-2 text-slate-800">
                  <div className="font-medium">{court.courtName}</div>
                  <div className="text-slate-500">{court.venueName}</div>
                </td>
                {days.map((dayKey) => {
                  const daySlots = slots.filter(
                    (s) => s.courtId === court.id && new Date(s.startAt).toDateString() === dayKey,
                  );
                  return (
                    <td key={dayKey} className="align-top px-1 py-1">
                      <div className="flex flex-col gap-1">
                        {daySlots.map((s) => (
                          <div
                            key={s.id}
                            className={\`rounded px-1 py-1 \${
                              s.isMine
                                ? "border border-blue-300 bg-blue-50"
                                : s.status === "OPEN"
                                  ? "border border-brand-teal-soft bg-brand-lime-soft/50 cursor-pointer hover:bg-brand-lime-soft"
                                  : "bg-slate-100 text-slate-400"
                            }\`}
                          >
                            <div>
                              {formatTime(s.startAt)}-{formatTime(s.endAt)}
                            </div>
                            {s.status === "OPEN" && !s.isMine && (
                              <button
                                type="button"
                                disabled={loadingId === s.id}
                                onClick={() => book(s.id)}
                                className="mt-0.5 text-brand-navy underline"
                              >
                                ${"\u9810\u7d04"}
                              </button>
                            )}
                            {s.isMine && (
                              <button
                                type="button"
                                disabled={loadingId === s.id}
                                onClick={() => cancel(s.id)}
                                className="mt-0.5 text-blue-700 underline"
                              >
                                ${"\u53d6\u6d88"}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`);

const dot = "\u00b7";

write("src/components/admin/activity-form.tsx", `import type { Activity, Court, Venue } from "@/generated/prisma/client";
import { toDatetimeLocalValue } from "@/lib/datetime";
import { createActivity, updateActivity } from "@/app/admin/[tenantSlug]/actions";

type VenueWithCourts = Venue & { courts: Court[] };

type Props = {
  tenantSlug: string;
  venues: VenueWithCourts[];
  activity?: Activity;
  error?: string;
  defaultType?: "OPEN_PLAY" | "COURSE";
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800";
const labelClass = "block text-sm font-medium text-slate-700";

export function ActivityForm({ tenantSlug, venues, activity, error, defaultType }: Props) {
  const lockedType = defaultType ?? activity?.type ?? "OPEN_PLAY";
  const isEdit = Boolean(activity);
  const action = isEdit
    ? updateActivity.bind(null, tenantSlug, activity!.id)
    : createActivity.bind(null, tenantSlug);

  const defaultStart = activity
    ? toDatetimeLocalValue(activity.startAt)
    : toDatetimeLocalValue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
  const defaultEnd = activity
    ? toDatetimeLocalValue(activity.endAt)
    : toDatetimeLocalValue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000));

  return (
    <form action={action} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div>
        <label className={labelClass} htmlFor="title">
          ${"\u6d3b\u52d5\u6a19\u984c"}
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
          ${"\u8aaa\u660e"}
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
            ${"\u985e\u578b"}
          </label>
          {defaultType && !activity ? (
            <>
              <input type="hidden" name="type" value={defaultType} />
              <p className="mt-1 text-sm text-slate-600">
                {defaultType === "OPEN_PLAY" ? "${"\u7403\u6575"}" : "${"\u8ab2\u7a0b"}"}
              </p>
            </>
          ) : (
            <select id="type" name="type" defaultValue={lockedType} className={inputClass}>
              <option value="OPEN_PLAY">${"\u7403\u6575"}</option>
              <option value="COURSE">${"\u8ab2\u7a0b"}</option>
            </select>
          )}
        </div>
        <div>
          <label className={labelClass} htmlFor="status">
            ${"\u72c0\u614b"}
          </label>
          <select
            id="status"
            name="status"
            defaultValue={activity?.status ?? "DRAFT"}
            className={inputClass}
          >
            <option value="DRAFT">${"\u8349\u7a3f"}</option>
            <option value="PUBLISHED">${"\u5df2\u767c\u5e03"}</option>
            <option value="CANCELLED">${"\u5df2\u53d6\u6d88"}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="venueId">
            ${"\u5834\u9928"}
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
            ${"\u7403\u5834\uff08\u9078\u586b\uff09"}
          </label>
          <select id="courtId" name="courtId" defaultValue={activity?.courtId ?? ""} className={inputClass}>
            <option value="">${"\u2014"}</option>
            {venues.flatMap((v) =>
              v.courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {v.name} ${dot} {c.name}
                </option>
              )),
            )}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="startAt">
            ${"\u958b\u59cb\u6642\u9593"}
          </label>
          <input
            id="startAt"
            name="startAt"
            type="datetime-local"
            required
            defaultValue={defaultStart}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="endAt">
            ${"\u7d50\u675f\u6642\u9593"}
          </label>
          <input
            id="endAt"
            name="endAt"
            type="datetime-local"
            required
            defaultValue={defaultEnd}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="capacity">
          ${"\u540d\u984d\u4e0a\u9650"}
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
        <legend className="text-sm font-medium text-slate-700">${"\u53d6\u6d88\u898f\u5247"}</legend>
        <div className="mt-2">
          <label className={labelClass} htmlFor="cancelPolicyType">
            ${"\u898f\u5247\u985e\u578b"}
          </label>
          <select
            id="cancelPolicyType"
            name="cancelPolicyType"
            defaultValue={activity?.cancelPolicyType ?? "HOURS_BEFORE"}
            className={inputClass}
          >
            <option value="HOURS_BEFORE">${"\u6d3b\u52d5\u958b\u59cb\u524d N \u5c0f\u6642\u5167\u4e0d\u53ef\u53d6\u6d88"}</option>
            <option value="DEADLINE">${"\u6307\u5b9a\u65e5\u671f\u6642\u9593\u524d\u53ef\u53d6\u6d88"}</option>
          </select>
        </div>
        <div className="mt-3">
          <label className={labelClass} htmlFor="cancelHoursBefore">
            ${"\u5c0f\u6642\u6578\uff08HOURS_BEFORE\uff09"}
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
        <div className="mt-3">
          <label className={labelClass} htmlFor="cancelDeadlineAt">
            ${"\u622a\u6b62\u6642\u9593\uff08DEADLINE\uff09"}
          </label>
          <input
            id="cancelDeadlineAt"
            name="cancelDeadlineAt"
            type="datetime-local"
            defaultValue={
              activity?.cancelDeadlineAt
                ? toDatetimeLocalValue(activity.cancelDeadlineAt)
                : ""
            }
            className={inputClass}
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="requiresDupr"
            defaultChecked={activity?.requiresDupr}
            className="rounded border-slate-300"
          />
          DUPR ${"\u5c08\u5834"}
        </label>
        <input
          name="duprEventName"
          placeholder="${"DUPR \u6d3b\u52d5\u540d\u7a31\uff08\u9078\u586b\uff09"}"
          defaultValue={activity?.duprEventName ?? ""}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[200px]"
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          className="rounded-lg bg-brand-navy px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {isEdit ? "${"\u5132\u5b58"}" : "${"\u5efa\u7acb\u6d3b\u52d5"}"}
        </button>
      </div>
    </form>
  );
}
`);

console.log("Fixed batch 3");
