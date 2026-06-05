import { Avatar } from "@/components/ui/avatar";

export type Participant = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isSelf?: boolean;
  /** 副標：時段、球拍等 */
  meta?: string | null;
};

export function ParticipantList({
  participants,
  capacity,
  headCount,
}: {
  participants: Participant[];
  capacity: number;
  /** 已佔名額總人數；未傳則以名單筆數計 */
  headCount?: number;
}) {
  const filled = headCount ?? participants.length;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">參與名單</h3>
        <span className="text-sm text-slate-500">
          {filled} / {capacity}
        </span>
      </div>
      {participants.length === 0 ? (
        <p className="text-sm text-slate-500">尚無人報名</p>
      ) : (
        <ol className="space-y-3">
          {participants.map((p, index) => (
            <li key={p.userId} className="flex items-start gap-3">
              <span className="mt-1 w-5 shrink-0 text-xs font-medium text-slate-400">
                {index + 1}.
              </span>
              <Avatar src={p.avatarUrl} name={p.displayName} size="sm" />
              <div className="min-w-0">
                <span className="text-sm font-medium text-slate-800">
                  {p.displayName}
                  {p.isSelf && (
                    <span className="ml-1 text-xs font-normal text-brand-teal">（我）</span>
                  )}
                </span>
                {p.meta && <p className="text-xs text-slate-500">{p.meta}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
