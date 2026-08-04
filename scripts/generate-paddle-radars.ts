/**
 * 為尚無雷達圖的球拍產出能力值圖，並僅附加到內文開頭。
 * 用法：npx tsx scripts/generate-paddle-radars.ts
 *
 * 分數優先 PaddleReviewHub；無對應頁再採網路評測並標註來源。
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import sharp from "sharp";

type Scores = {
  spin: number;
  forgiveness: number;
  control: number;
  pop: number;
  maneuverability: number;
  power: number;
};

type RadarSpec = {
  slug: string;
  title: string;
  scores: Scores;
  sourceNoteHtml: string;
  footerCredit: string;
};

const AXES: { key: keyof Scores; label: string }[] = [
  { key: "spin", label: "SPIN" },
  { key: "forgiveness", label: "FORGIVENESS" },
  { key: "control", label: "CONTROL" },
  { key: "pop", label: "POP" },
  { key: "maneuverability", label: "MANEUVERABILITY" },
  { key: "power", label: "POWER" },
];

const OUT_DIR = path.join(process.cwd(), "public", "paddles");

function fmt(n: number) {
  return n.toFixed(1);
}

function scoreLine(s: Scores) {
  return `SPIN ${fmt(s.spin)} · FORGIVENESS ${fmt(s.forgiveness)} · CONTROL ${fmt(s.control)} · POP ${fmt(s.pop)} · MANEUVERABILITY ${fmt(s.maneuverability)} · POWER ${fmt(s.power)}`;
}

function prh(
  slug: string,
  title: string,
  scores: Scores,
  reviewPath: string,
  reviewLabel: string,
): RadarSpec {
  return {
    slug,
    title,
    scores,
    sourceNoteHtml: `能力值來源：<a href="https://paddlereviewhub.com/reviews/${reviewPath}">PaddleReviewHub — ${reviewLabel}</a>（${scoreLine(scores)}）`,
    footerCredit: "Tested. Ranked. Real. — PaddleReviewHub.com",
  };
}

function web(
  slug: string,
  title: string,
  scores: Scores,
  noteHtml: string,
  credit: string,
): RadarSpec {
  return {
    slug,
    title,
    scores,
    sourceNoteHtml: `能力值來源：${noteHtml}（${scoreLine(scores)}）`,
    footerCredit: credit,
  };
}

/** PRH 同平台變體共用分數（不同塗裝／聯名） */
const INFERNO: Scores = {
  power: 9.5,
  control: 7.2,
  spin: 8.8,
  pop: 9.0,
  forgiveness: 8.1,
  maneuverability: 8.0,
};
const GLIDER: Scores = {
  power: 7.8,
  control: 9.0,
  spin: 9.0,
  pop: 7.5,
  forgiveness: 8.5,
  maneuverability: 9.3,
};
const CANNON: Scores = {
  power: 8.8,
  control: 7.8,
  spin: 8.5,
  pop: 8.7,
  forgiveness: 8.2,
  maneuverability: 7.6,
};
const RPM_V2: Scores = {
  power: 9.1,
  control: 8.0,
  spin: 9.2,
  pop: 9.0,
  forgiveness: 8.5,
  maneuverability: 8.4,
};

