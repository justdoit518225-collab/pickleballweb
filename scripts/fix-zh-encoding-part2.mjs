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

write("src/app/me/page.tsx", `import Link from "next/link";
import { auth } from "@/auth";
import { Avatar } from "@/components/ui/avatar";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

export default async function MeOverviewPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const [memberships, dupr] = await Promise.all([
    prisma.tenantMembership.findMany({
      where: { userId },
      include: { tenant: true },
    }),
    prisma.duprProfile.findUnique({ where: { userId } }),
  ]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <Avatar src={session!.user!.image} name={session!.user!.name ?? "${"\u6703\u54e1"}"} />
          <div>
            <p className="font-semibold">{session!.user!.name}</p>
            <p className="text-sm text-slate-500">{session!.user!.email}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1 text-sm">
          {session!.user!.platformRole === "SUPER_ADMIN" && (
            <Link href={ROUTES.platformAdmin} className="font-medium text-brand-teal">
              ${"\u2192 \u5e73\u53f0\u7ba1\u7406\uff08\u5efa\u7acb\u79df\u6236\uff09"}
            </Link>
          )}
          <Link href={ROUTES.tenantAdmin("active-pickleball")} className="font-medium text-brand-teal">
            ${"\u2192 \u793a\u7bc4\u5834\u9928\u7ba1\u7406\u5f8c\u53f0"}
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">DUPR ${"\u72c0\u614b"}</h2>
        {dupr?.linkStatus === "LINKED" ? (
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">${"\u540d\u7a31"}</dt>
              <dd>{dupr.duprName ?? "${"\u2014"}"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">${"\u55ae\u6253"}</dt>
              <dd>{dupr.singlesRating?.toString() ?? "${"\u2014"}"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">${"\u96d9\u6253"}</dt>
              <dd>{dupr.doublesRating?.toString() ?? "${"\u2014"}"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            ${"\u5c1a\u672a\u9023\u7d50 DUPR\u3002"}
            <Link href={ROUTES.meDupr} className="ml-1 text-brand-navy">
              ${"\u524d\u5f80\u8a2d\u5b9a"}
            </Link>
          </p>
        )}
      </section>

      <section className="col-span-full rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">${"\u5df2\u52a0\u5165\u7684\u5834\u9928"}</h2>
        {memberships.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">${"\u9810\u7d04\u4efb\u4e00\u5834\u9928\u6d3b\u52d5\u5f8c\u6703\u81ea\u52d5\u52a0\u5165\u8a72\u9928\u6703\u54e1"}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {memberships.map((m) => (
              <li key={m.id}>
                <Link href={ROUTES.tenant(m.tenant.slug)} className="text-sm text-brand-navy">
                  {m.tenant.displayName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
`);

write("src/app/me/profile/page.tsx", `import { auth } from "@/auth";
import { updateMembershipProfile } from "@/app/me/actions";
import { prisma } from "@/lib/prisma";

export default async function MeProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id;

  const memberships = await prisma.tenantMembership.findMany({
    where: { userId },
    include: { tenant: true },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        ${"\u5404\u5834\u9928\u53ef\u8a2d\u5b9a\u4e0d\u540c\u66c9\u7a31\u8207\u982d\u50cf\u7db2\u5740\uff0c\u5831\u540d\u8207\u6d3b\u52d5\u540d\u55ae\u5c07\u986f\u793a\u6b64\u8cc7\u6599\u3002"}
      </p>
      {saved && <p className="text-sm text-brand-teal">${"\u5df2\u5132\u5b58"}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {memberships.length === 0 ? (
        <p className="text-sm text-slate-500">${"\u5c1a\u7121\u5834\u9928\u6703\u54e1\u8cc7\u6599\uff0c\u9810\u7d04\u4efb\u4e00\u6d3b\u52d5\u5f8c\u6703\u81ea\u52d5\u5efa\u7acb"}</p>
      ) : (
        memberships.map((m) => (
          <form
            key={m.id}
            action={updateMembershipProfile}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
          >
            <input type="hidden" name="tenantId" value={m.tenantId} />
            <h2 className="font-semibold text-slate-800">{m.tenant.displayName}</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700">${"\u66c9\u7a31"}</label>
              <input
                name="nickname"
                defaultValue={m.nickname ?? session!.user!.name ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">${"\u982d\u50cf URL"}</label>
              <input
                name="avatarUrl"
                type="url"
                defaultValue={m.avatarUrl ?? session!.user!.image ?? ""}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white"
            >
              ${"\u5132\u5b58"}
            </button>
          </form>
        ))
      )}
    </div>
  );
}
`);

