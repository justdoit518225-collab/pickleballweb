import { getScheduleTemplates } from "@/lib/doubles-schedule";

/** 球員索引 0 起算，對應報名名單順序（顯示時 +1） */
export type ScheduledMatch = {
  round: number;
  court: number;
  teamA: [number, number];
  teamB: [number, number];
  /** 本輪沒有上場的球員（所有場地合計） */
  resting: number[];
};

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 64;
const DEFAULT_GAMES_PER_PLAYER = 8;

export function effectiveCourtCount(playerCount: number, courtCount: number): number {
  return Math.max(1, Math.min(Math.floor(playerCount / 4), Math.floor(courtCount) || 1));
}

export function defaultRoundCount(playerCount: number, courtCount: number): number {
  const courts = effectiveCourtCount(playerCount, courtCount);
  if (courts === 1) {
    const template = getScheduleTemplates(playerCount);
    if (template.length > 0) return template.length;
  }
  return Math.max(1, Math.ceil((playerCount * DEFAULT_GAMES_PER_PLAYER) / (courts * 4)));
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Stats = {
  games: number[];
  restStreak: number[];
  partner: number[][];
  opponent: number[][];
};

function newStats(n: number): Stats {
  return {
    games: Array(n).fill(0),
    restStreak: Array(n).fill(0),
    partner: Array.from({ length: n }, () => Array(n).fill(0)),
    opponent: Array.from({ length: n }, () => Array(n).fill(0)),
  };
}

const PARTNER_WEIGHT = 12;
const OPPONENT_WEIGHT = 2;

type Pairing = { teamA: [number, number]; teamB: [number, number]; cost: number };

function pairCost(s: Stats, a: number, b: number, c: number, d: number): number {
  const p1 = s.partner[a][b];
  const p2 = s.partner[c][d];
  const partnerCost = PARTNER_WEIGHT * (p1 * p1 + p1 + p2 * p2 + p2);
  const opp = s.opponent[a][c] + s.opponent[a][d] + s.opponent[b][c] + s.opponent[b][d];
  return partnerCost + OPPONENT_WEIGHT * opp;
}

function bestPairing(s: Stats, g: number[]): Pairing {
  const [w, x, y, z] = g;
  const options: Pairing[] = [
    { teamA: [w, x], teamB: [y, z], cost: pairCost(s, w, x, y, z) },
    { teamA: [w, y], teamB: [x, z], cost: pairCost(s, w, y, x, z) },
    { teamA: [w, z], teamB: [x, y], cost: pairCost(s, w, z, x, y) },
  ];
  return options.reduce((best, o) => (o.cost < best.cost ? o : best));
}

/** 將 4×courts 位上場球員分組，局部搜尋降低搭檔／對手重複 */
function groupPlayers(s: Stats, selected: number[], courts: number, rng: Rng): Pairing[] {
  if (courts === 1) return [bestPairing(s, selected)];

  let best: Pairing[] | null = null;
  let bestCost = Infinity;
  const restarts = 6;

  for (let r = 0; r < restarts; r++) {
    const order = shuffle(selected, rng);
    const groups = Array.from({ length: courts }, (_, i) => order.slice(i * 4, i * 4 + 4));
    const costs = groups.map((g) => bestPairing(s, g).cost);

    let improved = true;
    let passes = 0;
    while (improved && passes < 20) {
      improved = false;
      passes++;
      for (let gi = 0; gi < courts; gi++) {
        for (let gj = gi + 1; gj < courts; gj++) {
          for (let pi = 0; pi < 4; pi++) {
            for (let pj = 0; pj < 4; pj++) {
              const ga = [...groups[gi]];
              const gb = [...groups[gj]];
              [ga[pi], gb[pj]] = [gb[pj], ga[pi]];
              const ca = bestPairing(s, ga).cost;
              const cb = bestPairing(s, gb).cost;
              if (ca + cb < costs[gi] + costs[gj]) {
                groups[gi] = ga;
                groups[gj] = gb;
                costs[gi] = ca;
                costs[gj] = cb;
                improved = true;
              }
            }
          }
        }
      }
    }

    const total = costs.reduce((a, b) => a + b, 0);
    if (total < bestCost) {
      bestCost = total;
      best = groups.map((g) => bestPairing(s, g));
    }
  }

  return best!;
}

function applyMatch(s: Stats, p: Pairing) {
  const [a, b] = p.teamA;
  const [c, d] = p.teamB;
  s.partner[a][b]++;
  s.partner[b][a]++;
  s.partner[c][d]++;
  s.partner[d][c]++;
  for (const x of p.teamA) {
    for (const y of p.teamB) {
      s.opponent[x][y]++;
      s.opponent[y][x]++;
    }
  }
}

function buildOnce(n: number, courts: number, rounds: number, rng: Rng) {
  const s = newStats(n);
  const matches: ScheduledMatch[] = [];
  const perRound = courts * 4;

  for (let r = 1; r <= rounds; r++) {
    const tiebreak = Array.from({ length: n }, () => rng());
    const order = Array.from({ length: n }, (_, i) => i).sort(
      (i, j) =>
        s.games[i] - s.games[j] ||
        s.restStreak[j] - s.restStreak[i] ||
        tiebreak[i] - tiebreak[j],
    );
    const selected = order.slice(0, perRound);
    const selectedSet = new Set(selected);
    const resting = order.slice(perRound).sort((a, b) => a - b);

    const pairings = groupPlayers(s, selected, courts, rng);
    pairings.forEach((p, ci) => {
      applyMatch(s, p);
      matches.push({ round: r, court: ci + 1, teamA: p.teamA, teamB: p.teamB, resting });
    });

    for (let i = 0; i < n; i++) {
      if (selectedSet.has(i)) {
        s.games[i]++;
        s.restStreak[i] = 0;
      } else {
        s.restStreak[i]++;
      }
    }
  }

  let score = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const p = s.partner[i][j];
      if (p > 1) score += PARTNER_WEIGHT * (p - 1) * (p - 1) * 4;
      const o = s.opponent[i][j];
      if (o > 2) score += OPPONENT_WEIGHT * (o - 2);
    }
  }
  const maxGames = Math.max(...s.games);
  const minGames = Math.min(...s.games);
  score += (maxGames - minGames) * 50;

  return { matches, score };
}

