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
  /**
   * 7 人單場雙打輪替（4 打 3 休），APC DUPR 活動用表。
   * 01–14 場 21 組搭檔全數出現；每場恰有 1 人連打（🔄），無人連續兩場休息。
   * 編號 0..6 對應球員 #1..#7。
   */
  7: [
    { teamA: [0, 1], teamB: [2, 3], resting: [4, 5, 6] }, // 01 12 vs 34 休 567
    { teamA: [2, 4], teamB: [5, 6], resting: [0, 1, 3] }, // 02 35 vs 67 休 124
    { teamA: [0, 3], teamB: [1, 5], resting: [2, 4, 6] }, // 03 14 vs 26 休 357
    { teamA: [0, 4], teamB: [2, 6], resting: [1, 3, 5] }, // 04 15 vs 37 休 246
    { teamA: [1, 3], teamB: [4, 5], resting: [0, 2, 6] }, // 05 24 vs 56 休 137
    { teamA: [0, 6], teamB: [1, 2], resting: [3, 4, 5] }, // 06 17 vs 23 休 456
    { teamA: [3, 5], teamB: [4, 6], resting: [0, 1, 2] }, // 07 46 vs 57 休 123
    { teamA: [0, 2], teamB: [1, 3], resting: [4, 5, 6] }, // 08 13 vs 24 休 567
    { teamA: [1, 4], teamB: [5, 6], resting: [0, 2, 3] }, // 09 25 vs 67 休 134
    { teamA: [0, 3], teamB: [2, 5], resting: [1, 4, 6] }, // 10 14 vs 36 休 257
    { teamA: [1, 6], teamB: [3, 4], resting: [0, 2, 5] }, // 11 27 vs 45 休 136
    { teamA: [0, 2], teamB: [4, 5], resting: [1, 3, 6] }, // 12 13 vs 56 休 247
    { teamA: [1, 2], teamB: [3, 6], resting: [0, 4, 5] }, // 13 23 vs 47 休 156
    { teamA: [0, 5], teamB: [4, 6], resting: [1, 2, 3] }, // 14 16 vs 57 休 234
    { teamA: [0, 1], teamB: [2, 3], resting: [4, 5, 6] }, // 15 12 vs 34 休 567
  ],
  /**
   * 8 人單場雙打輪替（4 打 4 休）
   * 全搭檔各組一次：C(8,2)=28 對 ÷ 每場 2 對 = 14 場；每人打 7 休 7。
   * 01–06：兩大組互換，各打滿 4 人的 3 種拆法（同 7 人表後半邏輯）。
   * 07–14：跨組輪替，補齊其餘搭檔。
   */
  8: [
    // 01–06：1234 ↔ 5678，各 3 種對戰拆法
    { teamA: [0, 1], teamB: [2, 3], resting: [4, 5, 6, 7] }, // 12 vs 34 休 5678
    { teamA: [4, 5], teamB: [6, 7], resting: [0, 1, 2, 3] }, // 56 vs 78 休 1234
    { teamA: [0, 2], teamB: [1, 3], resting: [4, 5, 6, 7] }, // 13 vs 24 休 5678
    { teamA: [4, 6], teamB: [5, 7], resting: [0, 1, 2, 3] }, // 57 vs 68 休 1234
    { teamA: [0, 3], teamB: [1, 2], resting: [4, 5, 6, 7] }, // 14 vs 23 休 5678
    { teamA: [4, 7], teamB: [5, 6], resting: [0, 1, 2, 3] }, // 58 vs 67 休 1234
    // 07–14：跨組
    { teamA: [0, 4], teamB: [1, 5], resting: [2, 3, 6, 7] }, // 15 vs 26 休 3478
    { teamA: [2, 6], teamB: [3, 7], resting: [0, 1, 4, 5] }, // 37 vs 48 休 1256
    { teamA: [0, 5], teamB: [1, 4], resting: [2, 3, 6, 7] }, // 16 vs 25 休 3478
    { teamA: [2, 7], teamB: [3, 6], resting: [0, 1, 4, 5] }, // 38 vs 47 休 1256
    { teamA: [0, 6], teamB: [1, 7], resting: [2, 3, 4, 5] }, // 17 vs 28 休 3456
    { teamA: [2, 4], teamB: [3, 5], resting: [0, 1, 6, 7] }, // 35 vs 46 休 1278
    { teamA: [0, 7], teamB: [1, 6], resting: [2, 3, 4, 5] }, // 18 vs 27 休 3456
    { teamA: [2, 5], teamB: [3, 4], resting: [0, 1, 6, 7] }, // 36 vs 45 休 1278
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
