"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock, RefreshCw, Repeat } from "lucide-react";
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
  canScore,
  scoringOpen,
  submitScore,
  setConfirmation,
}: {
  players: BoardPlayer[];
  matches: BoardMatch[];
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
  const [hideDone, setHideDone] = useState(false);
  const currentRef = useRef<HTMLElement | null>(null);

  const names = useMemo(() => new Map(players.map((p) => [p.seq, p.name])), [players]);
  const courts = useMemo(() => [...new Set(matches.map((m) => m.court))].sort((a, b) => a - b), [matches]);
  const multiCourt = courts.length > 1;
  const editable = canScore && scoringOpen;
  const hasDrafts = Object.keys(drafts).length > 0;

  const visible = matches.filter(
    (m) => (court === "all" || m.court === court) && (!hideDone || !m.confirmed),
  );
  const currentId = visible.find((m) => !m.confirmed)?.id;
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
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 space-y-2 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            已確認 <b className="text-emerald-700">{doneCount}</b> / {matches.length} 場
          </p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="h-4 w-4" />
              隱藏已完成
            </label>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              更新
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
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  court === c ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {c === "all" ? "全部場地" : `${c} 號場`}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 && <p className="py-8 text-center text-sm text-slate-500">沒有符合的場次</p>}

      {visible.map((m) => {
        const idx = matches.findIndex((x) => x.id === m.id);
        const prev = !multiCourt && idx > 0 ? matches[idx - 1] : undefined;
        const prevSeqs = prev ? [...prev.teamA, ...prev.teamB] : [];
        const carry = [...m.teamA, ...m.teamB].filter((s) => prevSeqs.includes(s));
        const draft = drafts[m.id];
        const shownA = draft?.a ?? m.scoreA?.toString() ?? "";
        const shownB = draft?.b ?? m.scoreB?.toString() ?? "";
        const scored = m.scoreA != null && m.scoreB != null;
        const dirty = Boolean(draft) && (draft.a !== (m.scoreA?.toString() ?? "") || draft.b !== (m.scoreB?.toString() ?? ""));
        const busy = busyId === m.id;
        const isCurrent = m.id === currentId;
        const locked = m.confirmed || !editable;

        return (
          <article
            key={m.id}
            ref={isCurrent ? currentRef : undefined}
            className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
              m.confirmed
                ? "border-emerald-300 ring-1 ring-emerald-100"
                : isCurrent
                  ? "border-indigo-400 ring-2 ring-indigo-200"
                  : "border-slate-200"
            }`}
          >
            <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
              <h3 className="font-bold text-slate-800">
                第 {String(m.seq).padStart(2, "0")} 場
                {multiCourt && (
                  <span className="ml-2 text-sm font-medium text-slate-500">
                    第 {m.round} 輪 · {m.court} 號場
                  </span>
                )}
              </h3>
              {m.confirmed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <Lock className="h-3.5 w-3.5" />
                  四人已確認
                </span>
              ) : scored ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  待確認 {m.confirmedSeqs.length}/4
                </span>
              ) : isCurrent ? (
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  進行中
                </span>
              ) : null}
            </header>

            <div className="space-y-3 p-4">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <TeamBox color="sky" label="隊伍 A" members={teamNames(m.teamA)} />
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <ScoreInput
                      value={shownA}
                      disabled={locked || busy}
                      onChange={(v) => setDraft(m, "a", v)}
                      label={`第 ${m.seq} 場 隊伍 A 分數`}
                      color="sky"
                    />
                    <span className="text-lg font-bold text-slate-400">:</span>
                    <ScoreInput
                      value={shownB}
                      disabled={locked || busy}
                      onChange={(v) => setDraft(m, "b", v)}
                      label={`第 ${m.seq} 場 隊伍 B 分數`}
                      color="orange"
                    />
                  </div>
                  {editable && !m.confirmed && (dirty || !scored) && (
                    <button
                      type="button"
                      disabled={busy || !dirty}
                      onClick={() => saveScore(m)}
                      className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
                    >
                      {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : scored ? "更新分數" : "送出分數"}
                    </button>
                  )}
                </div>
                <TeamBox color="orange" label="隊伍 B" members={teamNames(m.teamB)} />
              </div>

              {scored && !dirty && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    {m.confirmed ? "四位球員皆已確認比分" : "請四位球員各自點自己的名字確認比分"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[...m.teamA, ...m.teamB].map((seq) => {
                      const ok = m.confirmedSeqs.includes(seq);
                      return (
                        <button
                          key={seq}
                          type="button"
                          disabled={!editable || busy || m.confirmed}
                          onClick={() => run(m.id, () => setConfirmation(m.id, seq, !ok))}
                          className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold transition ${
                            ok
                              ? "bg-emerald-600 text-white"
                              : "bg-white text-slate-700 ring-1 ring-slate-300 hover:ring-emerald-400"
                          } disabled:cursor-default`}
                        >
                          {ok && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                          <span className="truncate">
                            {seq}. {names.get(seq)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {errors[m.id] && <p className="text-sm text-red-600">{errors[m.id]}</p>}

              {carry.length > 0 && (
                <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Repeat className="h-3.5 w-3.5 text-indigo-500" />
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
}: {
  color: "sky" | "orange";
  label: string;
  members: { seq: number; name: string }[];
}) {
  const tone =
    color === "sky" ? "bg-sky-50 ring-sky-200 text-sky-700" : "bg-orange-50 ring-orange-200 text-orange-700";
  return (
    <div className={`min-w-0 rounded-xl px-2 py-2.5 text-center ring-1 ${tone}`}>
      <p className="text-[11px] font-semibold tracking-wide">{label}</p>
      {members.map((p) => (
        <p key={p.seq} className="mt-1 break-words text-base font-bold leading-snug text-slate-900">
          <span className="mr-1 text-sm text-slate-400">{p.seq}</span>
          {p.name}
        </p>
      ))}
    </div>
  );
}

function ScoreInput({
  value,
  disabled,
  onChange,
  label,
  color,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  label: string;
  color: "sky" | "orange";
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
      className={`h-14 w-14 rounded-xl border bg-white text-center text-2xl font-bold tabular-nums text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-100 disabled:text-slate-700 ${
        color === "sky" ? "border-sky-300" : "border-orange-300"
      }`}
    />
  );
}