const SPECS: RadarSpec[] = [
  prh(
    "enhance-mpp-widebody",
    "ENHANCE MPP TURBO WIDEBODY PERFORMANCE DISTRIBUTION",
    {
      power: 9.1,
      control: 8.9,
      spin: 9.2,
      pop: 9.4,
      forgiveness: 9.3,
      maneuverability: 9.4,
    },
    "enhance-mpp-turbo-widebody",
    "MPP Turbo Widebody",
  ),
  prh(
    "enhance-mpp-elongated",
    "ENHANCE MPP TURBO ELONGATED PERFORMANCE DISTRIBUTION",
    {
      power: 9.4,
      control: 8.7,
      spin: 9.4,
      pop: 9.5,
      forgiveness: 8.6,
      maneuverability: 8.7,
    },
    "enhance-mpp-turbo",
    "MPP Turbo Elongated",
  ),
  prh(
    "honolulu-j6cr",
    "HONOLULU J6CR CRYSTAL BLUE PERFORMANCE DISTRIBUTION",
    {
      power: 9.4,
      control: 8.7,
      spin: 9.4,
      pop: 9.2,
      forgiveness: 8.8,
      maneuverability: 9.0,
    },
    "honolulu-j6cr-crystal-blue",
    "J6CR Crystal Blue",
  ),
  // Inferno 塗裝變體 — PRH：Blue Blaze = 標準 Inferno 同平台
  ...[
    ["luzz-inferno-zero", "LUZZ INFERNO ZERO / FROZEN"],
    ["luzz-inferno-darkness", "LUZZ INFERNO DARKNESS"],
    ["luzz-inferno-pink-purple", "LUZZ INFERNO PINK PURPLE"],
    ["luzz-inferno-blue-flame", "LUZZ INFERNO BLUE FLAME"],
    ["luzz-tornado-black", "LUZZ TORNADO BLACK"],
    ["luzz-tornado-purple", "LUZZ TORNADO PURPLE"],
  ].map(([slug, title]) =>
    prh(
      slug,
      `${title} PERFORMANCE DISTRIBUTION`,
      INFERNO,
      "luzz-pro-4-blue-blaze-inferno",
      "Pro 4 Inferno（同平台）",
    ),
  ),
  // Cannon Gen1 / Gen2
  ...[
    ["luzz-cannon-g1-black", "LUZZ CANNON GEN 1 BLACK"],
    ["luzz-cannon-g1-collab", "LUZZ CANNON GEN 1 CO-BRANDED"],
    ["luzz-cannon-g1-candy", "LUZZ CANNON GEN 1 CANDY / HONEY"],
    ["luzz-cannon-g1-ex", "LUZZ CANNON GEN 1 EX"],
    ["luzz-cannon-g2-black", "LUZZ CANNON GEN 2 BLACK"],
    ["luzz-cannon-g2-collab", "LUZZ CANNON GEN 2 CO-BRANDED"],
  ].map(([slug, title]) =>
    prh(
      slug,
      `${title} PERFORMANCE DISTRIBUTION`,
      CANNON,
      "luzz-cannon",
      "Pro-Cannon（同平台）",
    ),
  ),
  // Glider 變體
  ...[
    ["luzz-glider-2026", "LUZZ GLIDER 2026"],
    ["luzz-glider-signature", "LUZZ GLIDER SIGNATURE"],
    ["luzz-glider-gatsby", "LUZZ GLIDER GATSBY"],
  ].map(([slug, title]) =>
    prh(
      slug,
      `${title} PERFORMANCE DISTRIBUTION`,
      GLIDER,
      "luzz-glider-2026",
      "Glider 2026 Hybrid（同平台）",
    ),
  ),
  // Bladz — PRH 無專頁；採 Glider／Cannon 區間 + 產品定位（控制偏攻）
  web(
    "luzz-bladz-longyuan",
    "LUZZ PRO BLADZ 2 LONG YUAN PERFORMANCE DISTRIBUTION",
    {
      spin: 8.8,
      forgiveness: 8.4,
      control: 8.6,
      pop: 8.5,
      maneuverability: 8.8,
      power: 8.4,
    },
    `網路綜合（<a href="https://paddlereviewhub.com/reviews/">PaddleReviewHub</a> 無對應頁；參考同牌 <a href="https://paddlereviewhub.com/reviews/luzz-glider-2026">Glider</a>／<a href="https://paddlereviewhub.com/reviews/luzz-cannon">Cannon</a> 區間與產品定位推估）`,
    "Estimated from Luzz lineup context",
  ),
  web(
    "pakle-fuse",
    "PAKLE FUSE PERFORMANCE DISTRIBUTION",
    {
      spin: 9.1,
      forgiveness: 8.8,
      control: 7.5,
      pop: 9.5,
      maneuverability: 9.1,
      power: 9.3,
    },
    `<a href="https://www.mattspickleball.com/brand/pakle-pickleball">Matt's Pickleball</a> 實驗室數據與現場評測換算（PRH 無對應頁）`,
    "Mapped from Matt's Pickleball lab notes",
  ),
  prh(
    "rpm-q2",
    "RPM Q2 PERFORMANCE DISTRIBUTION",
    {
      power: 9.3,
      control: 8.7,
      spin: 9.4,
      pop: 9.2,
      forgiveness: 9.1,
      maneuverability: 9.3,
    },
    "rpm-q2-widebody-16mm",
    "Q2 Widebody 16mm",
  ),
  prh(
    "rpm-v2",
    "RPM V2 PERFORMANCE DISTRIBUTION",
    RPM_V2,
    "rpm-friction-pro-elongated-v2",
    "Friction Pro Elongated V2",
  ),
  prh(
    "rpm-v2-pink",
    "RPM V2 PINK PERFORMANCE DISTRIBUTION",
    RPM_V2,
    "rpm-friction-pro-elongated-v2",
    "Friction Pro Elongated V2（同平台）",
  ),
  web(
    "sypik-triton5",
    "SYPIK TRITON5 PERFORMANCE DISTRIBUTION",
    {
      spin: 8.8,
      forgiveness: 8.7,
      control: 9.0,
      pop: 8.4,
      maneuverability: 9.0,
      power: 8.5,
    },
    `<a href="https://picklrlab.com/reviews/sypik-triton-5-pro">PicklrLab — Triton 5 Pro</a> 分數換算至 10 分制（PRH 無對應頁）`,
    "Mapped from PicklrLab scores",
  ),
  web(
    "zocker-aspire-signature",
    "ZOCKER ASPIRE SIGNATURE PERFORMANCE DISTRIBUTION",
    {
      spin: 8.5,
      forgiveness: 9.5,
      control: 9.0,
      pop: 8.3,
      maneuverability: 8.8,
      power: 8.5,
    },
    `<a href="https://pickleplay.vn/en/blogs/review-vot-pickleball/review-vot-pickleball-zocker-aspire-signature-x-phuc-huynh-vot-chu-ky-dinh-cao-cua-lang-pickleball-viet">PicklePlay — Aspire Signature</a>（PRH 無對應頁）`,
    "Mapped from PicklePlay review scores",
  ),
];

