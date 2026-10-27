/**
 * 依 PIKA 教練團主價格表（2026.10.01）補上站上尚未收錄的球拍、縮圖與六角雷達圖
 * 用法：npx tsx scripts/add-pika-missing-paddles-2026-10.ts
 *
 * 新增品項：
 * - BREAD & BUTTER — Loco 2 (bread-and-butter-loco2)
 * - 11SIX24 — Power 2 (11six24-power2)
 * - 11SIX24 — Jelly Bean 2 (11six24-jelly-bean2)
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import sharp from "sharp";

const CARD_GREY = { r: 0xec, g: 0xec, b: 0xec };
const WHITE_THRESHOLD = 235;
const OUT_DIR = path.join(process.cwd(), "public", "paddles");
const TEMPLATE = path.join(OUT_DIR, "honolulu-j2cr-crystal-blue-radar.jpg");

type Scores = {
  spin: number;
  forgiveness: number;
  control: number;
  pop: number;
  maneuverability: number;
  power: number;
};

type Entry = {
  brand: string;
  slug: string;
  series: string;
  variant: string;
  nameZh: string;
  nameEn: string;
  listPriceUsd: number | null;
  priceSourceUrl: string | null;
  priceNote: string | null;
  memberPriceTwd: number | null;
  memberPriceNote: string | null;
  highlights: string[];
  imageUrls: string[];
  radarTitle: string;
  radarScores: Scores;
  radarReviewPath: string;
  radarReviewLabel: string;
  bodyHtml: string;
};

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
  <rect x="40" y="625" width="1120" height="155" fill="${bg}"/>
  <text x="600" y="668" text-anchor="middle" fill="#0a1a2e" font-size="18" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="0.9">${escapeXml(title)}</text>
  <line x1="220" y1="688" x2="980" y2="688" stroke="#c5d0e0" stroke-width="1.3"/>
  <text x="600" y="716" text-anchor="middle" fill="#5a6a80" font-size="14" font-family="Segoe UI, Helvetica, Arial, sans-serif">${escapeXml(credit)}</text>
</svg>`;
}

function scoreLine(s: Scores) {
  return `SPIN ${fmt(s.spin)} · FORGIVENESS ${fmt(s.forgiveness)} · CONTROL ${fmt(s.control)} · POP ${fmt(s.pop)} · MANEUVERABILITY ${fmt(s.maneuverability)} · POWER ${fmt(s.power)}`;
}

async function writeRadar(entry: Entry): Promise<string> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(TEMPLATE)) {
    throw new Error(`缺少 J2CR 模板：${TEMPLATE}`);
  }
  const credit = "Tested. Ranked. Real. - PaddleReviewHub.com";
  const overlay = await sharp(
    Buffer.from(stampSvg(entry.radarTitle, credit, entry.radarScores)),
  )
    .png()
    .toBuffer();
  const outName = `${entry.slug}-radar.jpg`;
  const dest = path.join(OUT_DIR, outName);
  await sharp(TEMPLATE)
    .resize(1200, 800, { fit: "fill" })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(dest);
  console.log("radar ok", outName);
  return `/paddles/${outName}`;
}

const ENTRIES: Entry[] = [
  {
    brand: "BREAD & BUTTER",
    slug: "bread-and-butter-loco2",
    series: "Loco 2",
    variant: "-",
    nameZh: "Loco 2",
    nameEn: "Loco 2",
    listPriceUsd: 220,
    priceSourceUrl: "https://www.bnbpickleball.com",
    priceNote: "Hybrid／Elongated 官網同價",
    memberPriceTwd: 7000,
    memberPriceNote: null,
    highlights: ["Loco 2", "Space Dust", "雙密度泡沫", "16mm"],
    imageUrls: [
      "https://paddlereviewhub.com/assets/paddles/bnb-loco-2-hybrid.png",
    ],
    radarTitle: "BREAD & BUTTER LOCO 2 PERFORMANCE DISTRIBUTION",
    radarScores: {
      spin: 9.5,
      forgiveness: 8.6,
      control: 8.3,
      pop: 9.3,
      maneuverability: 9.0,
      power: 9.4,
    },
    radarReviewPath: "bread-butter-loco-2-hybrid",
    radarReviewLabel: "Bread & Butter Loco 2 Hybrid",
    bodyHtml: [
      "<p><em>草稿來源：Bread &amp; Butter 官網與 PaddleReviewHub 評測（請自行編輯）</em></p>",
      '<p>來源：<a href="https://paddlereviewhub.com/reviews/bread-butter-loco-2-hybrid">PaddleReviewHub — Bread &amp; Butter Loco 2</a></p>',
      "<h2>總評</h2>",
      "<p>Bread &amp; Butter Loco 2：二代全面升級的雙密度全泡沫力量拍，結合高密度 EPP 核心與 EVA 穩定外環，拍面採用 T700 原碳搭配玻璃纖維的 CFC 複合結構與全新「Space Dust」長效耐磨旋貼，兼具頂級爆發力、脆彈 pop 與超高轉速（約 2,370 RPM）。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>系列：Loco 2（可選 Hybrid／Elongated）· 厚度 16mm</li>",
      "<li>核心：Dual-Density EPP + EVA 全泡沫核心（無蜂巢結構，消除核心碎裂問題）</li>",
      "<li>拍面：T700 Raw Carbon Fiber + Fiberglass（CFC）+ Space Dust 耐磨旋貼</li>",
      "<li>認證：USAP &amp; UPA-A 雙認證</li>",
      "</ul>",
      "<h2>適合誰</h2>",
      "<p>追求高球速、強大網前反擊（pop）與持久高旋轉的進攻型／全場侵略型球友。</p>",
      "<h2>一句話</h2>",
      "<p>Loco 二代再進化：雙密度全泡沫核心加上 Space Dust 耐磨旋貼，又兇又轉。</p>",
    ].join(""),
  },
  {
    brand: "11SIX24",
    slug: "11six24-power2",
    series: "Power 2",
    variant: "-",
    nameZh: "Power 2",
    nameEn: "Power 2 Series",
    listPriceUsd: 209.99,
    priceSourceUrl: "https://11six24.com/products/ultre-power-2",
    priceNote: "Ultré／Vapor／Hurache-X／Pegasus 各拍型同價",
    memberPriceTwd: 6400,
    memberPriceNote: "贈拍套",
    highlights: ["Power 2", "Gen4", "MPP", "HexGrit"],
    imageUrls: [
      "https://11six24.com/cdn/shop/files/Ultre-power2-teal.png?v=1786476229",
      "https://paddlereviewhub.com/assets/paddles/11six24-ultre-power-2.png",
    ],
    radarTitle: "11SIX24 POWER 2 PERFORMANCE DISTRIBUTION",
    radarScores: {
      spin: 9.3,
      forgiveness: 8.7,
      control: 8.3,
      pop: 8.5,
      maneuverability: 8.6,
      power: 8.8,
    },
    radarReviewPath: "11six24-ultre-power-2",
    radarReviewLabel: "11SIX24 Ultré Power 2",
    bodyHtml: [
      "<p><em>草稿來源：11SIX24 官網與 PaddleReviewHub 評測（請自行編輯）</em></p>",
      '<p>來源：<a href="https://11six24.com/products/ultre-power-2">11SIX24 Power 2 Series</a></p>',
      "<h2>總評</h2>",
      "<p>11SIX24 Power 2：新世代 Gen 4 熱壓全泡沫力量拍，改採雙密度 MPP 浮動全泡沫核心（Floating Foam Core）與高模量碳纖維＋玻璃纖維複合拍面，並導入最新 Tier-1 等級的 HexGrit 長效耐磨旋貼，在保有渾厚底線力量的同時提供更線性、可預測的控球手感。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>拍型選擇：Ultré／Vapor（Hybrid）／Hurache-X（Elongated）／Pegasus（Widebody）· 16mm</li>",
      "<li>核心：Gen 4 Thermoformed Dual-Density MPP Full-Foam Floating Core</li>",
      "<li>拍面：HexGrit 長效耐磨旋貼 + 高模量碳纖維／玻纖複合層（約 2,381 RPM）</li>",
      "<li>認證：UPA-A 認證（部分拍型具雙認證，依官網批次）</li>",
      "</ul>",
      "<h2>適合誰</h2>",
      "<p>想要全泡沫核心的穩定耐用度與紮實力量，同時重視長效旋轉與擊球回饋的進階球友。</p>",
      "<h2>一句話</h2>",
      "<p>11SIX24 四代全泡沫力量主力：HexGrit 咬球超久、力量渾厚好上手。</p>",
    ].join(""),
  },
  {
    brand: "11SIX24",
    slug: "11six24-jelly-bean2",
    series: "Jelly Bean 2",
    variant: "-",
    nameZh: "Jelly Bean 2",
    nameEn: "Jelly Bean 2 Series",
    listPriceUsd: 169.99,
    priceSourceUrl: "https://11six24.com/products/ultre-jelly-bean-2",
    priceNote: "Pegasus／Vapor／Ultré／Hurache-X 各拍型同價",
    memberPriceTwd: 5300,
    memberPriceNote: "贈拍套",
    highlights: ["Jelly Bean 2", "Gen4", "EMA泡沫", "HexGrit", "控制"],
    imageUrls: [
      "https://11six24.com/cdn/shop/files/UltreJellyBean2CosmicGrape.png?v=1785352183",
      "https://paddlereviewhub.com/assets/paddles/11six24-pegasus-jelly-bean-2.png",
    ],
    radarTitle: "11SIX24 JELLY BEAN 2 PERFORMANCE DISTRIBUTION",
    radarScores: {
      spin: 9.4,
      forgiveness: 9.3,
      control: 9.2,
      pop: 8.3,
      maneuverability: 9.0,
      power: 8.2,
    },
    radarReviewPath: "11six24-pegasus-jelly-bean-2",
    radarReviewLabel: "11SIX24 Pegasus Jelly Bean 2",
    bodyHtml: [
      "<p><em>草稿來源：11SIX24 官網與 PaddleReviewHub 評測（請自行編輯）</em></p>",
      '<p>來源：<a href="https://11six24.com/products/ultre-jelly-bean-2">11SIX24 Jelly Bean 2 Series</a></p>',
      "<h2>總評</h2>",
      "<p>11SIX24 Jelly Bean 2：口碑控制名拍 Jelly Bean 的 Gen 4 全泡沫進化版！捨棄傳統聚丙烯蜂巢，改用更柔軟的一體成型 EMA 全泡沫核心，搭配雙層 Toray T700 碳纖維、單層玻纖與旗艦級 HexGrit 耐磨旋貼，帶來極高容錯率、綿密包球感與頂級旋轉表現（約 2,410 RPM）。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>拍型選擇：Pegasus（Widebody）／Vapor（Hybrid）／Ultré／Hurache-X（Elongated）· 16mm</li>",
      "<li>核心：Gen 4 Unibody Molded Soft EMA Full-Foam Core</li>",
      "<li>拍面：HexGrit 耐磨旋貼 + 2x Toray T700 Carbon Fiber + 1x Fiberglass</li>",
      "<li>認證：UPA-A 認證</li>",
      "</ul>",
      "<h2>適合誰</h2>",
      "<p>重視軟球重置（reset）、丁克控制、超大甜蜜點與高旋轉的全能控制型球友。</p>",
      "<h2>一句話</h2>",
      "<p>果凍豆二代全泡沫化：超甜容錯與綿密控球，還配上旗艦級 HexGrit 耐磨旋貼。</p>",
    ].join(""),
  },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function ensureBrand(name: string): Promise<string> {
  const existing = await prisma.paddleBrand.findUnique({ where: { name } });
  if (existing) return existing.id;
  const maxSort = await prisma.paddleBrand.aggregate({ _max: { sortOrder: true } });
  const brand = await prisma.paddleBrand.create({
    data: { name, sortOrder: (maxSort._max.sortOrder ?? -1) + 1 },
  });
  console.log("brand created", name);
  return brand.id;
}

async function toCardGreyDataUrl(urls: string[]): Promise<string> {
  let lastErr: unknown;
  for (const src of urls) {
    try {
      const res = await fetch(src, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PlayPlayPlayBot/1.0)" },
      });
      if (!res.ok) throw new Error(`download ${res.status}: ${src}`);
      const input = Buffer.from(await res.arrayBuffer());

      const resized = await sharp(input)
        .rotate()
        .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = Buffer.from(resized.data);
      for (let i = 0; i < pixels.length; i += 4) {
        const a = pixels[i + 3]!;
        if (a < 16) {
          pixels[i] = CARD_GREY.r;
          pixels[i + 1] = CARD_GREY.g;
          pixels[i + 2] = CARD_GREY.b;
          pixels[i + 3] = 255;
        } else if (
          pixels[i]! >= WHITE_THRESHOLD &&
          pixels[i + 1]! >= WHITE_THRESHOLD &&
          pixels[i + 2]! >= WHITE_THRESHOLD
        ) {
          pixels[i] = CARD_GREY.r;
          pixels[i + 1] = CARD_GREY.g;
          pixels[i + 2] = CARD_GREY.b;
        }
      }

      const png = await sharp(pixels, {
        raw: {
          width: resized.info.width,
          height: resized.info.height,
          channels: 4,
        },
      })
        .png({ compressionLevel: 8 })
        .toBuffer();

      if (png.length > 900_000) {
        const jpg = await sharp(png).jpeg({ quality: 82 }).toBuffer();
        return `data:image/jpeg;base64,${jpg.toString("base64")}`;
      }
      return `data:image/png;base64,${png.toString("base64")}`;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const entry of ENTRIES) {
    const brandId = await ensureBrand(entry.brand);
    let imageDataUrl: string | undefined;
    try {
      imageDataUrl = await toCardGreyDataUrl(entry.imageUrls);
      console.log("img ok", entry.slug, Math.round(imageDataUrl.length / 1024), "kb");
    } catch (e) {
      console.warn("img fail", entry.slug, e);
    }

    const radarSrc = await writeRadar(entry);
    const radarHeader = [
      `<p><img src="${radarSrc}" alt="${escapeXml(entry.radarTitle)}" /></p>`,
      `<p><em>能力值來源：<a href="https://paddlereviewhub.com/reviews/${entry.radarReviewPath}">PaddleReviewHub — ${entry.radarReviewLabel}</a>（${scoreLine(entry.radarScores)}）</em></p>`,
    ].join("");
    const description = `${radarHeader}${entry.bodyHtml}`;

    const existing = await prisma.paddle.findUnique({ where: { slug: entry.slug } });
    const data = {
      series: entry.series,
      variant: entry.variant,
      nameZh: entry.nameZh,
      nameEn: entry.nameEn,
      description,
      highlights: entry.highlights,
      listPriceUsd: entry.listPriceUsd,
      priceSourceUrl: entry.priceSourceUrl,
      priceNote: entry.priceNote,
      memberPriceTwd: entry.memberPriceTwd,
      memberPriceNote: entry.memberPriceNote,
      ...(imageDataUrl ? { imageDataUrl } : {}),
    };

    if (existing) {
      await prisma.paddle.update({ where: { slug: entry.slug }, data });
      updated += 1;
      console.log("updated", entry.slug);
    } else {
      const maxSort = await prisma.paddle.aggregate({
        where: { brandId },
        _max: { sortOrder: true },
      });
      await prisma.paddle.create({
        data: {
          brandId,
          slug: entry.slug,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
          ...data,
        },
      });
      created += 1;
      console.log("created", entry.slug);
    }
  }

  console.log("done created", created, "updated", updated);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
