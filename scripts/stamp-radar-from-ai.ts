/**
 * 以乾淨的 J2CR 原圖為唯一底板（避免 AI 圖殘留雙重文字），
 * 覆蓋舊分數／標題後只寫一組，並依分數重畫中心多邊形。
 * 用法：npx tsx scripts/stamp-radar-from-ai.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

type Scores = {
  spin: number;
  forgiveness: number;
  control: number;
  pop: number;
  maneuverability: number;
  power: number;
};

const OUT = path.join(process.cwd(), "public", "paddles");
const TEMPLATE = path.join(OUT, "honolulu-j2cr-crystal-blue-radar.jpg");

const AXES = [
  "spin",
  "forgiveness",
  "control",
  "pop",
  "maneuverability",
  "power",
] as const;

const AXIS_LABELS = [
  "SPIN",
  "FORGIVENESS",
  "CONTROL",
  "POP",
  "MANEUVERABILITY",
  "POWER",
] as const;

function fmt(n: number) {
  return n.toFixed(1);
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function hexPoints(cx: number, cy: number, r: number) {
  return AXES.map((_, i) => {
    const p = polar(cx, cy, r, i * 60);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(" ");
}

function dataPolygon(cx: number, cy: number, maxR: number, scores: Scores) {
  return AXES.map((key, i) => {
    const v = scores[key];
    const p = polar(cx, cy, (Math.min(10, Math.max(0, v)) / 10) * maxR, i * 60);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(" ");
}

function hexPath(cx: number, cy: number, r: number) {
  return (
    AXES.map((_, i) => {
      const p = polar(cx, cy, r, i * 60);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ") + "Z"
  );
}

/** 蓋掉 J2CR 原圖上的標籤＋分數＋三角標 */
const AXIS_CARDS: {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}[] = [
  { label: "SPIN", x: 480, y: 40, w: 240, h: 100 },
  { label: "FORGIVENESS", x: 760, y: 135, w: 280, h: 110 },
  { label: "CONTROL", x: 760, y: 445, w: 280, h: 110 },
  { label: "POP", x: 480, y: 520, w: 240, h: 90 },
  { label: "MANEUVERABILITY", x: 140, y: 445, w: 300, h: 110 },
  { label: "POWER", x: 140, y: 135, w: 280, h: 110 },
];

const GEO = { cx: 600, cy: 330, maxR: 210 };

function stampSvg(title: string, credit: string, scores: Scores) {
  const bg = "#ffffff";
  const { cx, cy, maxR } = GEO;
  const vals = AXES.map((k) => scores[k]);
  const dataPts = dataPolygon(cx, cy, maxR, scores);
  const eraseR = maxR + 12;

  const rings = [2, 4, 6, 8, 10]
    .map((n) => {
      const r = (n / 10) * maxR;
      return `<polygon points="${hexPoints(cx, cy, r)}" fill="none" stroke="#cfd9e6" stroke-width="1.2"/>
      <text x="${cx + 8}" y="${(cy - r + 4).toFixed(1)}" fill="#7a8ea8" font-size="12" font-weight="700" font-family="Segoe UI, Helvetica, Arial, sans-serif">${n}</text>`;
    })
    .join("\n");

  const spokes = AXES.map((_, i) => {
    const p = polar(cx, cy, maxR, i * 60);
    return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}" stroke="#c8d4e2" stroke-width="1.1"/>`;
  }).join("\n");

  const scoreLayer = AXIS_CARDS.map((card, i) => {
    const cardCx = card.x + card.w / 2;
    const labelSize = card.label.length > 12 ? 14 : 16;
    return `
      <rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" rx="10" fill="${bg}"/>
      <text x="${cardCx}" y="${card.y + 36}" text-anchor="middle" fill="#0a1a2e" font-size="${labelSize}" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="0.6">${AXIS_LABELS[i]}</text>
      <text x="${cardCx}" y="${card.y + 78}" text-anchor="middle" fill="#1a6fd4" font-size="30" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif">${fmt(vals[i])}</text>`;
  }).join("\n");

  const vertices = AXES.map((key, i) => {
    const v = scores[key];
    const p = polar(cx, cy, (Math.min(10, Math.max(0, v)) / 10) * maxR, i * 60);
    return `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="5.5" fill="#fff" stroke="#6ad4ff" stroke-width="2.8"/>`;
  }).join("\n");

  // 環狀清掉標籤區全部舊字（外 hex 減內 hex）
  const labelRing = `<path fill-rule="evenodd" fill="${bg}" d="${hexPath(cx, cy, 385)} ${hexPath(cx, cy, eraseR + 2)}"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="fillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#5ec8ff" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#5b7ef5" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="#c24ee0" stop-opacity="0.55"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="7" result="b"/>
      <feFlood flood-color="#6ad4ff" flood-opacity="0.75" result="c"/>
      <feComposite in="c" in2="b" operator="in" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- 清掉原多邊形 -->
  <polygon points="${hexPoints(cx, cy, eraseR)}" fill="${bg}"/>
  ${rings}
  ${spokes}
  <text x="${cx + 8}" y="${cy + 4}" fill="#7a8ea8" font-size="12" font-weight="700" font-family="Segoe UI, Helvetica, Arial, sans-serif">0</text>
  <polygon points="${dataPts}" fill="none" stroke="#7adfff" stroke-width="14" opacity="0.4" filter="url(#glow)"/>
  <polygon points="${dataPts}" fill="url(#fillGrad)" stroke="#9aecff" stroke-width="5"/>
  <polygon points="${dataPts}" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.9"/>
  ${vertices}
  ${labelRing}
  ${scoreLayer}
  <!-- 底部整塊清空（含原標題／副標／裝飾線） -->
  <rect x="40" y="625" width="1120" height="155" fill="${bg}"/>
  <text x="600" y="668" text-anchor="middle" fill="#0a1a2e" font-size="18" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="0.9">${escapeXml(title)}</text>
  <line x1="220" y1="688" x2="980" y2="688" stroke="#c5d0e0" stroke-width="1.3"/>
  <text x="600" y="716" text-anchor="middle" fill="#5a6a80" font-size="14" font-family="Segoe UI, Helvetica, Arial, sans-serif">${escapeXml(credit)}</text>
</svg>`;
}

