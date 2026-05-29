import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const rel = "src/app/me/dupr/page.tsx";

const body = `import Link from "next/link";
import { auth } from "@/auth";
import { importDuprFromApiAction, saveDuprProfile, syncDuprAction } from "@/app/me/actions";
import { Badge } from "@/components/ui/badge";
import { isDuprApiConfigured } from "@/lib/dupr";
import { prisma } from "@/lib/prisma";

export default async function MeDuprPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    synced?: string;
    imported?: string;
    message?: string;
    error?: string;
  }>;
}) {
  const session = await auth();
  const { saved, synced, imported, message, error } = await searchParams;
  const apiReady = isDuprApiConfigured();
  const profile = await prisma.duprProfile.findUnique({
    where: { userId: session!.user!.id },
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800">DUPR ${"\u500b\u4eba\u8cc7\u6599"}</h2>
        <Badge variant="dupr">{apiReady ? "API ${"\u5df2\u8a2d\u5b9a"}" : "${"\u624b\u52d5\u6a21\u5f0f"}"}</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        ${"\u8acb\u5148\u8f38\u5165\u60a8\u7684 DUPR ID\uff0c\u518d\u6309\u300c\u5f9e DUPR \u5e36\u5165\u300d\u81ea\u52d5\u586b\u5165\u540d\u7a31\u8207\u7a4d\u5206\uff1b\u82e5 API \u672a\u8a2d\u5b9a\uff0c\u53ef\u6539\u7528\u624b\u52d5\u586b\u5beb\u5f8c\u5132\u5b58\u3002"}
      </p>
      {saved && <p className="mt-2 text-sm text-brand-teal">${"\u5df2\u5132\u5b58"}</p>}
      {imported && <p className="mt-2 text-sm text-brand-teal">${"\u5df2\u5f9e DUPR \u5e36\u5165\u8cc7\u6599"}</p>}
      {synced && <p className="mt-2 text-sm text-brand-teal">${"\u5df2\u91cd\u65b0\u540c\u6b65"}</p>}
      {message && <p className="mt-2 text-sm text-amber-700">{message}</p>}
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
          {profile.lastSyncedAt && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">${"\u4e0a\u6b21\u540c\u6b65"}</dt>
              <dd>{profile.lastSyncedAt.toLocaleString("zh-TW")}</dd>
            </div>
          )}
        </dl>
      )}

      <form action={saveDuprProfile} className="mt-6 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="duprId">
            DUPR ID *
          </label>
          <input
            id="duprId"
            name="duprId"
            required
            placeholder="${"\u4f8b\uff1aGB0NV05E"}"
            defaultValue={profile?.duprId ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono uppercase"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            formAction={apiReady ? importDuprFromApiAction : undefined}
            disabled={!apiReady}
            className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ${"\u5f9e DUPR \u5e36\u5165"}
          </button>
          <button
            type="submit"
            className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white"
          >
            ${"\u5132\u5b58\uff08\u542b\u624b\u52d5\u4fee\u6539\uff09"}
          </button>
        </div>

        {!apiReady && (
          <p className="text-xs text-slate-500">
            ${"\u5c1a\u672a\u8a2d\u5b9a DUPR_API_KEY \u6216 DUPR_CLIENT_ID / DUPR_CLIENT_SECRET\uff0c\u8acb\u65bc .env \u586b\u5165\u5f8c\u91cd\u555f\u958b\u767c\u4f3a\u670d\u5668\u3002"}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700">${"\u986f\u793a\u540d\u7a31"}</label>
          <input
            name="duprName"
            defaultValue={profile?.duprName ?? ""}
            placeholder="${"\u53ef\u7531 DUPR \u5e36\u5165"}"
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
              placeholder="${"\u53ef\u7531 DUPR \u5e36\u5165"}"
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
              placeholder="${"\u53ef\u7531 DUPR \u5e36\u5165"}"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </form>

      {profile?.duprId && apiReady && (
        <form action={syncDuprAction} className="mt-4">
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            ${"\u4f9d\u76ee\u524d DUPR ID \u91cd\u65b0\u540c\u6b65"}
          </button>
        </form>
      )}

      {profile?.profileUrl && (
        <Link href={profile.profileUrl} target="_blank" className="mt-4 inline-block text-sm text-brand-teal">
          ${"\u2192 DUPR \u5b98\u65b9\u500b\u4eba\u9801"}
        </Link>
      )}
    </section>
  );
}
`;

const full = path.join(root, rel);
fs.writeFileSync(full, body, "utf8");
if (body.includes("????")) throw new Error("still has ????");
new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(full));
console.log("OK", rel);