write("src/app/me/inbox/page.tsx", `import Link from "next/link";
import { auth } from "@/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/app/me/actions";
import { prisma } from "@/lib/prisma";

export default async function MeInboxPage() {
  const session = await auth();
  const notifications = await prisma.userNotification.findMany({
    where: { userId: session!.user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">${"\u7ad9\u5167\u901a\u77e5\uff08LINE / Email \u4ea6\u6703\u540c\u6b65\u63a8\u9001\uff09"}</p>
        {notifications.some((n) => !n.readAt) && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="text-sm text-brand-teal">
              ${"\u5168\u90e8\u6a19\u70ba\u5df2\u8b80"}
            </button>
          </form>
        )}
      </div>
      <ul className="mt-4 space-y-2">
        {notifications.length === 0 ? (
          <li className="text-sm text-slate-500">${"\u5c1a\u7121\u901a\u77e5"}</li>
        ) : (
          notifications.map((n) => (
            <li
              key={n.id}
              className={\`rounded-xl border p-4 text-sm \${n.readAt ? "border-slate-100 bg-white" : "border-brand-teal-soft bg-brand-lime-soft/30"}\`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium text-slate-800">{n.title}</span>
                <span className="text-xs text-slate-400">
                  {n.createdAt.toLocaleString("zh-TW")}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-slate-600">{n.body}</p>
              {!n.readAt && (
                <form action={markNotificationRead.bind(null, n.id)} className="mt-2">
                  <button type="submit" className="text-xs text-brand-teal">
                    ${"\u6a19\u70ba\u5df2\u8b80"}
                  </button>
                </form>
              )}
            </li>
          ))
        )}
      </ul>
      <Link href="/me" className="mt-6 inline-block text-sm text-brand-teal">
        ${"\u2190 \u6703\u54e1\u4e2d\u5fc3"}
      </Link>
    </div>
  );
}
`);

write("src/app/me/notifications/page.tsx", `import { auth } from "@/auth";
import { updateNotificationPrefs } from "@/app/me/actions";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

const items = [
  { key: "masterEnabled", label: "${"\u7e3d\u958b\u95dc"}" },
  { key: "notifyBookingSelf", label: "${"\u9810\u7d04\u6210\u529f / \u53d6\u6d88"}" },
  { key: "notifyBookingCancel", label: "${"\u4ed6\u4eba\u53d6\u6d88"}" },
  { key: "notifyRosterChange", label: "${"\u5df2\u5831\u540d\u6d3b\u52d5\u540d\u55ae\u8b8a\u52d5"}" },
  { key: "notifyActivityChange", label: "${"\u6d3b\u52d5\u7570\u52d5\uff08\u505c\u8ab2\u3001\u6539\u671f\u7b49\uff09"}" },
  { key: "notifyReminder", label: "${"\u958b\u8ab2\u63d0\u9192"}" },
  { key: "notifyRentalBooking", label: "${"\u5834\u5730\u79df\u501f\u76f8\u95dc\u901a\u77e5"}" },
] as const;

export default async function MeNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const session = await auth();
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: session!.user!.id },
    include: { tenant: true },
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800">${"\u901a\u77e5\u8a2d\u5b9a"}</h2>
        <Badge variant="warning">LINE ${"\u63a8\u64ad"}</Badge>
      </div>
      <p className="text-sm text-slate-600">
        ${"\u4f7f\u7528 LINE \u767b\u5165\u5f8c\u53ef\u7d81\u5b9a\u63a8\u64ad\u5e33\u865f\uff1b\u8acb\u65bc .env \u8a2d\u5b9a LINE_CHANNEL_ACCESS_TOKEN \u4ee5\u5be6\u969b\u767c\u9001\u3002"}
      </p>
      {saved && <p className="text-sm text-brand-teal">${"\u5df2\u5132\u5b58\u901a\u77e5\u8a2d\u5b9a"}</p>}
      {prefs.length === 0 ? (
        <p className="text-sm text-slate-500">${"\u52a0\u5165\u5834\u9928\u5f8c\u53ef\u8a2d\u5b9a\u5404\u9928\u901a\u77e5\u504f\u597d"}</p>
      ) : (
        prefs.map((p) => (
          <form
            key={p.id}
            action={updateNotificationPrefs}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <input type="hidden" name="tenantId" value={p.tenantId} />
            <h3 className="font-medium text-slate-800">{p.tenant.displayName}</h3>
            <p className="mt-1 text-xs text-slate-500">
              LINE {p.lineLinked ? \`\${"\u5df2\u7d81\u5b9a"} (\${p.lineUserId?.slice(0, 8)}${"\u2026"})\` : "${"\u672a\u7d81\u5b9a \u2014 \u8acb\u7528 LINE \u767b\u5165\u4e00\u6b21"}"}
            </p>
            <ul className="mt-4 space-y-2">
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={item.key}
                    defaultChecked={p[item.key]}
                    className="rounded border-slate-300"
                  />
                  <label>{item.label}</label>
                </li>
              ))}
            </ul>
            <button
              type="submit"
              className="mt-4 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white"
            >
              ${"\u5132\u5b58\u8a2d\u5b9a"}
            </button>
          </form>
        ))
      )}
    </section>
  );
}
`);

