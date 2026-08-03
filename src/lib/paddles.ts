export type Paddle = {
  id: string;
  brand: string;
  series: string;
  variant: string;
  nameZh: string;
  nameEn: string;
  /** public 路徑，例如 /paddles/xxx.webp；未提供則用佔位圖 */
  imageSrc?: string;
  /** 詳細介紹（可之後再補） */
  description: string;
  highlights?: string[];
};

export const PADDLES: Paddle[] = [
  {
    id: "luzz-inferno-zero",
    brand: "LUZZ",
    series: "地獄火",
    variant: "零度",
    nameZh: "LUZZ 地獄火 零度",
    nameEn: "LUZZ Inferno - Zero / Frozen",
    description:
      "地獄火系列的零度版本，主打清爽配色與穩定手感，適合喜歡均衡操控與控球的球員。",
    highlights: ["地獄火系列", "均衡手感", "控球取向"],
  },
  {
    id: "luzz-inferno-darkness",
    brand: "LUZZ",
    series: "地獄火",
    variant: "暗黑",
    nameZh: "LUZZ 地獄火 暗黑",
    nameEn: "LUZZ Inferno - Darkness",
    description:
      "地獄火暗黑配色，視覺壓迫感強，延續系列攻擊與節奏推進的打法特性。",
    highlights: ["地獄火系列", "暗黑配色", "攻擊節奏"],
  },
  {
    id: "luzz-inferno-pink-purple",
    brand: "LUZZ",
    series: "地獄火",
    variant: "粉紫",
    nameZh: "LUZZ 地獄火 粉紫",
    nameEn: "LUZZ Inferno - Pink Purple",
    description:
      "粉紫配色的地獄火，外型辨識度高，適合想要性能與風格並重的球員。",
    highlights: ["地獄火系列", "高辨識外型"],
  },
  {
    id: "luzz-inferno-blue-flame",
    brand: "LUZZ",
    series: "地獄火",
    variant: "藍焰",
    nameZh: "LUZZ 地獄火 藍焰",
    nameEn: "LUZZ Inferno - Blue Flame",
    description:
      "藍焰版本延續地獄火系列火感主題，偏攻擊推進與中前場節奏。",
    highlights: ["地獄火系列", "藍焰配色"],
  },
  {
    id: "luzz-tornado-black",
    brand: "LUZZ",
    series: "龍捲風",
    variant: "黑",
    nameZh: "LUZZ 龍捲風 黑",
    nameEn: "LUZZ Tornado - Black",
    description:
      "龍捲風系列黑色款，強調旋轉與變化球手感，適合喜歡製造球路變化的打法。",
    highlights: ["龍捲風系列", "旋轉變化"],
  },
  {
    id: "luzz-tornado-purple",
    brand: "LUZZ",
    series: "龍捲風",
    variant: "紫",
    nameZh: "LUZZ 龍捲風 紫",
    nameEn: "LUZZ Tornado - Purple",
    description:
      "紫色龍捲風，系列同調手感，外型更鮮明，適合雙打中需要靈活變速的球員。",
    highlights: ["龍捲風系列", "靈活變速"],
  },
  {
    id: "luzz-cannon-g1-black",
    brand: "LUZZ",
    series: "一代加農砲",
    variant: "黑",
    nameZh: "LUZZ 一代加農砲 黑",
    nameEn: "LUZZ Cannon Gen 1 - Black",
    description:
      "一代加農砲經典黑色款，以力量輸出與甜蜜點穩定度見長，適合喜歡主動進攻的球友。",
    highlights: ["一代加農砲", "力量輸出"],
  },
  {
    id: "luzz-cannon-g1-collab",
    brand: "LUZZ",
    series: "一代加農砲",
    variant: "聯名",
    nameZh: "LUZZ 一代加農砲 聯名",
    nameEn: "LUZZ Cannon Gen 1 - Co-branded",
    description:
      "一代加農砲聯名版本，保留系列攻擊性格，外觀為聯名限定設計。",
    highlights: ["一代加農砲", "聯名限定"],
  },
  {
    id: "luzz-cannon-g1-candy",
    brand: "LUZZ",
    series: "一代加農砲",
    variant: "蜜糖",
    nameZh: "LUZZ 一代加農砲 蜜糖",
    nameEn: "LUZZ Cannon Gen 1 - Candy / Honey",
    description:
      "蜜糖配色的一代加農砲，性能取向與系列一致，外型更柔和吸睛。",
    highlights: ["一代加農砲", "蜜糖配色"],
  },
  {
    id: "luzz-cannon-g1-ex",
    brand: "LUZZ",
    series: "一代加農砲",
    variant: "EX",
    nameZh: "LUZZ 一代加農砲 EX",
    nameEn: "LUZZ Cannon Gen 1 - EX",
    description:
      "一代加農砲 EX 版本，定位為系列進階款，適合想再多一點擊球回饋的球員。",
    highlights: ["一代加農砲", "EX 進階"],
  },
  {
    id: "luzz-glider-2026",
    brand: "LUZZ",
    series: "滑翔機",
    variant: "2026",
    nameZh: "LUZZ 滑翔機 2026",
    nameEn: "LUZZ Glider - 2026",
    description:
      "滑翔機 2026，強調輕盈操控與連續對拉穩定度，適合喜歡細膩控球的打法。",
    highlights: ["滑翔機系列", "輕盈操控"],
  },
  {
    id: "luzz-glider-signature",
    brand: "LUZZ",
    series: "滑翔機",
    variant: "簽名版",
    nameZh: "LUZZ 滑翔機 簽名版",
    nameEn: "LUZZ Glider - Signature Edition",
    description:
      "滑翔機簽名版，系列手感加上簽名限定外觀，收藏與實戰兼具。",
    highlights: ["滑翔機系列", "簽名限定"],
  },
  {
    id: "luzz-glider-gatsby",
    brand: "LUZZ",
    series: "滑翔機",
    variant: "蓋比",
    nameZh: "LUZZ 滑翔機 蓋比",
    nameEn: "LUZZ Glider - Gatsby",
    description:
      "滑翔機蓋比版本，延續系列控球特性，外型為特別配色款。",
    highlights: ["滑翔機系列", "特別配色"],
  },
  {
    id: "luzz-bladz-longyuan",
    brand: "LUZZ",
    series: "刀鋒",
    variant: "龍淵",
    nameZh: "LUZZ 刀鋒 龍淵",
    nameEn: "LUZZ Pro Bladz 2 - Long Yuan",
    description:
      "刀鋒龍淵（Pro Bladz 2），偏精準切球與快速揮拍反應，適合前場攔截與變向。",
    highlights: ["刀鋒系列", "精準切球"],
  },
  {
    id: "luzz-cannon-g2-black",
    brand: "LUZZ",
    series: "二代加農砲",
    variant: "黑",
    nameZh: "LUZZ 二代加農砲 黑",
    nameEn: "LUZZ Cannon Gen 2 - Black",
    description:
      "二代加農砲黑色款，承襲加農砲攻擊基因並升級手感回饋，適合主動進攻型球員。",
    highlights: ["二代加農砲", "攻擊升級"],
  },
  {
    id: "luzz-cannon-g2-collab",
    brand: "LUZZ",
    series: "二代加農砲",
    variant: "聯名",
    nameZh: "LUZZ 二代加農砲 聯名",
    nameEn: "LUZZ Cannon Gen 2 - Co-branded",
    description:
      "二代加農砲聯名版，性能延續 Gen 2，外觀為聯名特別設計。",
    highlights: ["二代加農砲", "聯名限定"],
  },
  {
    id: "sypik-triton5",
    brand: "SYPIK",
    series: "TRITON5",
    variant: "-",
    nameZh: "SYPIK TRITON5",
    nameEn: "SYPIK TRITON5",
    description:
      "SYPIK TRITON5，強調穩定甜蜜點與全面型打法，適合想要一拍打遍攻守的球友。",
    highlights: ["全面型", "穩定甜蜜點"],
  },
  {
    id: "zocker-aspire-signature",
    brand: "ZOCKER",
    series: "ASPIRE SIGNATURE",
    variant: "-",
    nameZh: "ZOCKER ASPIRE SIGNATURE",
    nameEn: "ZOCKER ASPIRE SIGNATURE",
    description:
      "ZOCKER Aspire Signature，簽名系列定位，兼顧外觀識別與實戰手感。",
    highlights: ["簽名系列"],
  },
  {
    id: "enhance-mpp",
    brand: "ENHANCE",
    series: "MPP",
    variant: "-",
    nameZh: "ENHANCE MPP",
    nameEn: "ENHANCE MPP",
    description:
      "ENHANCE MPP，偏向現代全面型配置，適合想要乾淨擊球回饋的球員。",
    highlights: ["全面型"],
  },
  {
    id: "pakle-fuse",
    brand: "PAKLE",
    series: "FUSE",
    variant: "-",
    nameZh: "PAKLE FUSE",
    nameEn: "PAKLE FUSE",
    description:
      "PAKLE FUSE，融合操控與力量的中庸取向，適合進階球友作為主力拍。",
    highlights: ["操控與力量平衡"],
  },
  {
    id: "rpm-q2",
    brand: "RPM",
    series: "Q2",
    variant: "-",
    nameZh: "RPM Q2",
    nameEn: "RPM Q2",
    description:
      "RPM Q2，強調擊球速度與中場轉換節奏，適合喜歡主動推進的球員。",
    highlights: ["速度節奏"],
  },
  {
    id: "rpm-v2",
    brand: "RPM",
    series: "V2",
    variant: "-",
    nameZh: "RPM V2",
    nameEn: "RPM V2",
    description:
      "RPM V2，系列另一主力款，手感與平衡取向不同於 Q2，適合依打法分開挑選。",
    highlights: ["系列主力"],
  },
  {
    id: "honolulu-j2cr",
    brand: "HONOLULU",
    series: "J2CR",
    variant: "-",
    nameZh: "HONOLULU J2CR",
    nameEn: "HONOLULU J2CR",
    description:
      "HONOLULU J2CR，以控制與擊球精度著稱，適合喜歡細膩擺放與軟手過渡的打法。",
    highlights: ["控制精度", "軟手過渡"],
  },
  {
    id: "honolulu-j6cr",
    brand: "HONOLULU",
    series: "J6CR",
    variant: "-",
    nameZh: "HONOLULU J6CR",
    nameEn: "HONOLULU J6CR",
    description:
      "HONOLULU J6CR，與 J2CR 為不同款式，同樣強調控制手感，適合依手感喜好分開挑選。",
    highlights: ["控制精度"],
  },
];

export function getPaddleBrands(): string[] {
  return [...new Set(PADDLES.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" }),
  );
}

export function getPaddlesByBrand(brand: string): Paddle[] {
  return PADDLES.filter((p) => p.brand === brand);
}

export function getPaddleById(id: string): Paddle | undefined {
  return PADDLES.find((p) => p.id === id);
}
