import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

/** @param {string} rel @param {string} body */
function write(rel, body) {
  const full = path.join(root, rel);
  fs.writeFileSync(full, body, "utf8");
  const read = fs.readFileSync(full, "utf8");
  const bad = read.split("\n").filter((l) => /"(\?{2,})"/.test(l));
  if (bad.length) {
    throw new Error(`still has corrupted strings in ${rel}:\n${bad.slice(0, 5).join("\n")}`);
  }
  console.log("OK", rel);
}

write(
  "src/components/layout/admin-nav.tsx",
  `import Link from "next/link";
import { ROUTES } from "@/lib/constants";

const links = (slug: string) => [
  { href: ROUTES.tenantAdmin(slug), label: "${"\u7e3d\u89bd"}" },
  { href: ROUTES.tenantAdminRentals(slug), label: "${"\u5834\u5730\u79df\u501f"}" },
  { href: ROUTES.tenantAdminVenues(slug), label: "${"\u5834\u9928/\u7403\u5834"}" },
  { href: ROUTES.tenantAdminMembers(slug), label: "${"\u6703\u54e1"}" },
  { href: ROUTES.tenantAdminStaff(slug), label: "${"\u54e1\u5de5\u6b0a\u9650"}" },
  { href: ROUTES.tenantAdminSettings(slug), label: "${"\u8a2d\u5b9a"}" },
];

export function AdminNav({ tenantSlug }: { tenantSlug: string }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {links(tenantSlug).map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-brand-teal-soft hover:text-brand-navy"
        >
          {l.label}
        </Link>
      ))}
      <Link
        href={ROUTES.tenant(tenantSlug)}
        className="rounded-lg px-3 py-1.5 text-sm text-brand-teal"
      >
        ${"\u524d\u5f80\u524d\u53f0"}
      </Link>
    </nav>
  );
}
`,
);

write(
  "src/components/admin/activity-form.tsx",
  `import type { Activity, Court, Venue } from "@/generated/prisma/client";
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
                {defaultType === "OPEN_PLAY" ? "${"\u7403\u6558"}" : "${"\u8ab2\u7a0b"}"}
              </p>
            </>
          ) : (
            <select id="type" name="type" defaultValue={lockedType} className={inputClass}>
              <option value="OPEN_PLAY">${"\u7403\u6558"}</option>
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
            <option value="">${"\uff08\u4e0d\u6307\u5b9a\uff09"}</option>
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
          ${"\u540d\u984d"}
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
        <legend className="text-sm font-medium text-slate-700">${"\u53d6\u6d88\u653f\u7b56"}</legend>
        <div className="mt-2">
          <label className={labelClass} htmlFor="cancelPolicyType">
            ${"\u53d6\u6d88\u898f\u5247"}
          </label>
          <select
            id="cancelPolicyType"
            name="cancelPolicyType"
            defaultValue={activity?.cancelPolicyType ?? "HOURS_BEFORE"}
            className={inputClass}
          >
            <option value="HOURS_BEFORE">${"\u6d3b\u52d5\u958b\u59cb\u524d N \u5c0f\u6642\u5167\u4e0d\u53ef\u53d6\u6d88"}</option>
            <option value="DEADLINE">${"\u6307\u5b9a\u622a\u6b62\u6642\u9593\u524d\u53ef\u53d6\u6d88"}</option>
          </select>
        </div>
        <div className="mt-3">
          <label className={labelClass} htmlFor="cancelHoursBefore">
            ${"\u5c0f\u6642\u6578\uff08\u9069\u7528 HOURS_BEFORE\uff09"}
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
            ${"\u622a\u6b62\u6642\u9593\uff08\u9069\u7528 DEADLINE\uff09"}
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
          placeholder="DUPR ${"\u6d3b\u52d5\u540d\u7a31\uff08\u9078\u586b\uff09"}"
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
`,
);
