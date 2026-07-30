"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Coffee,
  Eraser,
  ImagePlus,
  Loader2,
  Lock,
  Sparkles,
  Swords,
  Unlock,
  Users,
} from "lucide-react";
import {
  SAMPLE_NAMES,
  getScheduleTemplates,
  type MatchTemplate,
} from "@/lib/doubles-schedule";
import { parseLineQueueText } from "@/lib/parse-line-queue";

const SLOT_COUNT = 8;

type MatchScore = {
  scoreA: string;
  scoreB: string;
  locked: boolean;
};

type Step = "register" | "schedule";

function emptyScores(count: number): MatchScore[] {
  return Array.from({ length: count }, () => ({
    scoreA: "",
    scoreB: "",
    locked: false,
  }));
}

function fillSlotsFromNames(parsed: string[]): string[] {
  const next = Array(SLOT_COUNT).fill("");
  parsed.slice(0, SLOT_COUNT).forEach((name, i) => {
    next[i] = name;
  });
  return next;
}

export function DoublesSchedulerApp() {
  const [step, setStep] = useState<Step>("register");
  const [names, setNames] = useState<string[]>(() => Array(SLOT_COUNT).fill(""));
  const [scoresByCount, setScoresByCount] = useState<Record<number, MatchScore[]>>(
    {},
  );

  const [generating, setGenerating] = useState(false);

  const players = useMemo(
    () => names.map((n) => n.trim()).filter(Boolean),
    [names],
  );
  const playerCount = players.length;
  const canStart = playerCount >= 4 && playerCount <= 8;

  const templates = useMemo(
    () => (canStart ? getScheduleTemplates(playerCount) : []),
    [canStart, playerCount],
  );

  const scores = scoresByCount[playerCount] ?? emptyScores(templates.length);

  function ensureScores(count: number, matchCount: number) {
    setScoresByCount((prev) => {
      const existing = prev[count];
      if (existing && existing.length === matchCount) return prev;
      const next = emptyScores(matchCount);
      if (existing) {
        for (let i = 0; i < Math.min(existing.length, matchCount); i++) {
          next[i] = existing[i];
        }
      }
      return { ...prev, [count]: next };
    });
  }

  function updateName(index: number, value: string) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function clearNames() {
    setNames(Array(SLOT_COUNT).fill(""));
  }

  function fillSample() {
    setNames([...SAMPLE_NAMES]);
  }

  function applyParsedNames(parsed: string[]) {
    setNames(fillSlotsFromNames(parsed));
  }

  async function goToSchedule() {
    if (!canStart || generating) return;
    setGenerating(true);
    ensureScores(playerCount, templates.length);

    try {
      await fetch("/api/doubles-scheduler/save-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: players }),
      });
    } catch {
      // 背景存檔失敗不影響進入賽程
    } finally {
      setGenerating(false);
      setStep("schedule");
    }
  }

  function updateScore(matchIndex: number, side: "scoreA" | "scoreB", value: string) {
    if (!/^\d{0,2}$/.test(value)) return;
    setScoresByCount((prev) => {
      const list = [...(prev[playerCount] ?? emptyScores(templates.length))];
      list[matchIndex] = { ...list[matchIndex], [side]: value };
      return { ...prev, [playerCount]: list };
    });
  }

  function toggleLock(matchIndex: number) {
    setScoresByCount((prev) => {
      const list = [...(prev[playerCount] ?? emptyScores(templates.length))];
      list[matchIndex] = {
        ...list[matchIndex],
        locked: !list[matchIndex].locked,
      };
      return { ...prev, [playerCount]: list };
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-8">
      {step === "register" ? (
        <RegisterStep
          names={names}
          playerCount={playerCount}
          canStart={canStart}
          onNameChange={updateName}
          onClear={clearNames}
          onSample={fillSample}
          onApplyParsedNames={applyParsedNames}
          onStart={() => void goToSchedule()}
          generating={generating}
        />
      ) : (
        <ScheduleStep
          players={players}
          templates={templates}
          scores={scores}
          onBack={() => setStep("register")}
          onScoreChange={updateScore}
          onToggleLock={toggleLock}
        />
      )}
    </div>
  );
}

function RegisterStep({
  names,
  playerCount,
  canStart,
  onNameChange,
  onClear,
  onSample,
  onApplyParsedNames,
  onStart,
  generating,
}: {
  names: string[];
  playerCount: number;
  canStart: boolean;
  onNameChange: (index: number, value: string) => void;
  onClear: () => void;
  onSample: () => void;
  onApplyParsedNames: (parsed: string[]) => void;
  onStart: () => void;
  generating: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);

  async function handlePhotoSelected(file: File | null) {
    if (!file) return;
    setOcrBusy(true);
    setOcrProgress(0);
    setOcrMessage("正在辨識 Line 接龍…（首次可能需下載字型）");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("chi_tra+eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const {
        data: { text },
      } = await worker.recognize(file);
      await worker.terminate();

      const parsed = parseLineQueueText(text, SLOT_COUNT);
      if (parsed.length === 0) {
        setOcrMessage("辨識不到編號名單（例如 1. 建伸）。請換較清楚的截圖，或手動填寫。");
        return;
      }

      onApplyParsedNames(parsed);
      setOcrMessage(`已填入 ${parsed.length} 位球員，可再手動微調後按「產生賽程」。`);
    } catch (e) {
      console.error(e);
      setOcrMessage("相片辨識失敗，請再試一次或改手動輸入。");
    } finally {
      setOcrBusy(false);
      setOcrProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <ClipboardList className="h-3.5 w-3.5" />
          報名設定
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          匹克球動態雙打賽程產生器
        </h1>
        <p className="text-sm text-slate-600">
          輸入 4～8 位球員，或上傳 Line 接龍截圖自動填入名單。
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handlePhotoSelected(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={ocrBusy}
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-70"
        >
          {ocrBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              辨識中 {ocrProgress > 0 ? `${ocrProgress}%` : "…"}
            </>
          ) : (
            <>
              <ImagePlus className="h-4 w-4" />
              選相片讀取 Line 接龍
            </>
          )}
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">
          請截取含「1. 姓名、2. 姓名…」的接龍畫面
        </p>
        {ocrMessage && (
          <p
            className={`mt-2 text-center text-xs ${
              ocrMessage.includes("失敗") || ocrMessage.includes("不到")
                ? "text-amber-700"
                : "text-emerald-700"
            }`}
          >
            {ocrMessage}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-lime-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Users className="h-4 w-4 text-emerald-600" />
          目前人數：
          <span className="text-lg font-bold text-emerald-700">{playerCount}</span>
          <span className="text-slate-500">人</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <Eraser className="h-3.5 w-3.5" />
            清空
          </button>
          <button
            type="button"
            onClick={onSample}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            測試範例
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {names.map((name, i) => (
          <label key={i} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              球員 #{i + 1}
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(i, e.target.value)}
              placeholder={`球員 #${i + 1}`}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-emerald-500/30 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2"
              autoComplete="off"
            />
          </label>
        ))}
      </div>

      <div className="sticky bottom-4 space-y-2">
        {!canStart && (
          <p className="text-center text-sm text-amber-700">至少需 4 位球員</p>
        )}
        <button
          type="button"
          disabled={!canStart || generating}
          onClick={onStart}
          className="w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 transition enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {generating ? "處理中…" : "產生賽程"}
        </button>
      </div>
    </div>
  );
}

function ScheduleStep({
  players,
  templates,
  scores,
  onBack,
  onScoreChange,
  onToggleLock,
}: {
  players: string[];
  templates: MatchTemplate[];
  scores: MatchScore[];
  onBack: () => void;
  onScoreChange: (matchIndex: number, side: "scoreA" | "scoreB", value: string) => void;
  onToggleLock: (matchIndex: number) => void;
}) {
  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回修改名單
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">賽程表</p>
          <p className="mt-1 text-sm text-slate-600">
            總人數：{players.length} 人 / 共 {templates.length} 場賽事
          </p>
        </div>
      </header>

      <div className="space-y-4">
        {templates.map((match, index) => (
          <MatchCard
            key={index}
            index={index}
            match={match}
            players={players}
            score={scores[index] ?? { scoreA: "", scoreB: "", locked: false }}
            onScoreChange={onScoreChange}
            onToggleLock={onToggleLock}
          />
        ))}
      </div>
    </div>
  );
}

function MatchCard({
  index,
  match,
  players,
  score,
  onScoreChange,
  onToggleLock,
}: {
  index: number;
  match: MatchTemplate;
  players: string[];
  score: MatchScore;
  onScoreChange: (matchIndex: number, side: "scoreA" | "scoreB", value: string) => void;
  onToggleLock: (matchIndex: number) => void;
}) {
  const teamA = `${players[match.teamA[0]]} / ${players[match.teamA[1]]}`;
  const teamB = `${players[match.teamB[0]]} / ${players[match.teamB[1]]}`;
  const restingNames = match.resting.map((i) => players[i]).filter(Boolean);

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
        score.locked
          ? "border-emerald-400 ring-1 ring-emerald-200"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <h3 className="text-sm font-bold text-slate-800">場次 #{index + 1}</h3>
        {score.locked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            已鎖定
          </span>
        )}
      </div>

      <div className="space-y-3 px-3 py-3 sm:px-4">
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3">
          <div className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-sky-900">
            <Swords className="h-4 w-4 shrink-0" />
            上場對戰
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
            <div className="min-w-0 rounded-lg bg-white px-2 py-2 text-center shadow-sm ring-1 ring-sky-100">
              <p className="text-[10px] font-semibold tracking-wide text-sky-600">
                隊伍 A
              </p>
              <p className="mt-1 break-words text-sm font-semibold leading-snug text-slate-900">
                {teamA}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="text-[11px] font-bold tracking-wider text-sky-700">VS</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={score.scoreA}
                  disabled={score.locked}
                  onChange={(e) => onScoreChange(index, "scoreA", e.target.value)}
                  placeholder="-"
                  className="h-11 w-11 rounded-xl border border-sky-200 bg-white text-center text-lg font-bold tabular-nums text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-500"
                  aria-label={`場次 ${index + 1} 隊伍 A 分數`}
                />
                <span className="text-sm font-semibold text-slate-400">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={score.scoreB}
                  disabled={score.locked}
                  onChange={(e) => onScoreChange(index, "scoreB", e.target.value)}
                  placeholder="-"
                  className="h-11 w-11 rounded-xl border border-orange-200 bg-white text-center text-lg font-bold tabular-nums text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-500"
                  aria-label={`場次 ${index + 1} 隊伍 B 分數`}
                />
              </div>
            </div>

            <div className="min-w-0 rounded-lg bg-white px-2 py-2 text-center shadow-sm ring-1 ring-orange-100">
              <p className="text-[10px] font-semibold tracking-wide text-orange-600">
                隊伍 B
              </p>
              <p className="mt-1 break-words text-sm font-semibold leading-snug text-slate-900">
                {teamB}
              </p>
            </div>
          </div>
        </div>

        {restingNames.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">
            <Users className="h-4 w-4 shrink-0" />
            全體上場
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-amber-900">
              <Coffee className="h-4 w-4 shrink-0" />
              輪休球員
            </div>
            <div className="flex flex-wrap gap-1.5">
              {restingNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-amber-950 shadow-sm ring-1 ring-amber-200"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={score.locked}
            onChange={() => onToggleLock(index)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="inline-flex items-center gap-1.5 font-medium">
            {score.locked ? (
              <>
                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                完成 / 鎖定比數
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5 text-slate-500" />
                完成 / 鎖定比數
              </>
            )}
          </span>
        </label>
      </div>
    </article>
  );
}
