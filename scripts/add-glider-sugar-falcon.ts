/**
 * 新增 LUZZ Glider Sugar（蜜袋鼯）／Falcon（燕隼）
 * 縮圖取自用戶提供的產品圖裁切
 * 用法：npx tsx scripts/add-glider-sugar-falcon.ts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import sharp from "sharp";

const ASSETS =
  "C:/Users/user/.cursor/projects/c-Users-user-PickleballWeb/assets";
const SUGAR_SRC = path.join(
  ASSETS,
  "c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_20bcf94fea7523c57f77fafe5090fa23_images_image-1541c0b4-3c5c-4b03-a9a2-9c86d9788b6b.png",
);
const FALCON_SRC = path.join(
  ASSETS,
  "c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_20bcf94fea7523c57f77fafe5090fa23_images_image-b415b7ed-9e37-4134-b67e-be2b467f9c0b.png",
);
const OUT_PUBLIC = path.join(process.cwd(), "public", "paddles");

const CARD_GREY = { r: 0xec, g: 0xec, b: 0xec };
const SIZE = 900;
const PAD = 0.05;

const GLIDER_SCORES =
  "SPIN 9.0 · FORGIVENESS 8.5 · CONTROL 9.0 · POP 7.5 · MANEUVERABILITY 9.3 · POWER 7.8";

const ENTRIES = [
  {
    slug: "luzz-glider-sugar",
    series: "滑翔機",
    variant: "蜜袋鼯",
    nameZh: "滑翔機 蜜袋鼯",
    nameEn: "Glider Sugar",
    listPriceUsd: 129,
    priceSourceUrl: "https://luzzpickleball.com/products/luzz-glider-2026",
    priceNote: "標 GLIDER-2026；官網獨立 SKU 待補，暫對齊 Glider 2026",
    highlights: ["滑翔機系列", "蜜袋鼯配色", "Glider 2026"],
    description: [
      "<p><em>草稿來源：產品圖標示 GLIDER-2026 + 站上 Glider 2026 同平台評測摘要（請自行編輯）</em></p>",
      '<p>來源：<a href="https://luzzpickleball.com/products/luzz-glider-2026">Luzz Glider 2026 官網</a>（性能參考同平台；評測可對照 <a href="https://paddlereviewhub.com/reviews/luzz-glider-2026">PRH Glider 2026</a>）</p>',
      "<h2>總評</h2>",
      "<p>Glider Sugar（蜜袋鼯）是滑翔機 2026 線的新配色款：拍面標示 GLIDER-2026 與 T700 碳纖，蜜袋鼯圖騰＋米金邊框辨識度高。打感預期對齊 Glider 2026 hybrid：全面、好揮、甜蜜點友善；差異主要在外觀。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>系列：Glider 2026 · Sugar（蜜袋鼯）</li>",
      "<li>拍面：Carbon Fiber T700</li>",
      "<li>標示：GLIDER-2026</li>",
      "<li>取向：同 Glider 2026 全面／hybrid 平台</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>可比照標準 Glider 2026：揮速輕快、控制與旋轉友善，力量低於 Cannon 長版。適合想要滑翔機手感又愛蜜袋鼯外觀的球友。</p>",
      "<h2>適合誰</h2>",
      "<p>喜歡動物聯名外觀、打法偏全面 hybrid 的人。</p>",
      "<h2>優點</h2>",
      "<ul><li>外觀辨識度高</li><li>承襲 Glider 2026 平台</li><li>適合當主力或第二拍收藏</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>官網獨立產品頁／價目待確認</li><li>打感與標準 2026 預期無本質差異</li></ul>",
      "<h2>一句話</h2>",
      "<p>滑翔機 2026 的打感，蜜袋鼯的臉。</p>",
    ].join(""),
  },
  {
    slug: "luzz-glider-falcon",
    series: "滑翔機",
    variant: "燕隼",
    nameZh: "滑翔機 燕隼",
    nameEn: "Glider Falcon",
    listPriceUsd: 129,
    priceSourceUrl: "https://luzzpickleball.com/products/luzz-glider-2026",
    priceNote: "標 GLIDER-2026；官網獨立 SKU 待補，暫對齊 Glider 2026",
    highlights: ["滑翔機系列", "燕隼配色", "Glider 2026"],
    description: [
      "<p><em>草稿來源：產品圖標示 GLIDER-2026 + 站上 Glider 2026 同平台評測摘要（請自行編輯）</em></p>",
      '<p>來源：<a href="https://luzzpickleball.com/products/luzz-glider-2026">Luzz Glider 2026 官網</a>（性能參考同平台；評測可對照 <a href="https://paddlereviewhub.com/reviews/luzz-glider-2026">PRH Glider 2026</a>）</p>',
      "<h2>總評</h2>",
      "<p>Glider Falcon（燕隼）是滑翔機 2026 線的新配色款：黑底、白燕隼圖騰與紅白雲紋，拍面標示 GLIDER-2026／T700。性能預期與 Glider 2026 同平台，差異在視覺風格。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>系列：Glider 2026 · Falcon（燕隼）</li>",
      "<li>拍面：Carbon Fiber T700</li>",
      "<li>標示：GLIDER-2026；USA Pickleball／UPA 認證標示（依實拍）</li>",
      "<li>取向：同 Glider 2026 全面／hybrid 平台</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>可比照標準 Glider 2026：輕快、控制友善、力量中等。適合想要東洋風／燕隼外觀的全面型球友。</p>",
      "<h2>適合誰</h2>",
      "<p>喜歡燕隼圖騰與對比配色、打法偏全面 hybrid 的人。</p>",
      "<h2>優點</h2>",
      "<ul><li>視覺張力強</li><li>承襲 Glider 2026 平台</li><li>認證標示完整（依批次）</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>官網獨立產品頁／價目待確認</li><li>打感與標準 2026 預期無本質差異</li></ul>",
      "<h2>一句話</h2>",
      "<p>滑翔機 2026 的打感，燕隼的臉。</p>",
    ].join(""),
  },
] as const;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function isLightNeutral(r: number, g: number, b: number) {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min >= 200 && max - min <= 40;
}

function isNearBlack(r: number, g: number, b: number) {
  return r <= 32 && g <= 32 && b <= 32;
}

function sat(r: number, g: number, b: number) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function replaceBgWithCardGrey(pixels: Buffer, width: number, height: number) {
  const n = width * height;
  const visited = new Uint8Array(n);
  const queue: number[] = [];

  const canBeBg = (r: number, g: number, b: number, a: number) => {
    if (a < 20) return true;
    if (isLightNeutral(r, g, b)) return true;
    if (isNearBlack(r, g, b) && sat(r, g, b) <= 12) return true;
    return false;
  };

  const tryPush = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (canBeBg(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!, pixels[i + 3]!)) {
      visited[idx] = 1;
      queue.push(idx);
    }
  };

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (queue.length) {
    const idx = queue.pop()!;
    const i = idx * 4;
    pixels[i] = CARD_GREY.r;
    pixels[i + 1] = CARD_GREY.g;
    pixels[i + 2] = CARD_GREY.b;
    pixels[i + 3] = 255;
    const x = idx % width;
    const y = Math.floor(idx / width);
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }
}

async function normalizeCropToDataUrl(input: Buffer): Promise<string> {
  const { data, info } = await sharp(input)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(data);
  replaceBgWithCardGrey(pixels, info.width, info.height);

  const cleaned = await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const inner = Math.round(SIZE * (1 - PAD * 2));
  const fitted = await sharp(cleaned)
    .resize({
      width: inner,
      height: inner,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const out = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 3,
      background: CARD_GREY,
    },
  })
    .composite([{ input: fitted, gravity: "centre" }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

async function cropSugar(): Promise<Buffer> {
  // 1024x486，四拍並排 → 取最左一支（蜜袋鼯圖騰）
  const meta = await sharp(SUGAR_SRC).metadata();
  const w = meta.width!;
  const h = meta.height!;
  const pw = Math.floor(w / 4);
  return sharp(SUGAR_SRC)
    .extract({ left: 8, top: 10, width: pw - 16, height: h - 20 })
    .png()
    .toBuffer();
}

async function cropFalcon(): Promise<Buffer> {
  // 1024x1024，兩拍並排；右側為正向（左側鏡像）
  const meta = await sharp(FALCON_SRC).metadata();
  const w = meta.width!;
  const h = meta.height!;
  const half = Math.floor(w / 2);
  return sharp(FALCON_SRC)
    .extract({ left: half + 10, top: 20, width: half - 30, height: h - 40 })
    .png()
    .toBuffer();
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function retitleRadar(destName: string, title: string) {
  const base = path.join(OUT_PUBLIC, "luzz-glider-2026-radar.jpg");
  const credit = "Tested. Ranked. Real. - PaddleReviewHub.com";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <rect x="45" y="600" width="1110" height="165" fill="#ffffff"/>
  <text x="600" y="655" text-anchor="middle" fill="#0a1a2e" font-size="18" font-weight="800" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="0.8">${escapeXml(title)}</text>
  <line x1="240" y1="675" x2="960" y2="675" stroke="#c5d0e0" stroke-width="1.3"/>
  <text x="600" y="705" text-anchor="middle" fill="#5a6a80" font-size="14" font-family="Segoe UI, Helvetica, Arial, sans-serif">${escapeXml(credit)}</text>
</svg>`;
  const overlay = await sharp(Buffer.from(svg)).png().toBuffer();
  await sharp(base)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(path.join(OUT_PUBLIC, destName));
  console.log("radar", destName);
}

async function main() {
  const brand = await prisma.paddleBrand.findUnique({ where: { name: "LUZZ" } });
  if (!brand) throw new Error("LUZZ brand missing");

  const maxSort = await prisma.paddle.aggregate({
    where: { brandId: brand.id },
    _max: { sortOrder: true },
  });
  let sort = (maxSort._max.sortOrder ?? 0) + 1;

  const sugarCrop = await cropSugar();
  const falconCrop = await cropFalcon();
  fs.mkdirSync(OUT_PUBLIC, { recursive: true });
  fs.writeFileSync(path.join(ASSETS, "_crop-glider-sugar.png"), sugarCrop);
  fs.writeFileSync(path.join(ASSETS, "_crop-glider-falcon.png"), falconCrop);

  const crops: Record<string, Buffer> = {
    "luzz-glider-sugar": sugarCrop,
    "luzz-glider-falcon": falconCrop,
  };

  await retitleRadar(
    "luzz-glider-sugar-radar.jpg",
    "LUZZ GLIDER SUGAR PERFORMANCE DISTRIBUTION",
  );
  await retitleRadar(
    "luzz-glider-falcon-radar.jpg",
    "LUZZ GLIDER FALCON PERFORMANCE DISTRIBUTION",
  );

  for (const entry of ENTRIES) {
    const imageDataUrl = await normalizeCropToDataUrl(crops[entry.slug]!);
    const radarMarker = `${entry.slug}-radar.jpg`;
    const prepend = [
      `<p><img src="/paddles/${radarMarker}" alt="${entry.nameEn.toUpperCase()} PERFORMANCE DISTRIBUTION" /></p>`,
      `<p><em>能力值來源：<a href="https://paddlereviewhub.com/reviews/luzz-glider-2026">PaddleReviewHub — Glider 2026（同平台）</a>（${GLIDER_SCORES}）</em></p>`,
    ].join("");
    const description = `${prepend}${entry.description}`;

    const existing = await prisma.paddle.findUnique({ where: { slug: entry.slug } });
    if (existing) {
      await prisma.paddle.update({
        where: { slug: entry.slug },
        data: {
          series: entry.series,
          variant: entry.variant,
          nameZh: entry.nameZh,
          nameEn: entry.nameEn,
          description,
          highlights: [...entry.highlights],
          imageDataUrl,
          listPriceUsd: entry.listPriceUsd,
          priceSourceUrl: entry.priceSourceUrl,
          priceNote: entry.priceNote,
        },
      });
      console.log("updated", entry.slug);
    } else {
      await prisma.paddle.create({
        data: {
          brandId: brand.id,
          slug: entry.slug,
          series: entry.series,
          variant: entry.variant,
          nameZh: entry.nameZh,
          nameEn: entry.nameEn,
          description,
          highlights: [...entry.highlights],
          imageDataUrl,
          listPriceUsd: entry.listPriceUsd,
          priceSourceUrl: entry.priceSourceUrl,
          priceNote: entry.priceNote,
          sortOrder: sort++,
        },
      });
      console.log("created", entry.slug);
    }
  }
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
