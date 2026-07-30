/** 球員索引 0=A, 1=B, ... 對應「有效球員陣列」順序 */

export type MatchTemplate = {
  teamA: [number, number];
  teamB: [number, number];
  resting: number[];
};

const SCHEDULES: Record<number, MatchTemplate[]> = {
  4: [
    { teamA: [0, 1], teamB: [2, 3], resting: [] },
    { teamA: [0, 2], teamB: [1, 3], resting: [] },
    { teamA: [0, 3], teamB: [1, 2], resting: [] },
    { teamA: [0, 1], teamB: [2, 3], resting: [] },
  ],
  5: [
    { teamA: [0, 1], teamB: [2, 3], resting: [4] },
    { teamA: [0, 2], teamB: [1, 4], resting: [3] },
    { teamA: [0, 3], teamB: [2, 4], resting: [1] },
    { teamA: [1, 2], teamB: [3, 4], resting: [0] },
    { teamA: [0, 4], teamB: [1, 3], resting: [2] },
  ],
  6: [
    { teamA: [0, 1], teamB: [2, 3], resting: [4, 5] },
    { teamA: [2, 4], teamB: [3, 5], resting: [0, 1] },
    { teamA: [0, 5], teamB: [1, 4], resting: [2, 3] },
    { teamA: [1, 2], teamB: [3, 4], resting: [0, 5] },
    { teamA: [0, 3], teamB: [2, 5], resting: [1, 4] },
    { teamA: [0, 4], teamB: [1, 5], resting: [2, 3] },
  ],
  7: [
    { teamA: [0, 1], teamB: [2, 3], resting: [4, 5, 6] },
    { teamA: [4, 5], teamB: [6, 0], resting: [1, 2, 3] },
    { teamA: [1, 2], teamB: [3, 4], resting: [5, 6, 0] },
    { teamA: [5, 6], teamB: [0, 1], resting: [2, 3, 4] },
    { teamA: [2, 3], teamB: [4, 5], resting: [6, 0, 1] },
    { teamA: [6, 0], teamB: [1, 2], resting: [3, 4, 5] },
    { teamA: [3, 4], teamB: [5, 6], resting: [0, 1, 2] },
  ],
  8: [
    { teamA: [0, 1], teamB: [2, 3], resting: [4, 5, 6, 7] },
    { teamA: [4, 5], teamB: [6, 7], resting: [0, 1, 2, 3] },
    { teamA: [0, 2], teamB: [4, 6], resting: [1, 3, 5, 7] },
    { teamA: [1, 3], teamB: [5, 7], resting: [0, 2, 4, 6] },
    { teamA: [0, 3], teamB: [1, 2], resting: [4, 5, 6, 7] },
    { teamA: [4, 7], teamB: [5, 6], resting: [0, 1, 2, 3] },
    { teamA: [0, 4], teamB: [1, 5], resting: [2, 3, 6, 7] },
    { teamA: [2, 6], teamB: [3, 7], resting: [0, 1, 4, 5] },
    { teamA: [0, 5], teamB: [3, 6], resting: [1, 2, 4, 7] },
    { teamA: [1, 4], teamB: [2, 7], resting: [0, 3, 5, 6] },
    { teamA: [0, 6], teamB: [1, 7], resting: [2, 3, 4, 5] },
    { teamA: [2, 4], teamB: [3, 5], resting: [0, 1, 6, 7] },
    { teamA: [0, 7], teamB: [2, 5], resting: [1, 3, 4, 6] },
    { teamA: [1, 6], teamB: [3, 4], resting: [0, 2, 5, 7] },
  ],
};

export function getScheduleTemplates(playerCount: number): MatchTemplate[] {
  return SCHEDULES[playerCount] ?? [];
}

export const SAMPLE_NAMES = [
  "小明",
  "小華",
  "阿強",
  "美美",
  "阿杰",
  "小玲",
  "大偉",
  "小芳",
];
