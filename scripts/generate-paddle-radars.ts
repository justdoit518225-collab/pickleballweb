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

function buildSvg(spec: RadarSpec): string {
  // Match J2CR reference asset: 1200×800 (3:2) so on-page size matches.
  const W = 1200;
  const H = 800;
  const cx = 600;
  const cy = 340;
  const maxR = 215;
  const labelR = 262;
  const markerR = 252;

  const rings = [2, 4, 6, 8, 10]
    .map((n) => {
      const r = (n / 10) * maxR;
      return `<polygon points="${hexPoints(cx, cy, r)}" fill="none" stroke="#b8c9dd" stroke-width="${n === 10 ? 2 : 1.2}"/>
      <text x="${cx + 9}" y="${(cy - r + 4).toFixed(1)}" fill="#67809e" font-size="13" font-weight="700" font-family="Segoe UI, Helvetica, Arial, sans-serif">${n}</text>`;
    })
    .join("\n");

  const spokes = AXES.map((_, i) => {
    const p = polar(cx, cy, maxR, i * 60);
    return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}" stroke="#aec2da" stroke-width="1.2"/>`;
  }).join("\n");

  const labels = AXES.map((axis, i) => {
    const p = polar(cx, cy, labelR, i * 60);
    const score = spec.scores[axis.key];
    const anchor =
      i === 0 || i === 3 ? "middle" : i === 1 || i === 2 ? "start" : "end";
    const dx = i === 1 || i === 2 ? 6 : i === 4 || i === 5 ? -6 : 0;
    const dy = i === 0 ? -2 : i === 3 ? 12 : 3;
    const labelSize = axis.label.length > 12 ? 15 : 17;
    return `
      <text x="${(p.x + dx).toFixed(2)}" y="${(p.y + dy - 11).toFixed(2)}" text-anchor="${anchor}" fill="#0a1a2e" font-size="${labelSize}" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="0.6">${axis.label}</text>
      <text x="${(p.x + dx).toFixed(2)}" y="${(p.y + dy + 13).toFixed(2)}" text-anchor="${anchor}" fill="#167ce4" font-size="24" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif">${fmt(score)}</text>
      <polygon points="${triangleAt(cx, cy, markerR, i)}" fill="#2b7de9"/>`;
  }).join("\n");

  const dataPts = dataPolygon(cx, cy, maxR, spec.scores);

  // Chamfered tech frame for 1200×800
  const frameOuter =
    "M22 88 L88 22 H1112 L1178 88 V712 L1112 778 H88 L22 712Z";
  const frameInner =
    "M48 100 L100 48 H1100 L1152 100 V700 L1100 752 H100 L48 700Z";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.1" fill="#8aa1bc"/>
    </pattern>
    <linearGradient id="fillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#43bcff" stop-opacity="0.72"/>
      <stop offset="48%" stop-color="#497df4" stop-opacity="0.56"/>
      <stop offset="100%" stop-color="#a354dd" stop-opacity="0.48"/>
    </linearGradient>
    <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#d9f9ff"/>
      <stop offset="45%" stop-color="#5ec8ff"/>
      <stop offset="100%" stop-color="#78c7ff"/>
    </linearGradient>
    <filter id="cyanGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="wide"/>
      <feFlood flood-color="#4ec8ff" flood-opacity="0.65" result="glowColor"/>
      <feComposite in="glowColor" in2="wide" operator="in" result="outerGlow"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="tight"/>
      <feMerge><feMergeNode in="outerGlow"/><feMergeNode in="tight"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="ledGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#fbfcff"/>
  <rect x="55" y="55" width="${W - 110}" height="${H - 110}" fill="url(#dotGrid)" opacity="0.22"/>
  <path d="${frameOuter} ${frameInner}" fill="#0a1a2e" fill-rule="evenodd"/>
  <path d="M48 100 L100 48 H1100 L1152 100 M48 700 L100 752 H1100 L1152 700" fill="none" stroke="#234567" stroke-width="2.5"/>
  <g fill="none" stroke="#5ec8ff" stroke-linecap="square" filter="url(#ledGlow)">
    <path d="M46 150 V88 L88 46 H150" stroke-width="6"/>
    <path d="M1050 46 H1112 L1154 88 V150" stroke-width="6"/>
    <path d="M46 650 V712 L88 754 H150" stroke-width="6"/>
    <path d="M1050 754 H1112 L1154 712 V650" stroke-width="6"/>
  </g>
  ${rings}
  ${spokes}
  <polygon points="${dataPts}" fill="url(#fillGrad)" stroke="#4ec8ff" stroke-width="9" opacity="0.75" filter="url(#cyanGlow)"/>
  <polygon points="${dataPts}" fill="url(#fillGrad)" stroke="url(#strokeGrad)" stroke-width="4.5"/>
  <polygon points="${dataPts}" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.95" stroke-dasharray="20 30" stroke-linecap="round"/>
  ${AXES.map((axis, i) => {
    const v = spec.scores[axis.key];
    const p = polar(cx, cy, (Math.min(10, Math.max(0, v)) / 10) * maxR, i * 60);
    return `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="6.5" fill="#eefdff" stroke="#4ec8ff" stroke-width="3"/><circle cx="${(p.x - 1.6).toFixed(2)}" cy="${(p.y - 1.6).toFixed(2)}" r="1.8" fill="#fff"/>`;
  }).join("\n")}
  ${labels}
  <text x="${cx}" y="668" text-anchor="middle" fill="#0a1a2e" font-size="20" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="1.1">${escapeXml(spec.title)}</text>
  <line x1="220" y1="690" x2="${W - 220}" y2="690" stroke="#b8c9dd" stroke-width="1.4"/>
  <text x="${cx}" y="716" text-anchor="middle" fill="#526b88" font-size="15" font-family="Segoe UI, Helvetica, Arial, sans-serif">${escapeXml(spec.footerCredit)}</text>
</svg>`;
}

function triangleAt(cx: number, cy: number, r: number, i: number) {
  const inward = polar(cx, cy, r, i * 60);
  const ox = inward.x;
  const oy = inward.y;
  const ang = ((i * 60 - 90) * Math.PI) / 180;
  const s = 7;
  const p1 = { x: ox, y: oy };
  const p2 = {
    x: ox - Math.cos(ang + 2.4) * s,
    y: oy - Math.sin(ang + 2.4) * s,
  };
  const p3 = {
    x: ox - Math.cos(ang - 2.4) * s,
    y: oy - Math.sin(ang - 2.4) * s,
  };
  return `${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)}`;
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function writeJpg(spec: RadarSpec) {
  const svg = buildSvg(spec);
  const file = path.join(OUT_DIR, `${spec.slug}-radar.jpg`);
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90, mozjpeg: true })
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
