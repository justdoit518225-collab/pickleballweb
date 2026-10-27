"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock, RefreshCw, Repeat, Star } from "lucide-react";
import type { ScoringResult } from "@/app/t/[tenantSlug]/(main)/dupr/actions";

export type BoardPlayer = { seq: number; name: string };

export type BoardMatch = {
  id: string;
  seq: number;
  round: number;
  court: number;
  teamA: [number, number];
  teamB: [number, number];
  scoreA: number | null;
  scoreB: number | null;
  confirmedSeqs: number[];
  confirmed: boolean;
};

type Draft = { a: string; b: string };

const REFRESH_MS = 8000;

export function DuprScoringBoard({
  players,
  matches,
  myPlayerSeq = null,
  canScore,
  scoringOpen,
  submitScore,
  setConfirmation,
}: {
  players: BoardPlayer[];
  matches: BoardMatch[];
  myPlayerSeq?: number | null;
  canScore: boolean;
  scoringOpen: boolean;
  submitScore: (matchId: string, scoreA: number, scoreB: number) => Promise<ScoringResult>;
  setConfirmation: (matchId: string, playerSeq: number, confirmed: boolean) => Promise<ScoringResult>;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [court, setCourt] = useState<number | "all">("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [hideDone, setHideDone] = useState(false);
  const currentRef = useRef<HTMLElement | null>(null);

  const names = useMemo(() => new Map(players.map((p) => [p.seq, p.name])), [players]);
  const courts = useMemo(() => [...new Set(matches.map((m) => m.court))].sort((a, b) => a - b), [matches]);
  const multiCourt = courts.length > 1;
  const hasDrafts = Object.keys(drafts).length > 0;

  const isPlayerInMatch = (m: BoardMatch, seq: number | null) =>
    seq != null && (m.teamA.includes(seq) || m.teamB.includes(seq));

  const myMatches = useMemo(
    () => (myPlayerSeq != null ? matches.filter((m) => isPlayerInMatch(m, myPlayerSeq)) : []),
    [matches, myPlayerSeq],
  );
  const myDoneCount = myMatches.filter((m) => m.confirmed || (m.scoreA != null && m.scoreB != null)).length;

  const visible = matches.filter(
    (m) =>
      (court === "all" || m.court === court) &&
      (!onlyMine || isPlayerInMatch(m, myPlayerSeq)) &&
      (!hideDone || !m.confirmed),
  );
  const currentId =
    visible.find((m) => isPlayerInMatch(m, myPlayerSeq) && !m.confirmed)?.id ??
    visible.find((m) => !m.confirmed)?.id;
  const doneCount = matches.filter((m) => m.confirmed).length;

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const active = document.activeElement;
      const typing = active instanceof HTMLInputElement;
      if (document.visibilityState === "visible" && !typing && !busyId && !hasDrafts) {
        router.refresh();
      }
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router, busyId, hasDrafts]);

  function setDraft(m: BoardMatch, side: "a" | "b", value: string) {
    if (!/^\d{0,2}$/.test(value)) return;
    setDrafts((prev) => {
      const base = prev[m.id] ?? { a: m.scoreA?.toString() ?? "", b: m.scoreB?.toString() ?? "" };
      return { ...prev, [m.id]: { ...base, [side]: value } };
    });
  }

  function clearDraft(id: string) {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function run(matchId: string, fn: () => Promise<ScoringResult>, onOk?: () => void) {
    setBusyId(matchId);
    setErrors((prev) => ({ ...prev, [matchId]: "" }));
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.ok) onOk?.();
        else setErrors((prev) => ({ ...prev, [matchId]: res.error }));
      } catch {
        setErrors((prev) => ({ ...prev, [matchId]: "連線失敗，請再試一次" }));
      } finally {
        setBusyId(null);
      }
    });
  }

  function saveScore(m: BoardMatch) {
    const d = drafts[m.id];
    if (!d || d.a === "" || d.b === "") {
      setErrors((prev) => ({ ...prev, [m.id]: "請填入雙方分數" }));
      return;
    }
    if (m.confirmedSeqs.length > 0 && !confirm("修改分數後，已確認的球員需要重新確認。確定修改？")) return;
    run(m.id, () => submitScore(m.id, Number(d.a), Number(d.b)), () => clearDraft(m.id));
  }

  const teamNames = (t: [number, number]) => t.map((s) => ({ seq: s, name: names.get(s) ?? `#${s}` }));

  return (
    <div className="space-y-5" data-ui>
      {myPlayerSeq != null && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-l-[6px] border-brand-lime bg-brand-navy px-5 py-4 text-white">
          <div>
            <p className="text-[14px] font-bold text-brand-lime">你的今日參賽資訊</p>
            <p className="mt-0.5 text-[20px] font-black text-white">
              編號 #{myPlayerSeq} {names.get(myPlayerSeq)} · 共 {myMatches.length} 場比賽（已填分 {myDoneCount}/{myMatches.length} 場）
            </p>
            <p className="mt-1 text-[14px] text-[#C8D8E4]">
              標示「你的場次」的比賽結束後，你可直接於下方輸入該場比分並確認。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOnlyMine((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-black transition-colors ${
                onlyMine
                  ? "bg-brand-lime text-brand-navy"
                  : "bg-[#163560] text-white hover:bg-brand-teal"
              }`}
            >
              <Star className="h-4 w-4 fill-current" />
              {onlyMine ? `顯示全部場次 (${matches.length})` : `只看我的場次 (${myMatches.length})`}
            </button>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 space-y-3 bg-brand-navy p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-bold text-white tabular-nums">
            已確認 <b className="text-brand-lime">{doneCount}</b> / {matches.length} 場
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {myPlayerSeq != null && (
              <label className="flex cursor-pointer items-center gap-1.5 text-sm font-bold text-brand-lime">
                <input
                  type="checkbox"
                  checked={onlyMine}
                  onChange={(e) => setOnlyMine(e.target.checked)}
                  className="h-4 w-4 accent-brand-lime"
                />
                只看我的場次
              </label>
            )}
            <label className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-white/90">
              <input
                type="checkbox"
                checked={hideDone}
                onChange={(e) => setHideDone(e.target.checked)}
                className="h-4 w-4 accent-brand-lime"
              />
              隱藏已完成
            </label>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 text-sm font-bold text-brand-navy hover:bg-brand-lime"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              更新比分
            </button>
          </div>
        </div>
        {multiCourt && (
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...courts] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCourt(c)}
                className={`px-3.5 py-1.5 text-sm font-bold ${
                  court === c
                    ? "bg-brand-lime text-brand-navy"
                    : "bg-[#163560] text-white hover:bg-brand-teal"
                }`}
              >
                {c === "all" ? "全部場地" : `${c} 號場`}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 && (
        <div className="bg-white p-8 text-center">
          <p className="text-base font-semibold text-[var(--muted)]">沒有符合篩選條件的場次</p>
        </div>
      )}

      {visible.map((m) => {
        const idx = matches.findIndex((x) => x.id === m.id);
        const prev = !multiCourt && idx > 0 ? matches[idx - 1] : undefined;
        const prevSeqs = prev ? [...prev.teamA, ...prev.teamB] : [];
        const carry = [...m.teamA, ...m.teamB].filter((s) => prevSeqs.includes(s));
        const draft = drafts[m.id];
        const shownA = draft?.a ?? m.scoreA?.toString() ?? "";
        const shownB = draft?.b ?? m.scoreB?.toString() ?? "";
        const scored = m.scoreA != null && m.scoreB != null;
        const dirty =
          Boolean(draft) &&
          (draft.a !== (m.scoreA?.toString() ?? "") || draft.b !== (m.scoreB?.toString() ?? ""));
        const busy = busyId === m.id;
        const isCurrent = m.id === currentId;
        const isMine = isPlayerInMatch(m, myPlayerSeq);
        const matchEditable = scoringOpen && (canScore || isMine);
        const locked = m.confirmed || !matchEditable;

        return (
          <article
            key={m.id}
            ref={isCurrent ? currentRef : undefined}
            className={`bg-white ${isMine ? "border-l-[6px] border-brand-lime" : ""}`}
          >
            <header
              className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 ${
                m.confirmed
                  ? "bg-[#1B6B73] text-white"
                  : isMine
                    ? "bg-brand-navy text-white"
                    : isCurrent
                      ? "bg-[#163560] text-white"
                      : "bg-[var(--surface-alt)] text-brand-navy"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base font-extrabold tabular-nums">
                  第 {m.seq} 場
                  {multiCourt && (
                    <span className="ml-2 text-sm font-semibold opacity-85">
                      第 {m.round} 輪 · {m.court} 號場
                    </span>
                  )}
                </h3>
                {isMine && (
                  <span className="inline-flex items-center gap-1 bg-brand-lime px-2.5 py-0.5 text-xs font-black text-brand-navy">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    你的場次
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {m.confirmed ? (
                  <span className="inline-flex items-center gap-1 bg-brand-lime px-2.5 py-0.5 text-xs font-extrabold text-brand-navy">
                    <Lock className="h-3.5 w-3.5" />
                    四人已確認
                  </span>
                ) : scored ? (
                  <span className="bg-amber-200 px-2.5 py-0.5 text-xs font-extrabold text-brand-navy tabular-nums">
                    待確認 {m.confirmedSeqs.length}/4
                  </span>
                ) : isCurrent ? (
                  <span className="bg-brand-lime px-2.5 py-0.5 text-xs font-extrabold text-brand-navy">
                    進行中
                  </span>
                ) : null}
              </div>
            </header>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <TeamBox
                  color="teal"
                  label="隊伍 A"
                  members={teamNames(m.teamA)}
                  myPlayerSeq={myPlayerSeq}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <ScoreInput
                      value={shownA}
                      disabled={locked || busy}
                      onChange={(v) => setDraft(m, "a", v)}
                      label={`第 ${m.seq} 場 隊伍 A 分數`}
                    />
                    <span className="text-xl font-black text-[var(--muted)]">:</span>
                    <ScoreInput
                      value={shownB}
                      disabled={locked || busy}
                      onChange={(v) => setDraft(m, "b", v)}
                      label={`第 ${m.seq} 場 隊伍 B 分數`}
                    />
                  </div>
                  {matchEditable && !m.confirmed && (dirty || !scored) && (
                    <button
                      type="button"
                      disabled={busy || !dirty}
                      onClick={() => saveScore(m)}
                      className="btn-brand w-full px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                    >
                      {busy ? (
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                      ) : scored ? (
                        "更新分數"
                      ) : (
                        "送出分數"
                      )}
                    </button>
                  )}
                  {!matchEditable && scoringOpen && !m.confirmed && !scored && (
                    <span className="text-[12px] font-bold text-[var(--muted)]">
                      由本場參賽球員輸入
                    </span>
                  )}
                </div>
                <TeamBox
                  color="navy"
                  label="隊伍 B"
                  members={teamNames(m.teamB)}
                  myPlayerSeq={myPlayerSeq}
                />
              </div>

              {scored && !dirty && (
                <div className="bg-[var(--bg)] p-4">
                  <p className="mb-2.5 text-sm font-bold text-brand-navy">
                    {m.confirmed
                      ? "四位球員皆已確認比分"
                      : "請本場四位參賽球員點選自己的名字確認比分"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[...m.teamA, ...m.teamB].map((seq) => {
                      const ok = m.confirmedSeqs.includes(seq);
                      const isSelf = seq === myPlayerSeq;
                      return (
                        <button
                          key={seq}
                          type="button"
                          disabled={!matchEditable || busy || m.confirmed}
                          onClick={() => run(m.id, () => setConfirmation(m.id, seq, !ok))}
                          className={`flex min-h-12 items-center justify-center gap-1.5 px-3 py-2 text-sm font-extrabold transition ${
                            ok
                              ? "bg-[#1B6B73] text-white"
                              : isSelf
                                ? "bg-brand-lime text-brand-navy hover:bg-[#9BD35A]"
                                : "bg-white text-brand-navy hover:bg-brand-lime"
                          } disabled:cursor-default`}
                        >
                          {ok && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                          <span className="truncate tabular-nums">
                            {seq}. {names.get(seq)}
                            {isSelf ? " (你)" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {errors[m.id] && (
                <p className="bg-[#FCECE9] px-3 py-2 text-sm font-bold text-[#B42318]">
                  {errors[m.id]}
                </p>
              )}

              {carry.length > 0 && (
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)]">
                  <Repeat className="h-4 w-4 text-[#1D6D75]" />
                  連打：{carry.map((s) => `${s}.${names.get(s) ?? ""}`).join("、")}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TeamBox({
  color,
  label,
  members,
  myPlayerSeq,
}: {
  color: "teal" | "navy";
  label: string;
  members: { seq: number; name: string }[];
  myPlayerSeq: number | null;
}) {
  const tone =
    color === "teal"
      ? "bg-[#e3ecec] text-[#1D6D75]"
      : "bg-[var(--surface-alt)] text-brand-navy";
  return (
    <div className={`min-w-0 p-3 text-center ${tone}`}>
      <p className="text-xs font-extrabold">{label}</p>
      {members.map((p) => {
        const isMe = myPlayerSeq != null && p.seq === myPlayerSeq;
        return (
          <p
            key={p.seq}
            className={`mt-1.5 break-words px-2 py-1 text-base font-extrabold leading-snug ${
              isMe ? "bg-brand-lime text-brand-navy" : "text-brand-navy"
            }`}
          >
            <span className="mr-1 text-sm tabular-nums opacity-75">
              #{p.seq}
            </span>
            {p.name}
            {isMe && <span className="ml-1 text-xs font-black">（你）</span>}
          </p>
        );
      })}
    </div>
  );
}

function ScoreInput({
  value,
  disabled,
  onChange,
  label,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="-"
      aria-label={label}
      className="h-14 w-14 bg-[var(--bg)] text-center text-2xl font-black text-brand-navy tabular-nums outline-none focus:outline-2 focus:outline-brand-teal disabled:opacity-60"
    />
  );
}
