/**
 * 把球拍縮圖近白色背景換成卡片灰 #ececec
 * 用法：npx tsx scripts/recolor-paddle-bg.ts [slug...]
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import sharp from "sharp";

const CARD_GREY = { r: 0xec, g: 0xec, b: 0xec };
const WHITE_THRESHOLD = 235;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function parseDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1]!, buffer: Buffer.from(m[2]!, "base64") };
}

async function recolorWhiteBackground(input: Buffer) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      pixels[i] = CARD_GREY.r;
      pixels[i + 1] = CARD_GREY.g;
      pixels[i + 2] = CARD_GREY.b;
    }
  }

  return sharp(pixels, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

async function main() {
  const slugs = process.argv.slice(2);
  const paddles = await prisma.paddle.findMany({
    where: slugs.length
      ? { slug: { in: slugs } }
      : { imageDataUrl: { not: null }, brand: { name: "HONOLULU" } },
    select: { id: true, slug: true, nameZh: true, imageDataUrl: true },
  });

  for (const p of paddles) {
    if (!p.imageDataUrl) {
      console.log(`略過（無圖）：${p.slug}`);
      continue;
    }
    const parsed = parseDataUrl(p.imageDataUrl);
    if (!parsed) {
      console.log(`略過（非 data URL）：${p.slug}`);
      continue;
    }

    const out = await recolorWhiteBackground(parsed.buffer);
    const next = `data:image/png;base64,${out.toString("base64")}`;
    await prisma.paddle.update({
      where: { id: p.id },
      data: { imageDataUrl: next },
    });
    console.log(`已處理：${p.slug} (${p.nameZh})`);
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
