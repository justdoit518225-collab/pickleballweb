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
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
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
  const W = 1200;
  const H = 1200;
  const cx = 600;
  const cy = 520;
  const maxR = 320;
  const labelR = 390;

  const rings = [2, 4, 6, 8, 10]
    .map((n) => {
      const r = (n / 10) * maxR;
      return `<polygon points="${hexPoints(cx, cy, r)}" fill="none" stroke="#c5d0e0" stroke-width="1.5"/>
      <text x="${cx + 8}" y="${(cy - r).toFixed(1)}" fill="#8a96a8" font-size="14" font-family="Segoe UI, Helvetica, Arial, sans-serif">${n}</text>`;
    })
    .join("\n");

  const spokes = AXES.map((_, i) => {
    const p = polar(cx, cy, maxR, i * 60);
    return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}" stroke="#d0dae8" stroke-width="1"/>`;
  }).join("\n");

  const labels = AXES.map((axis, i) => {
    const p = polar(cx, cy, labelR, i * 60);
    const score = spec.scores[axis.key];
    const anchor =
      i === 0 || i === 3 ? "middle" : i === 1 || i === 2 ? "start" : "end";
    const dx = i === 1 || i === 2 ? 8 : i === 4 || i === 5 ? -8 : 0;
    const dy = i === 0 ? -6 : i === 3 ? 18 : 6;
    return `
      <text x="${(p.x + dx).toFixed(2)}" y="${(p.y + dy - 14).toFixed(2)}" text-anchor="${anchor}" fill="#0b1f3a" font-size="22" font-weight="700" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="1">${axis.label}</text>
      <text x="${(p.x + dx).toFixed(2)}" y="${(p.y + dy + 14).toFixed(2)}" text-anchor="${anchor}" fill="#1a6fd4" font-size="28" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif">${fmt(score)}</text>
      <polygon points="${triangleAt(p.x, p.y, i)}" fill="#2b7de9"/>`;
  }).join("\n");

  const dataPts = dataPolygon(cx, cy, maxR, spec.scores);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="fillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4db7ff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#8b6cff" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5ec8ff"/>
      <stop offset="100%" stop-color="#7a8cff"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#f7f9fc"/>
  <!-- tech frame -->
  <rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="none" stroke="#0b1f3a" stroke-width="18"/>
  <rect x="48" y="48" width="${W - 96}" height="${H - 96}" fill="none" stroke="#2b7de9" stroke-width="3"/>
  <path d="M48 120 L48 48 L120 48" fill="none" stroke="#5ec8ff" stroke-width="6"/>
  <path d="M${W - 48} 120 L${W - 48} 48 L${W - 120} 48" fill="none" stroke="#5ec8ff" stroke-width="6"/>
  <path d="M48 ${H - 120} L48 ${H - 48} L120 ${H - 48}" fill="none" stroke="#5ec8ff" stroke-width="6"/>
  <path d="M${W - 48} ${H - 120} L${W - 48} ${H - 48} L${W - 120} ${H - 48}" fill="none" stroke="#5ec8ff" stroke-width="6"/>
  <!-- faint grid -->
  <g opacity="0.25" stroke="#9aa8bc" stroke-width="0.8">
    ${Array.from({ length: 12 }, (_, i) => {
      const x = 100 + i * 90;
      return `<line x1="${x}" y1="90" x2="${x}" y2="${H - 200}"/>`;
    }).join("")}
  </g>
  ${rings}
  ${spokes}
  <polygon points="${dataPts}" fill="url(#fillGrad)" stroke="url(#strokeGrad)" stroke-width="4" filter="url(#glow)"/>
  ${AXES.map((axis, i) => {
    const v = spec.scores[axis.key];
    const p = polar(cx, cy, (Math.min(10, Math.max(0, v)) / 10) * maxR, i * 60);
    return `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="7" fill="#fff" stroke="#2b7de9" stroke-width="3"/>`;
  }).join("\n")}
  ${labels}
  <line x1="180" y1="${H - 145}" x2="${W - 180}" y2="${H - 145}" stroke="#c5d0e0" stroke-width="2"/>
  <text x="${cx}" y="${H - 100}" text-anchor="middle" fill="#0b1f3a" font-size="26" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="1.5">${escapeXml(spec.title)}</text>
  <text x="${cx}" y="${H - 62}" text-anchor="middle" fill="#5a6a80" font-size="18" font-family="Segoe UI, Helvetica, Arial, sans-serif">${escapeXml(spec.footerCredit)}</text>
</svg>`;
}

function triangleAt(x: number, y: number, i: number) {
  // small inward-pointing marker near label
  const inward = polar(600, 520, 355, i * 60);
  const ox = inward.x;
  const oy = inward.y;
  const ang = ((i * 60 - 90) * Math.PI) / 180;
  const s = 9;
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