function fromTemplate(n: number, rounds: number): ScheduledMatch[] {
  const template = getScheduleTemplates(n);
  return Array.from({ length: rounds }, (_, i) => {
    const t = template[i % template.length];
    return {
      round: i + 1,
      court: 1,
      teamA: [...t.teamA] as [number, number],
      teamB: [...t.teamB] as [number, number],
      resting: [...t.resting],
    };
  });
}

export function generateDuprSchedule(input: {
  playerCount: number;
  courtCount: number;
  rounds?: number;
  seed?: number;
}): ScheduledMatch[] {
  const n = input.playerCount;
  if (n < MIN_PLAYERS) throw new Error(`至少需要 ${MIN_PLAYERS} 位球員`);
  if (n > MAX_PLAYERS) throw new Error(`最多支援 ${MAX_PLAYERS} 位球員`);

  const courts = effectiveCourtCount(n, input.courtCount);
  const rounds = Math.max(1, Math.min(60, input.rounds ?? defaultRoundCount(n, courts)));

  if (courts === 1 && getScheduleTemplates(n).length > 0) {
    return fromTemplate(n, rounds);
  }

  const rng = mulberry32(input.seed ?? Date.now());
  const attempts = courts === 1 ? 60 : 25;
  let best: ScheduledMatch[] = [];
  let bestScore = Infinity;
  for (let i = 0; i < attempts; i++) {
    const { matches, score } = buildOnce(n, courts, rounds, rng);
    if (score < bestScore) {
      bestScore = score;
      best = matches;
    }
  }
  return best;
}

/** 單場地時，與上一場重複上場的球員（對戰表 🔄 標示） */
export function carryOverPlayers(
  prev: Pick<ScheduledMatch, "teamA" | "teamB"> | undefined,
  cur: Pick<ScheduledMatch, "teamA" | "teamB">,
): number[] {
  if (!prev) return [];
  const prevSet = new Set([...prev.teamA, ...prev.teamB]);
  return [...cur.teamA, ...cur.teamB].filter((p) => prevSet.has(p)).sort((a, b) => a - b);
}

export type SeqMatch = {
  seq: number;
  round: number;
  court: number;
  teamA1: number;
  teamA2: number;
  teamB1: number;
  teamB2: number;
  resting: number[];
};

/** 產生可貼到 LINE 的對戰表文字；9 人以內用連寫編號（12 vs 34），否則以「/」分隔 */
export function formatScheduleText(playerCount: number, matches: SeqMatch[]): string {
  const join = (seqs: number[]) => (playerCount <= 9 ? seqs.join("") : seqs.join("/"));
  const pad = (n: number) => String(n).padStart(2, "0");
  const lines = [`🏓 ${playerCount} 人對戰表`, ""];
  const multiCourt = matches.some((m) => m.court > 1);

  if (!multiCourt) {
    matches.forEach((m, i) => {
      const prev = matches[i - 1];
      const carry = prev
        ? [m.teamA1, m.teamA2, m.teamB1, m.teamB2]
            .filter((p) => [prev.teamA1, prev.teamA2, prev.teamB1, prev.teamB2].includes(p))
            .sort((a, b) => a - b)
        : [];
      const rest = m.resting.length ? `　休：${join(m.resting)}` : "";
      lines.push(
        `${pad(m.seq)}｜${join([m.teamA1, m.teamA2])} vs ${join([m.teamB1, m.teamB2])}${rest}${carry.length ? `　🔄${join(carry)}` : ""}`,
      );
    });
    return lines.join("\n");
  }

  const rounds = new Map<number, SeqMatch[]>();
  for (const m of matches) rounds.set(m.round, [...(rounds.get(m.round) ?? []), m]);
  for (const [round, list] of rounds) {
    lines.push(`第 ${pad(round)} 輪`);
    for (const m of list) {
      lines.push(`  ${m.court} 號場｜${join([m.teamA1, m.teamA2])} vs ${join([m.teamB1, m.teamB2])}`);
    }
    if (list[0].resting.length) lines.push(`  休：${list[0].resting.join(" ")}`);
  }
  return lines.join("\n");
}

export type ScheduleSummary = {
  gamesPerPlayer: number[];
  distinctPartnerPairs: number;
  totalPairs: number;
  repeatedPartnerPairs: number;
};

export function summarizeSchedule(playerCount: number, matches: ScheduledMatch[]): ScheduleSummary {
  const games = Array(playerCount).fill(0);
  const partner = new Map<string, number>();
  for (const m of matches) {
    for (const p of [...m.teamA, ...m.teamB]) games[p]++;
    for (const [a, b] of [m.teamA, m.teamB]) {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      partner.set(key, (partner.get(key) ?? 0) + 1);
    }
  }
  return {
    gamesPerPlayer: games,
    distinctPartnerPairs: partner.size,
    totalPairs: (playerCount * (playerCount - 1)) / 2,
    repeatedPartnerPairs: [...partner.values()].filter((c) => c > 1).length,
  };
}
