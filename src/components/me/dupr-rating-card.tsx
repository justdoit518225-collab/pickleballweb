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
    <div className="bg-brand-navy p-5 text-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-lg font-extrabold text-white">
          {profile.duprName ?? "DUPR 認證球員"}
        </p>
        <p className="bg-brand-lime px-2.5 py-0.5 text-xs font-extrabold text-brand-navy tabular-nums">
          DUPR ID {profile.duprId}
        </p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-[#163560] px-4 py-3 text-center">
          <dd className="text-2xl font-black text-brand-lime tabular-nums">
            {formatRating(profile.doublesRating)}
          </dd>
          <dt className="mt-1 text-xs font-bold text-white/80">雙打積分</dt>
        </div>
        <div className="bg-[#163560] px-4 py-3 text-center">
          <dd className="text-2xl font-black text-[#4CC9D4] tabular-nums">
            {formatRating(profile.singlesRating)}
          </dd>
          <dt className="mt-1 text-xs font-bold text-white/80">單打積分</dt>
        </div>
      </dl>
      {profile.lastSyncedAt && (
        <p className="mt-3 text-right text-xs text-white/70 tabular-nums">
          更新於 {profile.lastSyncedAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
        </p>
      )}
    </div>
  );
}
