/**
 * 統一縮圖為 ZOCKER 風格：淺色底 → 純黑，再置中到方形黑畫布
 * （不做黑底 flood，避免吃掉黑色拍面）
 * 用法：npx tsx scripts/normalize-paddle-thumbs.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import sharp from "sharp";

const SIZE = 900;
const PAD = 0.05;
const BLACK = { r: 0, g: 0, b: 0 };

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function parseDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  return Buffer.from(m[2]!, "base64");
}

function isLightNeutral(r: number, g: number, b: number) {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  // 白／卡片灰／淺灰底
  return min >= 200 && max - min <= 40;
}

async function normalizeToZockerStyle(input: Buffer): Promise<string> {
  const { data, info } = await sharp(input)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const a = pixels[i + 3]!;
    if (a < 20 || isLightNeutral(r, g, b)) {
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    }
  }

  const cleaned = await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const inner = Math.round(SIZE * (1 - PAD * 2));
  const placed = await sharp(cleaned)
    .resize(inner, inner, {
      fit: "contain",
      background: { ...BLACK, alpha: 1 },
    })
    .png()
    .toBuffer();

  const out = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 3,
      background: BLACK,
    },
  })
    .composite([{ input: placed, gravity: "centre" }])
    .jpeg({ quality: 88 })
    .toBuffer();

  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

async function main() {
  const paddles = await prisma.paddle.findMany({
    select: { id: true, slug: true, imageDataUrl: true },
    orderBy: { slug: "asc" },
  });

  for (const p of paddles) {
    if (!p.imageDataUrl) {
      console.log("略過（無圖）", p.slug);
      continue;
    }
    const buf = parseDataUrl(p.imageDataUrl);
    if (!buf) {
      console.log("略過（非 data URL）", p.slug);
      continue;
    }
    try {
      const imageDataUrl = await normalizeToZockerStyle(buf);
      await prisma.paddle.update({
        where: { id: p.id },
        data: { imageDataUrl },
      });
      console.log("OK", p.slug, Math.round(imageDataUrl.length / 1024) + "kb");
    } catch (e) {
      console.error("失敗", p.slug, e);
    }
  }
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
