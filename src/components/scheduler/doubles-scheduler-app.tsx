"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
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
import { preprocessLineScreenshot } from "@/lib/preprocess-line-ocr";

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
      // ignore
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
    <div className="page-wrap mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14" data-ui>
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
    setOcrMessage("正在強化截圖並辨識 Line 接龍…（首次可能需下載字型）");

    try {
      const prepared = await preprocessLineScreenshot(file);

      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("chi_tra+eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
      });

      const {
        data: { text },
      } = await worker.recognize(prepared);
      await worker.terminate();

      const parsed = parseLineQueueText(text, SLOT_COUNT);
      if (parsed.length === 0) {
        setOcrMessage(
          "辨識不到編號名單（例如 1. 建伸）。請盡量只截黃色接龍泡泡，或手動填寫。",
        );
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
      <header className="bg-brand-navy p-6 text-white sm:p-8">
        <h1 className="type-head font-extrabold text-white">
          匹克球動態雙打賽程產生器
        </h1>
        <p className="mt-2 text-base text-white/85">
          輸入 4 至 8 位球員，或上傳 LINE 接龍截圖自動填入名單。
        </p>
      </header>

      <div className="bg-white p-6">
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
          className="btn-brand-outline flex w-full items-center justify-center gap-2 bg-[var(--bg)] py-3.5 text-base font-bold text-brand-navy hover:bg-[var(--surface-alt)] disabled:opacity-60"
        >
          {ocrBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              辨識中 {ocrProgress > 0 ? `${ocrProgress}%` : "…"}
            </>
          ) : (
            <>
              <ImagePlus className="h-4 w-4" />
              選相片讀取 LINE 接龍名單
            </>
          )}
        </button>
        <p className="mt-2 text-center text-sm text-[var(--muted)]">
          請截取含「1. 姓名、2. 姓名…」的接龍泡泡（少帶背景較準）
        </p>
        {ocrMessage && (
          <p className="mt-2 text-center text-sm font-bold text-brand-navy">
            {ocrMessage}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#e3ecec] px-5 py-4">
        <div className="flex items-center gap-2 text-base font-bold text-brand-navy">
          <Users className="h-5 w-5 text-[#1D6D75]" />
          目前人數：
          <span className="text-xl font-black text-brand-navy tabular-nums">
            {playerCount}
          </span>
          <span>人</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 bg-white px-3.5 py-2 text-sm font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
          >
            <Eraser className="h-4 w-4" />
            清空
          </button>
          <button
            type="button"
            onClick={onSample}
            className="inline-flex items-center gap-1.5 bg-brand-lime px-3.5 py-2 text-sm font-extrabold text-brand-navy hover:bg-[#9ccc65]"
          >
            <Sparkles className="h-4 w-4" />
            填入測試範例
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {names.map((name, i) => (
          <label key={i} className="block bg-white p-4">
            <span className="mb-1.5 block text-sm font-bold text-brand-navy tabular-nums">
              球員 #{i + 1}
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(i, e.target.value)}
              placeholder={`輸入球員 #${i + 1} 姓名`}
              className="w-full bg-[var(--bg)] px-4 py-3 text-base font-semibold text-brand-navy outline-none placeholder:font-normal placeholder:text-[var(--muted)] focus:outline-2 focus:outline-brand-teal"
              autoComplete="off"
            />
          </label>
        ))}
      </div>

      <div className="sticky bottom-4 space-y-2 bg-[var(--bg)] pt-2">
        {!canStart && (
          <p className="text-center text-sm font-bold text-brand-navy">
            請至少填入 4 位球員姓名以產生對戰表
          </p>
        )}
        <button
          type="button"
          disabled={!canStart || generating}
          onClick={onStart}
          className="btn-brand w-full py-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "處理中…" : "產生雙打對戰賽程 →"}
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
    <div className="space-y-6">
      <header className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-white px-4 py-2 text-sm font-bold text-brand-navy hover:bg-brand-navy hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          返回修改名單
        </button>
        <div className="bg-brand-navy p-6 text-white">
          <h2 className="text-2xl font-extrabold text-white">雙打輪替賽程表</h2>
          <p className="mt-1 text-base text-white/85 tabular-nums">
            總人數：{players.length} 人 · 共 {templates.length} 場對戰
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
    <article className="bg-white">
      <div className="flex items-center justify-between bg-brand-navy px-5 py-3 text-white">
        <h3 className="text-base font-extrabold tabular-nums">
          場次 #{index + 1}
        </h3>
        {score.locked && (
          <span className="inline-flex items-center gap-1 bg-brand-lime px-2.5 py-0.5 text-xs font-extrabold text-brand-navy">
            <CheckCircle2 className="h-3.5 w-3.5" />
            已鎖定比數
          </span>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div className="bg-[var(--bg)] p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-extrabold text-brand-navy">
            <Swords className="h-4 w-4 shrink-0 text-[#1D6D75]" />
            上場對戰組合
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="min-w-0 bg-white p-3 text-center">
              <p className="text-xs font-bold text-[#1D6D75]">隊伍 A</p>
              <p className="mt-1 break-words text-base font-extrabold text-brand-navy">
                {teamA}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="text-xs font-extrabold text-brand-navy">VS</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={score.scoreA}
                  disabled={score.locked}
                  onChange={(e) => onScoreChange(index, "scoreA", e.target.value)}
                  placeholder="-"
                  className="h-12 w-12 bg-white text-center text-xl font-black text-brand-navy tabular-nums outline-none focus:outline-2 focus:outline-brand-teal disabled:opacity-60"
                  aria-label={`場次 ${index + 1} 隊伍 A 分數`}
                />
                <span className="text-base font-bold text-[var(--muted)]">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={score.scoreB}
                  disabled={score.locked}
                  onChange={(e) => onScoreChange(index, "scoreB", e.target.value)}
                  placeholder="-"
                  className="h-12 w-12 bg-white text-center text-xl font-black text-brand-navy tabular-nums outline-none focus:outline-2 focus:outline-brand-teal disabled:opacity-60"
                  aria-label={`場次 ${index + 1} 隊伍 B 分數`}
                />
              </div>
            </div>

            <div className="min-w-0 bg-white p-3 text-center">
              <p className="text-xs font-bold text-brand-navy">隊伍 B</p>
              <p className="mt-1 break-words text-base font-extrabold text-brand-navy">
                {teamB}
              </p>
            </div>
          </div>
        </div>

        {restingNames.length === 0 ? (
          <div className="flex items-center gap-2 bg-brand-lime-soft px-4 py-3 text-sm font-bold text-brand-navy">
            <Users className="h-4 w-4 shrink-0" />
            本場全員上場
          </div>
        ) : (
          <div className="bg-[var(--surface-alt)] px-4 py-3">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-brand-navy">
              <Coffee className="h-4 w-4 shrink-0" />
              場邊輪休球員
            </div>
            <div className="flex flex-wrap gap-2">
              {restingNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center bg-white px-3 py-1 text-sm font-bold text-brand-navy"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2 bg-[var(--bg)] px-4 py-3 text-sm font-bold text-brand-navy">
          <input
            type="checkbox"
            checked={score.locked}
            onChange={() => onToggleLock(index)}
            className="h-4 w-4 accent-brand-navy"
          />
          <span className="inline-flex items-center gap-1.5">
            {score.locked ? (
              <>
                <Lock className="h-4 w-4 text-[#1D6D75]" />
                已完成並鎖定比數
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 text-[var(--muted)]" />
                勾選以鎖定本場比數
              </>
            )}
          </span>
        </label>
      </div>
    </article>
  );
}
