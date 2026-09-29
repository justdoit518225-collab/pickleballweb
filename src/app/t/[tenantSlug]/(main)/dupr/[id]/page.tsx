import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  enterScoringPin,
  setPlayerConfirmation,
  submitMatchScore,
} from "@/app/t/[tenantSlug]/(main)/dupr/actions";
import { DuprScoringBoard } from "@/components/dupr/dupr-scoring-board";
import { ScoringPinForm } from "@/components/dupr/scoring-pin-form";
import { ROUTES } from "@/lib/constants";
import { DUPR_EVENT_STATUS_LABELS, getTenantDuprEvent } from "@/lib/dupr-event";
import { canScoreEvent } from "@/lib/dupr-scoring-access";
import { formatTaipeiDateTime } from "@/lib/format-datetime";
import { getTenantBySlug } from "@/lib/tenant";

export const metadata: Metadata = { title: "DUPR 計分" };

export default async function DuprScoringPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  const event = await getTenantDuprEvent(tenant.id, id);
  if (!event) notFound();

  const canScore = await canScoreEvent(event);
  const scoringOpen = event.status === "SCHEDULED";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href={ROUTES.tenantDuprEvents(tenantSlug)} className="text-sm text-emerald-600">
        ← {tenant.displayName} · DUPR 計分
      </Link>
      <header className="mt-3">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{event.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {formatTaipeiDateTime(event.startAt)}
          {event.location ? ` · ${event.location}` : ""}
          {` · ${event.players.length} 人 · `}
          <span className={scoringOpen ? "text-amber-700" : "text-emerald-700"}>
            {DUPR_EVENT_STATUS_LABELS[event.status]}
          </span>
        </p>
      </header>

      <div className="mt-5 space-y-5">
        {event.status === "DRAFT" || event.matches.length === 0 ? (
          <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
            負責人尚未產生對戰表
          </p>
        ) : (
          <>
            {!canScore && scoringOpen && (
              <ScoringPinForm action={enterScoringPin.bind(null, tenantSlug, event.id)} />
            )}
            {!scoringOpen && (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                本場比分已由負責人最終確認，無法再修改。
              </p>
            )}
            <DuprScoringBoard
              players={event.players.map((p) => ({ seq: p.seq, name: p.name }))}
              matches={event.matches.map((m) => ({
                id: m.id,
                seq: m.seq,
                round: m.round,
                court: m.court,
                teamA: [m.teamA1, m.teamA2],
                teamB: [m.teamB1, m.teamB2],
                scoreA: m.scoreA,
                scoreB: m.scoreB,
                confirmedSeqs: m.confirmations.map((c) => c.playerSeq),
                confirmed: Boolean(m.confirmedAt),
              }))}
              canScore={canScore}
              scoringOpen={scoringOpen}
              submitScore={submitMatchScore.bind(null, tenantSlug, event.id)}
              setConfirmation={setPlayerConfirmation.bind(null, tenantSlug, event.id)}
            />
          </>
        )}
      </div>
    </div>
  );
}
