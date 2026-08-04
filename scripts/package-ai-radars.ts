/**
 * 把 J2CR-style AI 雷達圖整理進 public/paddles，
 * 同分數變體只改標題（不清分數，避免雙重文字）。
 * 用法：npx tsx scripts/package-ai-radars.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ASSETS = path.join(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-user-PickleballWeb/assets",
);
const OUT = path.join(process.cwd(), "public", "paddles");

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function resizeFromAssets(srcName: string, destName: string) {
  const src = path.join(ASSETS, srcName);
  if (!fs.existsSync(src)) throw new Error(`缺少：${src}`);
  const dest = path.join(OUT, destName);
  await sharp(src)
    .resize(1200, 800, { fit: "cover", position: "centre" })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(dest);
  console.log("COPY", destName);
  return dest;
}

/** 只蓋底部標題區，分數完全不動 */
async function retitle(
  basePath: string,
  destName: string,
  title: string,
  credit: string,
) {
  const bg = "#ffffff";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <rect x="45" y="600" width="1110" height="165" fill="${bg}"/>
  <text x="600" y="655" text-anchor="middle" fill="#0a1a2e" font-size="18" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="0.8">${escapeXml(title)}</text>
  <line x1="240" y1="675" x2="960" y2="675" stroke="#c5d0e0" stroke-width="1.3"/>
  <text x="600" y="705" text-anchor="middle" fill="#5a6a80" font-size="14" font-family="Segoe UI, Helvetica, Arial, sans-serif">${escapeXml(credit)}</text>
</svg>`;
  const overlay = await sharp(Buffer.from(svg)).png().toBuffer();
  const dest = path.join(OUT, destName);
  await sharp(basePath)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(dest);
  console.log("TITLE", destName);
}

const PRH = "Tested. Ranked. Real. - PaddleReviewHub.com";

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // 直接對應的成品
  await resizeFromAssets(
    "enhance-mpp-widebody-radar.jpg",
    "enhance-mpp-widebody-radar.jpg",
  );
  await resizeFromAssets(
    "enhance-mpp-elongated-radar.jpg",
    "enhance-mpp-elongated-radar.jpg",
  );
  // J6CR 已用同 prompt 產過，若 assets 有新版則覆蓋；否則保留 public
  const j6Asset = path.join(ASSETS, "honolulu-j6cr-radar.jpg");
  if (fs.existsSync(j6Asset)) {
    await resizeFromAssets("honolulu-j6cr-radar.jpg", "honolulu-j6cr-radar.jpg");
  }
  await resizeFromAssets("rpm-q2-radar.jpg", "rpm-q2-radar.jpg");
  await resizeFromAssets("pakle-fuse-radar.jpg", "pakle-fuse-radar.jpg");
  await resizeFromAssets(
    "luzz-bladz-longyuan-radar.jpg",
    "luzz-bladz-longyuan-radar.jpg",
  );
  await resizeFromAssets("sypik-triton5-radar.jpg", "sypik-triton5-radar.jpg");
  await resizeFromAssets(
    "zocker-aspire-signature-radar.jpg",
    "zocker-aspire-signature-radar.jpg",
  );

  // Inferno / Tornado 變體
  const infernoBase = await resizeFromAssets(
    "_tpl-luzz-inferno-radar.jpg",
    "_tmp-inferno-base.jpg",
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
    await retitle(infernoBase, out, title, PRH);
  }

  // Cannon 變體
  const cannonBase = await resizeFromAssets(
    "_tpl-luzz-cannon-radar.jpg",
    "_tmp-cannon-base.jpg",
  );
  const cannonVariants: [string, string][] = [
    ["luzz-cannon-g1-black-radar.jpg", "LUZZ CANNON GEN 1 BLACK PERFORMANCE DISTRIBUTION"],
    ["luzz-cannon-g1-collab-radar.jpg", "LUZZ CANNON GEN 1 CO-BRANDED PERFORMANCE DISTRIBUTION"],
    ["luzz-cannon-g1-candy-radar.jpg", "LUZZ CANNON GEN 1 CANDY / HONEY PERFORMANCE DISTRIBUTION"],
    ["luzz-cannon-g1-ex-radar.jpg", "LUZZ CANNON GEN 1 EX PERFORMANCE DISTRIBUTION"],
    ["luzz-cannon-g2-black-radar.jpg", "LUZZ CANNON GEN 2 BLACK PERFORMANCE DISTRIBUTION"],
    ["luzz-cannon-g2-collab-radar.jpg", "LUZZ CANNON GEN 2 CO-BRANDED PERFORMANCE DISTRIBUTION"],
  ];
  for (const [out, title] of cannonVariants) {
    await retitle(cannonBase, out, title, PRH);
  }

  // Glider 變體
  const gliderBase = await resizeFromAssets(
    "_tpl-luzz-glider-radar.jpg",
    "_tmp-glider-base.jpg",
  );
  const gliderVariants: [string, string][] = [
    ["luzz-glider-2026-radar.jpg", "LUZZ GLIDER 2026 PERFORMANCE DISTRIBUTION"],
    ["luzz-glider-signature-radar.jpg", "LUZZ GLIDER SIGNATURE PERFORMANCE DISTRIBUTION"],
    ["luzz-glider-gatsby-radar.jpg", "LUZZ GLIDER GATSBY PERFORMANCE DISTRIBUTION"],
  ];
  for (const [out, title] of gliderVariants) {
    await retitle(gliderBase, out, title, PRH);
  }

  // RPM V2 / Pink
  const v2Base = await resizeFromAssets("_tpl-rpm-v2-radar.jpg", "_tmp-v2-base.jpg");
  await retitle(v2Base, "rpm-v2-radar.jpg", "RPM V2 PERFORMANCE DISTRIBUTION", PRH);
  await retitle(
    v2Base,
    "rpm-v2-pink-radar.jpg",
    "RPM V2 PINK PERFORMANCE DISTRIBUTION",
    PRH,
  );

  // cleanup temps
  for (const f of [
    "_tmp-inferno-base.jpg",
    "_tmp-cannon-base.jpg",
    "_tmp-glider-base.jpg",
    "_tmp-v2-base.jpg",
  ]) {
    const p = path.join(OUT, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  console.log("\nDone packaging AI radars.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