async function write(
  outName: string,
  _unusedBase: string,
  title: string,
  credit: string,
  scores: Scores,
) {
  if (!fs.existsSync(TEMPLATE)) {
    throw new Error(`缺少 J2CR 模板：${TEMPLATE}`);
  }
  const overlay = await sharp(Buffer.from(stampSvg(title, credit, scores)))
    .png()
    .toBuffer();
  const dest = path.join(OUT, outName);
  await sharp(TEMPLATE)
    .resize(1200, 800, { fit: "fill" })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(dest);
  console.log("OK", outName);
}

const INFERNO: Scores = {
  spin: 8.8,
  forgiveness: 8.1,
  control: 7.2,
  pop: 9.0,
  maneuverability: 8.0,
  power: 9.5,
};
const CANNON: Scores = {
  spin: 8.5,
  forgiveness: 8.2,
  control: 7.8,
  pop: 8.7,
  maneuverability: 7.6,
  power: 8.8,
};
const GLIDER: Scores = {
  spin: 9.0,
  forgiveness: 8.5,
  control: 9.0,
  pop: 7.5,
  maneuverability: 9.3,
  power: 7.8,
};
const RPM_V2: Scores = {
  spin: 9.2,
  forgiveness: 8.5,
  control: 8.0,
  pop: 9.0,
  maneuverability: 8.4,
  power: 9.1,
};
const PRH = "Tested. Ranked. Real. - PaddleReviewHub.com";

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  await write(
    "enhance-mpp-widebody-radar.jpg",
    "enhance-mpp-widebody-radar.jpg",
    "ENHANCE MPP TURBO WIDEBODY PERFORMANCE DISTRIBUTION",
    PRH,
    {
      spin: 9.2,
      forgiveness: 9.3,
      control: 8.9,
      pop: 9.4,
      maneuverability: 9.4,
      power: 9.1,
    },
  );
  await write(
    "enhance-mpp-elongated-radar.jpg",
    "enhance-mpp-elongated-radar.jpg",
    "ENHANCE MPP TURBO ELONGATED PERFORMANCE DISTRIBUTION",
    PRH,
    {
      spin: 9.4,
      forgiveness: 8.6,
      control: 8.7,
      pop: 9.5,
      maneuverability: 8.7,
      power: 9.4,
    },
  );
  await write(
    "honolulu-j6cr-radar.jpg",
    "honolulu-j6cr-radar.jpg",
    "HONOLULU J6CR CRYSTAL BLUE PERFORMANCE DISTRIBUTION",
    PRH,
    {
      spin: 9.4,
      forgiveness: 8.8,
      control: 8.7,
      pop: 9.2,
      maneuverability: 9.0,
      power: 9.4,
    },
  );

  const infernoVariants: [string, string][] = [
    ["luzz-inferno-zero-radar.jpg", "LUZZ INFERNO ZERO / FROZEN PERFORMANCE DISTRIBUTION"],
    ["luzz-inferno-darkness-radar.jpg", "LUZZ INFERNO DARKNESS PERFORMANCE DISTRIBUTION"],
    ["luzz-inferno-pink-purple-radar.jpg", "LUZZ INFERNO PINK PURPLE PERFORMANCE DISTRIBUTION"],
    ["luzz-inferno-blue-flame-radar.jpg", "LUZZ INFERNO BLUE FLAME PERFORMANCE DISTRIBUTION"],
    ["luzz-tornado-black-radar.jpg", "LUZZ TORNADO BLACK PERFORMANCE DISTRIBUTION"],
    ["luzz-tornado-purple-radar.jpg", "LUZZ TORNADO PURPLE PERFORMANCE DISTRIBUTION"],
  ];
  for (const [out, title] of infernoVariants) {
    await write(out, "_tpl-luzz-inferno-radar.jpg", title, PRH, INFERNO);
  }

  const cannonVariants: [string, string][] = [
    ["luzz-cannon-g1-black-radar.jpg", "LUZZ CANNON GEN 1 BLACK PERFORMANCE DISTRIBUTION"],
    ["luzz-cannon-g1-collab-radar.jpg", "LUZZ CANNON GEN 1 CO-BRANDED PERFORMANCE DISTRIBUTION"],
    ["luzz-cannon-g1-candy-radar.jpg", "LUZZ CANNON GEN 1 CANDY / HONEY PERFORMANCE DISTRIBUTION"],
    ["luzz-cannon-g1-ex-radar.jpg", "LUZZ CANNON GEN 1 EX PERFORMANCE DISTRIBUTION"],
    ["luzz-cannon-g2-black-radar.jpg", "LUZZ CANNON GEN 2 BLACK PERFORMANCE DISTRIBUTION"],
    ["luzz-cannon-g2-collab-radar.jpg", "LUZZ CANNON GEN 2 CO-BRANDED PERFORMANCE DISTRIBUTION"],
  ];
  for (const [out, title] of cannonVariants) {
    await write(out, "_tpl-luzz-cannon-radar.jpg", title, PRH, CANNON);
  }

  const gliderVariants: [string, string][] = [
    ["luzz-glider-2026-radar.jpg", "LUZZ GLIDER 2026 PERFORMANCE DISTRIBUTION"],
    ["luzz-glider-signature-radar.jpg", "LUZZ GLIDER SIGNATURE PERFORMANCE DISTRIBUTION"],
    ["luzz-glider-gatsby-radar.jpg", "LUZZ GLIDER GATSBY PERFORMANCE DISTRIBUTION"],
  ];
  for (const [out, title] of gliderVariants) {
    await write(out, "_tpl-luzz-glider-radar.jpg", title, PRH, GLIDER);
  }

  await write(
    "luzz-bladz-longyuan-radar.jpg",
    "luzz-bladz-longyuan-radar.jpg",
    "LUZZ PRO BLADZ 2 LONG YUAN PERFORMANCE DISTRIBUTION",
    "Estimated from Luzz lineup context",
    {
      spin: 8.8,
      forgiveness: 8.4,
      control: 8.6,
      pop: 8.5,
      maneuverability: 8.8,
      power: 8.4,
    },
  );
  await write(
    "pakle-fuse-radar.jpg",
    "pakle-fuse-radar.jpg",
    "PAKLE FUSE PERFORMANCE DISTRIBUTION",
    "Mapped from Matt's Pickleball lab notes",
    {
      spin: 9.1,
      forgiveness: 8.8,
      control: 7.5,
      pop: 9.5,
      maneuverability: 9.1,
      power: 9.3,
    },
  );
  await write(
    "rpm-q2-radar.jpg",
    "rpm-q2-radar.jpg",
    "RPM Q2 PERFORMANCE DISTRIBUTION",
    PRH,
    {
      spin: 9.4,
      forgiveness: 9.1,
      control: 8.7,
      pop: 9.2,
      maneuverability: 9.3,
      power: 9.3,
    },
  );
  await write(
    "rpm-v2-radar.jpg",
    "_tpl-rpm-v2-radar.jpg",
    "RPM V2 PERFORMANCE DISTRIBUTION",
    PRH,
    RPM_V2,
  );
  await write(
    "rpm-v2-pink-radar.jpg",
    "_tpl-rpm-v2-radar.jpg",
    "RPM V2 PINK PERFORMANCE DISTRIBUTION",
    PRH,
    RPM_V2,
  );
  await write(
    "sypik-triton5-radar.jpg",
    "sypik-triton5-radar.jpg",
    "SYPIK TRITON5 PERFORMANCE DISTRIBUTION",
    "Mapped from PicklrLab scores",
    {
      spin: 8.8,
      forgiveness: 8.7,
      control: 9.0,
      pop: 8.4,
      maneuverability: 9.0,
      power: 8.5,
    },
  );
  await write(
    "zocker-aspire-signature-radar.jpg",
    "zocker-aspire-signature-radar.jpg",
    "ZOCKER ASPIRE SIGNATURE PERFORMANCE DISTRIBUTION",
    "Mapped from PicklePlay review scores",
    {
      spin: 8.5,
      forgiveness: 9.5,
      control: 9.0,
      pop: 8.3,
      maneuverability: 8.8,
      power: 8.5,
    },
  );

  console.log("\nDone. All radars rebuilt from clean J2CR template (single text layer).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