write("src/app/me/dupr/page.tsx", `import Link from "next/link";
import { auth } from "@/auth";
import { saveDuprProfile, syncDuprAction } from "@/app/me/actions";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

export default async function MeDuprPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; synced?: string; error?: string }>;
}) {
  const session = await auth();
  const { saved, synced, error } = await searchParams;
  const profile = await prisma.duprProfile.findUnique({
    where: { userId: session!.user!.id },
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800">DUPR ${"\u500b\u4eba\u8cc7\u6599"}</h2>
        <Badge variant="dupr">${"\u624b\u52d5"} / API</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        ${"\u9023\u7d50\u5f8c\u53ef\u53c3\u52a0 DUPR \u5c08\u5834\u6d3b\u52d5\u4e26\u986f\u793a\u7a4d\u5206\uff1b\u5834\u4e3b\u4ea6\u53ef\u65bc\u5f8c\u53f0\u4e0a\u50b3\u6230\u7e3e\uff08\u9032\u968e\u4e32\u63a5\uff09\u3002"}
      </p>
      {saved && <p className="mt-2 text-sm text-brand-teal">${"\u5df2\u5132\u5b58"}</p>}
      {synced && <p className="mt-2 text-sm text-brand-teal">${"\u5df2\u5617\u8a66\u540c\u6b65"}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {profile && (
        <dl className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-slate-500">${"\u72c0\u614b"}</dt>
            <dd>{profile.linkStatus}</dd>
          </div>
          <div>
            <dt className="text-slate-500">DUPR ID</dt>
            <dd className="font-mono">{profile.duprId}</dd>
          </div>
        </dl>
      )}

      <form action={saveDuprProfile} className="mt-6 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">DUPR ID *</label>
          <input
            name="duprId"
            required
            defaultValue={profile?.duprId ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">${"\u986f\u793a\u540d\u7a31"}</label>
          <input
            name="duprName"
            defaultValue={profile?.duprName ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">${"\u55ae\u6253\u7a4d\u5206"}</label>
            <input
              name="singlesRating"
              type="number"
              step="0.01"
              defaultValue={profile?.singlesRating?.toString() ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">${"\u96d9\u6253\u7a4d\u5206"}</label>
            <input
              name="doublesRating"
              type="number"
              step="0.01"
              defaultValue={profile?.doublesRating?.toString() ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white"
          >
            ${"\u5132\u5b58"} / ${"\u9023\u7d50"}
          </button>
        </div>
      </form>

      <form action={syncDuprAction} className="mt-4">
        <button
          type="submit"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          ${"\u5f9e DUPR API \u540c\u6b65\uff08\u9700\u8a2d\u5b9a DUPR_API_KEY\uff09"}
        </button>
      </form>

      {profile?.profileUrl && (
        <Link href={profile.profileUrl} target="_blank" className="mt-4 inline-block text-sm text-brand-teal">
          ${"\u2192 DUPR \u5b98\u65b9\u500b\u4eba\u9801"}
        </Link>
      )}
    </section>
  );
}
`);

console.log("Fixed batch 2");
