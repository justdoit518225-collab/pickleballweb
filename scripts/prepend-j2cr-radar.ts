/**
 * 確保 J2CR 內文開頭有雷達圖（若已刪除則補回，不重複插入）
 * 用法：npx tsx scripts/prepend-j2cr-radar.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

const MARKER = "honolulu-j2cr-crystal-blue-radar.jpg";

const PREPEND = [
  `<p><img src="/paddles/${MARKER}" alt="HONOLULU J2CR CRYSTAL BLUE PERFORMANCE DISTRIBUTION" /></p>`,
  `<p><em>能力值來源：<a href="https://paddlereviewhub.com/reviews/honolulu-j2cr-crystal-blue">PaddleReviewHub — J2CR Crystal Blue</a>（SPIN 9.5 · FORGIVENESS 9.5 · CONTROL 9.2 · POP 9.1 · MANEUVERABILITY 9.2 · POWER 9.2）</em></p>`,
].join("");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const p = await prisma.paddle.findUnique({
    where: { slug: "honolulu-j2cr" },
    select: { id: true, description: true },
  });
  if (!p) {
    console.log("找不到 honolulu-j2cr");
    return;
  }
  if (p.description.includes(MARKER)) {
    console.log("已含雷達圖，略過");
    console.log("desc start:", p.description.slice(0, 180));
    return;
  }
  const next = `${PREPEND}${p.description}`;
  await prisma.paddle.update({
    where: { id: p.id },
    data: { description: next },
  });
  console.log("已補回雷達圖，新長度", next.length);
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
