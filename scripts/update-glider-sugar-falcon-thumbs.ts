/**
 * 用用戶附圖直接更新 Sugar / Falcon 產品圖
 * 用法：npx tsx scripts/update-glider-sugar-falcon-thumbs.ts
 */
import "dotenv/config";
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

const CARD_GREY = { r: 0xec, g: 0xec, b: 0xec };
const SIZE = 900;
const PAD = 0.04;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function toCardDataUrl(src: string): Promise<string> {
  const fitted = await sharp(src)
    .rotate()
    .resize({
      width: Math.round(SIZE * (1 - PAD * 2)),
      height: Math.round(SIZE * (1 - PAD * 2)),
      fit: "inside",
      withoutEnlargement: false,
    })
    .jpeg({ quality: 90, mozjpeg: true })
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
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

async function main() {
  const sugar = await toCardDataUrl(SUGAR_SRC);
  const falcon = await toCardDataUrl(FALCON_SRC);

  await prisma.paddle.update({
    where: { slug: "luzz-glider-sugar" },
    data: { imageDataUrl: sugar },
  });
  console.log("updated luzz-glider-sugar", Math.round(sugar.length / 1024), "kb dataUrl");

  await prisma.paddle.update({
    where: { slug: "luzz-glider-falcon" },
    data: { imageDataUrl: falcon },
  });
  console.log("updated luzz-glider-falcon", Math.round(falcon.length / 1024), "kb dataUrl");
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
