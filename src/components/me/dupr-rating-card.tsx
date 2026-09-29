type Rating = { toString(): string } | number | null;

export type DuprRatingProfile = {
  duprId: string | null;
  duprName: string | null;
  singlesRating: Rating;
  doublesRating: Rating;
  lastSyncedAt: Date | null;
};

function formatRating(value: Rating) {
  if (value == null) return "NR";
  const n = Number(value.toString());
  return Number.isFinite(n) ? n.toFixed(3) : "NR";
}

export function DuprRatingCard({ profile }: { profile: DuprRatingProfile }) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-slate-800">{profile.duprName ?? "DUPR 球員"}</p>
        <p className="font-mono text-xs text-slate-500">DUPR ID {profile.duprId}</p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white px-3 py-2 text-center shadow-sm">
          <dt className="text-xs text-slate-500">雙打</dt>
          <dd className="text-2xl font-bold tabular-nums text-indigo-700">{formatRating(profile.doublesRating)}</dd>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-center shadow-sm">
          <dt className="text-xs text-slate-500">單打</dt>
          <dd className="text-2xl font-bold tabular-nums text-indigo-700">{formatRating(profile.singlesRating)}</dd>
        </div>
      </dl>
      {profile.lastSyncedAt && (
        <p className="mt-2 text-right text-xs text-slate-400">
          更新於 {profile.lastSyncedAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
        </p>
      )}
    </div>
  );
}
