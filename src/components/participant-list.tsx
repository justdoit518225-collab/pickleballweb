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
    <div className="bg-[var(--surface)] p-6" data-ui>
      <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
        <h3 className="text-lg font-extrabold text-brand-navy">參與名單</h3>
        <span className="bg-brand-lime-soft px-2.5 py-1 text-xs font-extrabold text-brand-navy tabular-nums">
          {filled} / {capacity} 人
        </span>
      </div>
      {participants.length === 0 ? (
        <p className="text-sm font-medium text-[var(--muted)]">尚無人報名，成為第一位報名球友！</p>
      ) : (
        <ol className="space-y-3">
          {participants.map((p, index) => (
            <li key={p.userId} className="flex items-start gap-3">
              <span className="mt-1 w-6 shrink-0 text-xs font-extrabold text-[var(--muted)] tabular-nums">
                {index + 1}.
              </span>
              <Avatar src={p.avatarUrl} name={p.displayName} size="sm" />
              <div className="min-w-0">
                <span className="text-sm font-bold text-brand-navy">
                  {p.displayName}
                  {p.isSelf && (
                    <span className="ml-1.5 inline-block bg-brand-lime px-1.5 py-0.5 text-[10px] font-extrabold text-brand-navy">
                      我
                    </span>
                  )}
                </span>
                {p.meta && <p className="mt-0.5 text-xs text-[var(--muted)] tabular-nums">{p.meta}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
