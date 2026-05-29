import { Avatar } from "@/components/ui/avatar";

export type Participant = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isSelf?: boolean;
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
        <ul className="space-y-2">
          {participants.map((p) => (
            <li key={p.userId} className="flex items-center gap-3">
              <Avatar src={p.avatarUrl} name={p.displayName} size="sm" />
              <span className="text-sm text-slate-700">
                {p.displayName}
                {p.isSelf && (
                  <span className="ml-1 text-xs text-brand-teal">（我）</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
