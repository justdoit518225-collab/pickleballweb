import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

/** @param {string} rel @param {string} body */
function write(rel, body) {
  const full = path.join(root, rel);
  fs.writeFileSync(full, body, "utf8");
  const b = fs.readFileSync(full);
  new TextDecoder("utf-8", { fatal: true }).decode(b);
  if (body.includes("????")) throw new Error(`still has ???? in ${rel}`);
  console.log("OK", rel);
}

write("src/components/activity/booking-actions.tsx", `"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  activityId: string;
  hasJoined: boolean;
  isFull: boolean;
  canCancel: boolean;
  onWaitlist: boolean;
  waitlistPosition?: number;
};

export function BookingActions({
  activityId,
  hasJoined,
  isFull,
  canCancel,
  onWaitlist,
  waitlistPosition,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callApi(path: string, body?: object) {
    setLoading(true);
    setError(null);
    const res = await fetch(\`/api/activities/\${activityId}/\${path}\`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "${"\u64cd\u4f5c\u5931\u6557"}");
      return;
    }
    router.refresh();
  }

  if (hasJoined) {
    return (
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit rounded-lg bg-brand-lime-soft px-4 py-2 text-sm font-medium text-brand-navy">
          ${"\u60a8\u5df2\u5831\u540d"}
        </span>
        {canCancel ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => callApi("cancel")}
            className="w-fit rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "${"\u8655\u7406\u4e2d\u2026"}" : "${"\u53d6\u6d88\u9810\u7d04"}"}
          </button>
        ) : (
          <p className="text-sm text-slate-500">${"\u5df2\u8d85\u904e\u53d6\u6d88\u671f\u9650"}</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (onWaitlist) {
    return (
      <div className="flex flex-col gap-2">
        <span className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          ${"\u5019\u88dc\u4e2d\uff08\u7b2c"} {waitlistPosition} ${"\u4f4d\uff09"}
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={() => callApi("waitlist", { action: "leave" })}
          className="w-fit text-sm text-slate-600 underline"
        >
          ${"\u96e2\u958b\u5019\u88dc"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="flex flex-col gap-2">
        <span className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800">
          ${"\u540d\u984d\u5df2\u6eff"}
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={() => callApi("waitlist")}
          className="w-fit rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-60"
        >
          {loading ? "${"\u8655\u7406\u4e2d\u2026"}" : "${"\u52a0\u5165\u5019\u88dc"}"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => callApi("book")}
        className="w-fit rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "${"\u9810\u7d04\u4e2d\u2026"}" : "${"\u7acb\u5373\u9810\u7d04"}"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
`);

write("src/components/participant-list.tsx", `import { Avatar } from "@/components/ui/avatar";

export type Participant = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isSelf?: boolean;
};

export function ParticipantList({
  participants,
  capacity,
}: {
  participants: Participant[];
  capacity: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">${"\u53c3\u8207\u540d\u55ae"}</h3>
        <span className="text-sm text-slate-500">
          {participants.length} / {capacity}
        </span>
      </div>
      {participants.length === 0 ? (
        <p className="text-sm text-slate-500">${"\u5c1a\u7121\u4eba\u5831\u540d"}</p>
      ) : (
        <ul className="space-y-2">
          {participants.map((p) => (
            <li key={p.userId} className="flex items-center gap-3">
              <Avatar src={p.avatarUrl} name={p.displayName} size="sm" />
              <span className="text-sm text-slate-700">
                {p.displayName}
                {p.isSelf && (
                  <span className="ml-1 text-xs text-brand-teal">${"\uff08\u6211\uff09"}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
`);

write("src/components/layout/admin-nav.tsx", `import Link from "next/link";
import { ROUTES } from "@/lib/constants";

const links = (slug: string) => [
  { href: ROUTES.tenantAdmin(slug), label: "${"\u7e3d\u89bd"}" },
  { href: ROUTES.tenantAdminRentals(slug), label: "${"\u5834\u5730\u79df\u501f"}" },
  { href: ROUTES.tenantAdminVenues(slug), label: "${"\u5834\u9928/\u7403\u5834"}" },
  { href: ROUTES.tenantAdminMembers(slug), label: "${"\u6703\u54e1"}" },
  { href: ROUTES.tenantAdminStaff(slug), label: "${"\u54e1\u5de5\u6b0a\u9650"}" },
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
        ${"\u524d\u53f0"} ${"\u2192"}
      </Link>
    </nav>
  );
}
`);

console.log("Fixed batch 1");
