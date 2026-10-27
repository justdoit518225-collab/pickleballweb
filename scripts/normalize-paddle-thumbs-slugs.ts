/**
 * 只正規化指定 slug 的縮圖
 * 用法：npx tsx scripts/normalize-paddle-thumbs-slugs.ts slug1 slug2 ...
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import sharp from "sharp";

const SIZE = 900;
const PAD = 0.05;
const CARD_GREY = { r: 0xec, g: 0xec, b: 0xec };

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

async function normalizeToCardGrey(input: Buffer): Promise<string> {
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
    .resize({ width: inner, height: inner, fit: "inside", withoutEnlargement: true })
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

async function main() {
  const slugs = process.argv.slice(2);
  if (!slugs.length) throw new Error("請傳 slug");
  const paddles = await prisma.paddle.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, imageDataUrl: true },
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
    const imageDataUrl = await normalizeToCardGrey(buf);
    await prisma.paddle.update({ where: { id: p.id }, data: { imageDataUrl } });
    console.log("OK", p.slug, Math.round(imageDataUrl.length / 1024) + "kb");
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
