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
    <div>
      <section className="bg-brand-navy py-10 text-white sm:py-12">
        <div className="page-wrap">
          <Link
            href={ROUTES.tenantDuprEvents(tenantSlug)}
            className="text-xs font-bold text-brand-lime hover:underline"
          >
            ← 返回 {tenant.displayName} · DUPR 列表
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={`px-2.5 py-0.5 text-xs font-extrabold ${
                scoringOpen
                  ? "bg-brand-lime text-brand-navy"
                  : "bg-brand-teal text-white"
              }`}
            >
              {DUPR_EVENT_STATUS_LABELS[event.status]}
            </span>
            <span className="text-xs font-bold text-white/80 tabular-nums">
              {formatTaipeiDateTime(event.startAt)}
              {event.location ? ` · ${event.location}` : ""}
              {` · ${event.players.length} 人`}
            </span>
          </div>
          <h1 className="type-head mt-3 text-white">{event.title}</h1>
        </div>
      </section>

      <div className="page-wrap py-10" data-ui>
        <div className="space-y-6">
          {event.status === "DRAFT" || event.matches.length === 0 ? (
            <div className="bg-[var(--surface)] p-8 text-center">
              <p className="text-base font-semibold text-[var(--muted)]">
                負責人尚未產生對戰表
              </p>
            </div>
          ) : (
            <>
              {!canScore && scoringOpen && (
                <ScoringPinForm action={enterScoringPin.bind(null, tenantSlug, event.id)} />
              )}
              {!scoringOpen && (
                <p className="bg-brand-lime-soft px-5 py-3.5 text-sm font-bold text-brand-navy">
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
    </div>
  );
}