const TEMPLATE = path.join(
  OUT_DIR,
  "honolulu-j2cr-crystal-blue-radar.jpg",
);

/** J2CR 模板幾何（1200×800）— 只覆蓋分數／多邊形／標題，外框完全沿用原圖 */
const GEO = {
  W: 1200,
  H: 800,
  cx: 600,
  cy: 348,
  maxR: 228,
  /** 分數數字覆蓋區（蓋住原圖藍色分數） */
  scoreBoxes: [
    // SPIN
    { x: 555, y: 95, w: 90, h: 40 },
    // FORGIVENESS
    { x: 850, y: 195, w: 95, h: 42 },
    // CONTROL
    { x: 850, y: 490, w: 95, h: 42 },
    // POP
    { x: 555, y: 575, w: 90, h: 40 },
    // MANEUVERABILITY
    { x: 250, y: 490, w: 100, h: 42 },
    // POWER
    { x: 250, y: 195, w: 95, h: 42 },
  ] as { x: number; y: number; w: number; h: number }[],
  titleCover: { x: 100, y: 630, w: 1000, h: 100 },
};

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
  return AXES.map((axis, i) => {
    const v = scores[axis.key];
    const p = polar(cx, cy, (Math.min(10, Math.max(0, v)) / 10) * maxR, i * 60);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(" ");
}

/** 透明底 SVG：疊在 J2CR 原圖上，只改能力值區域與標題 */
function buildOverlaySvg(spec: RadarSpec): string {
  const { W, H, cx, cy, maxR, scoreBoxes, titleCover } = GEO;
  const dataPts = dataPolygon(cx, cy, maxR, spec.scores);
  const eraseR = maxR + 18;
  const bg = "#f5f2f2";

  const rings = [2, 4, 6, 8, 10]
    .map((n) => {
      const r = (n / 10) * maxR;
      return `<polygon points="${hexPoints(cx, cy, r)}" fill="none" stroke="#d0dbe8" stroke-width="${n === 10 ? 1.8 : 1.1}" opacity="0.95"/>
      <text x="${cx + 8}" y="${(cy - r + 4).toFixed(1)}" fill="#7a8ea8" font-size="12" font-weight="700" font-family="Segoe UI, Helvetica, Arial, sans-serif">${n}</text>`;
    })
    .join("\n");

  const spokes = AXES.map((_, i) => {
    const p = polar(cx, cy, maxR, i * 60);
    return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}" stroke="#c8d5e4" stroke-width="1.1"/>`;
  }).join("\n");

  const scoreTexts = AXES.map((axis, i) => {
    const box = scoreBoxes[i];
    const score = spec.scores[axis.key];
    const tx = box.x + box.w / 2;
    const ty = box.y + box.h / 2 + 9;
    return `
      <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="4" fill="${bg}"/>
      <text x="${tx}" y="${ty}" text-anchor="middle" fill="#1a6fd4" font-size="28" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif">${fmt(score)}</text>`;
  }).join("\n");

  const vertices = AXES.map((axis, i) => {
    const v = spec.scores[axis.key];
    const p = polar(cx, cy, (Math.min(10, Math.max(0, v)) / 10) * maxR, i * 60);
    return `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="6" fill="#ffffff" stroke="#7adfff" stroke-width="3"/>
    <circle cx="${(p.x - 1.5).toFixed(2)}" cy="${(p.y - 1.5).toFixed(2)}" r="1.6" fill="#fff" opacity="0.9"/>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="fillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#5ec8ff" stop-opacity="0.82"/>
      <stop offset="45%" stop-color="#5b7ef5" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#c24ee0" stop-opacity="0.58"/>
    </linearGradient>
    <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#9aecff"/>
      <stop offset="100%" stop-color="#6ad4ff"/>
    </linearGradient>
    <filter id="crystalGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="wide"/>
      <feFlood flood-color="#6ad4ff" flood-opacity="0.85" result="c"/>
      <feComposite in="c" in2="wide" operator="in" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- 擦除原多邊形＋格線，保留四角外框與軸名稱 -->
  <polygon points="${hexPoints(cx, cy, eraseR)}" fill="${bg}"/>
  ${rings}
  ${spokes}
  <text x="${cx + 8}" y="${(cy + 4).toFixed(1)}" fill="#7a8ea8" font-size="12" font-weight="700" font-family="Segoe UI, Helvetica, Arial, sans-serif">0</text>
  <!-- 新能力值（水晶邊近似） -->
  <polygon points="${dataPts}" fill="none" stroke="#7adfff" stroke-width="16" opacity="0.45" filter="url(#crystalGlow)"/>
  <polygon points="${dataPts}" fill="url(#fillGrad)" stroke="url(#strokeGrad)" stroke-width="7"/>
  <polygon points="${dataPts}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-opacity="0.9"/>
  ${vertices}
  ${scoreTexts}
  <!-- 標題區 -->
  <rect x="${titleCover.x}" y="${titleCover.y}" width="${titleCover.w}" height="${titleCover.h}" fill="${bg}"/>
  <text x="${cx}" y="${titleCover.y + 36}" text-anchor="middle" fill="#0a1a2e" font-size="20" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="1">${escapeXml(spec.title)}</text>
  <line x1="240" y1="${titleCover.y + 52}" x2="${W - 240}" y2="${titleCover.y + 52}" stroke="#c5d0e0" stroke-width="1.3"/>
  <text x="${cx}" y="${titleCover.y + 76}" text-anchor="middle" fill="#5a6a80" font-size="14" font-family="Segoe UI, Helvetica, Arial, sans-serif">${escapeXml(spec.footerCredit)}</text>
</svg>`;
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function writeJpg(spec: RadarSpec) {
  if (!fs.existsSync(TEMPLATE)) {
    throw new Error(`缺少 J2CR 模板圖：${TEMPLATE}`);
  }
  const overlay = Buffer.from(buildOverlaySvg(spec));
  const overlayPng = await sharp(overlay).png().toBuffer();
  const file = path.join(OUT_DIR, `${spec.slug}-radar.jpg`);
  await sharp(TEMPLATE)
    .composite([{ input: overlayPng, top: 0, left: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(file);
  return `/paddles/${spec.slug}-radar.jpg`;
}

function prependHtml(spec: RadarSpec, imgSrc: string) {
  return [
    `<p><img src="${imgSrc}" alt="${escapeXml(spec.title)}" /></p>`,
    `<p><em>${spec.sourceNoteHtml}</em></p>`,
  ].join("");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (process.argv.includes("--images-only")) {
    for (const spec of SPECS) {
      const imgSrc = await writeJpg(spec);
      console.log("WROTE", spec.slug, "→", imgSrc);
    }
    console.log(`\nDone. regenerated=${SPECS.length}`);
    return;
  }

  const bySlug = new Map(SPECS.map((s) => [s.slug, s]));

  const paddles = await prisma.paddle.findMany({
    select: { id: true, slug: true, description: true },
    orderBy: { slug: "asc" },
  });

  let updated = 0;
  let skipped = 0;

  for (const p of paddles) {
    if (p.slug === "honolulu-j2cr") {
      console.log("skip (already done)", p.slug);
      skipped++;
      continue;
    }
    const spec = bySlug.get(p.slug);
    if (!spec) {
      console.warn("NO SPEC for", p.slug);
      continue;
    }
    const marker = `${spec.slug}-radar.jpg`;
    if (p.description.includes(marker)) {
      console.log("already has radar", p.slug);
      skipped++;
      continue;
    }
    const imgSrc = await writeJpg(spec);
    const next = `${prependHtml(spec, imgSrc)}${p.description}`;
    await prisma.paddle.update({
      where: { id: p.id },
      data: { description: next },
    });
    updated++;
    console.log("OK", p.slug, "→", imgSrc);
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
