import Link from "next/link";
import type {
  BoardCourtSection,
  BoardDropInBlock,
  BoardRentalBlock,
} from "@/lib/day-board";
import { ROUTES } from "@/lib/constants";

function DropInBlock({ block }: { block: BoardDropInBlock }) {
  return (
    <div className="rounded-lg border border-brand-teal/30 bg-brand-lime-soft/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-brand-navy">
          臨打 · {block.windowLabel}
        </p>
        <span className="text-xs text-slate-600">
          {block.headCount}/{block.capacity} 人
        </span>
      </div>
      {block.title && block.title !== "球敘" && (
        <p className="mt-0.5 text-xs text-slate-500">{block.title}</p>
      )}
      <ol className="mt-3 space-y-2">
        {block.entries.length === 0 ? (
          <>
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className="text-sm text-slate-400">
                {n}.（空）
              </li>
            ))}
          </>
        ) : (
          <>
            {block.entries.map((e) => (
              <li key={e.index} className="text-sm text-slate-800">
                <span className="font-medium">
                  {e.index}. {e.displayName}
                </span>
                {e.meta && <span className="ml-1 text-slate-500">{e.meta}</span>}
              </li>
            ))}
            {block.headCount < block.capacity &&
              Array.from({ length: Math.min(4, block.capacity - block.entries.length) }).map(
                (_, i) => (
                  <li key={`empty-${i}`} className="text-sm text-slate-400">
                    {block.entries.length + i + 1}.（空）
                  </li>
                ),
              )}
          </>
        )}
      </ol>
      <Link
        href={block.activityHref}
        className="mt-2 inline-block text-xs font-medium text-brand-navy underline"
      >
        前往報名 →
      </Link>
    </div>
  );
}

function RentalBlock({ block }: { block: BoardRentalBlock }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-800">租場 · {block.windowLabel}</p>
      {block.status === "BOOKED" && block.renterName ? (
        <p className="mt-2 text-sm text-slate-700">
          1. {block.renterName}
          {block.racketLabel && (
            <span className="ml-1 text-slate-500">{block.racketLabel}</span>
          )}
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-400">（可預約）</p>
      )}
    </div>
  );
}

export function DayBoardView({
  tenantSlug,
  dateLabel,
  courts,
}: {
  tenantSlug: string;
  dateLabel: string;
  courts: BoardCourtSection[];
}) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">{dateLabel}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">當日球敘看板</h1>
        <p className="mt-2 text-sm text-slate-600">
          臨打名單與租場狀態，取代社群貼文手動登記。
        </p>
      </header>

      {courts.length === 0 ? (
        <p className="text-sm text-slate-500">此日尚無球場時段，請至管理後台建立活動或租借時段。</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {courts.map((court) => (
            <section
              key={court.courtId}
              className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-sm"
            >
              <div className="bg-gradient-to-r from-brand-navy to-brand-teal px-4 py-3">
                <h2 className="text-lg font-bold text-white">{court.courtName}</h2>
                <p className="text-xs text-white/80">{court.venueName}</p>
              </div>
              <div className="space-y-3 p-4">
                {court.blocks.length === 0 ? (
                  <p className="text-sm text-slate-400">本日無時段</p>
                ) : (
                  court.blocks.map((block) =>
                    block.kind === "drop-in" ? (
                      <DropInBlock key={block.id} block={block} />
                    ) : (
                      <RentalBlock key={block.id} block={block} />
                    ),
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-sm text-slate-500">
        <Link href={ROUTES.tenant(tenantSlug)} className="text-brand-navy hover:underline">
          ← 返回場館首頁
        </Link>
      </p>
    </div>
  );
}
