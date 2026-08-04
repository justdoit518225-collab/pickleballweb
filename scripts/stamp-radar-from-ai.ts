/**
 * 以 J2CR 風格 AI 圖為底板（質感與四角一致），再蓋上正確分數與標題。
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

const ASSETS = path.join(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-user-PickleballWeb/assets",
);
const OUT = path.join(process.cwd(), "public", "paddles");

const AXES = [
  "spin",
  "forgiveness",
  "control",
  "pop",
  "maneuverability",
  "power",
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

/** 大面積覆蓋舊分數（AI 圖常殘留 J2CR 的 9.x） */
const SCORE_BOXES = [
  { x: 530, y: 78, w: 140, h: 58 }, // SPIN
  { x: 820, y: 165, w: 150, h: 60 }, // FORGIVENESS
  { x: 820, y: 455, w: 150, h: 60 }, // CONTROL
  { x: 530, y: 555, w: 140, h: 55 }, // POP
  { x: 230, y: 455, w: 160, h: 60 }, // MANEUVERABILITY
  { x: 230, y: 165, w: 150, h: 60 }, // POWER
];

function stampSvg(title: string, credit: string, scores: Scores) {
  const bg = "#f4f1f0";
  const vals = AXES.map((k) => scores[k]);
  const scoreLayer = SCORE_BOXES.map((b, i) => {
    const tx = b.x + b.w / 2;
    const ty = b.y + b.h / 2 + 10;
    return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${bg}"/>
    <text x="${tx}" y="${ty}" text-anchor="middle" fill="#1a6fd4" font-size="30" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif">${fmt(vals[i])}</text>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  ${scoreLayer}
  <rect x="80" y="625" width="1040" height="105" fill="${bg}"/>
  <text x="600" y="662" text-anchor="middle" fill="#0a1a2e" font-size="20" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="1">${escapeXml(title)}</text>
  <line x1="220" y1="680" x2="980" y2="680" stroke="#c5d0e0" stroke-width="1.3"/>
  <text x="600" y="706" text-anchor="middle" fill="#5a6a80" font-size="14" font-family="Segoe UI, Helvetica, Arial, sans-serif">${escapeXml(credit)}</text>
</svg>`;
}

async function loadBase(name: string) {
  const p = path.join(ASSETS, name);
  if (!fs.existsSync(p)) throw new Error(`缺少底板：${p}`);
  return sharp(p)
    .resize(1200, 800, { fit: "cover", position: "centre" })
    .jpeg({ quality: 95 })
    .toBuffer();
}

async function write(
  outName: string,
  baseFile: string,
  title: string,
  credit: string,
  scores: Scores,
) {
  const base = await loadBase(baseFile);
  const overlay = await sharp(Buffer.from(stampSvg(title, credit, scores)))
    .png()
    .toBuffer();
  const dest = path.join(OUT, outName);
  await sharp(base)
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

  // cleanup calib
  for (const f of ["_calib-boxes.jpg", "_tpl-luzz-inferno-radar.jpg"]) {
    const p = path.join(OUT, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  console.log("\nDone stamping all radars from J2CR-style bases.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
