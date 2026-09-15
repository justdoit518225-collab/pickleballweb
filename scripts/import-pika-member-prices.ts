/**
 * 依 PIKA 教練團主價格表「售價」寫入 paddle.memberPriceTwd
 * 用法：npx tsx scripts/import-pika-member-prices.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type PriceUpdate = {
  slug: string;
  memberPriceTwd: number | null;
  memberPriceNote: string | null;
};

/** 對應 DB slug ← PIKA 2026.09.01「售價」 */
const UPDATES: PriceUpdate[] = [
  { slug: "luzz-inferno-zero", memberPriceTwd: 6700, memberPriceNote: null },
  { slug: "luzz-inferno-darkness", memberPriceTwd: 6700, memberPriceNote: null },
  { slug: "luzz-inferno-pink-purple", memberPriceTwd: 6700, memberPriceNote: null },
  { slug: "luzz-inferno-blue-flame", memberPriceTwd: 6900, memberPriceNote: null },
  { slug: "luzz-inferno-dawn", memberPriceTwd: 7450, memberPriceNote: null },
  { slug: "luzz-tornado-black", memberPriceTwd: 6600, memberPriceNote: null },
  { slug: "luzz-tornado-purple", memberPriceTwd: 6600, memberPriceNote: null },
  { slug: "luzz-cannon-g1-black", memberPriceTwd: 2900, memberPriceNote: null },
  { slug: "luzz-cannon-g1-collab", memberPriceTwd: 3200, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g1-jurassic", memberPriceTwd: 3200, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g1-minions", memberPriceTwd: 3200, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g1-candy", memberPriceTwd: 3100, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g1-ex", memberPriceTwd: 4150, memberPriceNote: "贈拍套" },
  { slug: "luzz-glider-2026", memberPriceTwd: 3200, memberPriceNote: "贈拍套" },
  { slug: "luzz-glider-signature", memberPriceTwd: 3300, memberPriceNote: "贈拍套" },
  { slug: "luzz-glider-gatsby", memberPriceTwd: 3600, memberPriceNote: "贈拍套" },
  { slug: "luzz-glider-sugar", memberPriceTwd: 3500, memberPriceNote: "贈拍套" },
  { slug: "luzz-glider-falcon", memberPriceTwd: 3500, memberPriceNote: "贈拍套" },
  { slug: "luzz-bladz-longyuan", memberPriceTwd: 4900, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g2-black", memberPriceTwd: 3300, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g2-collab", memberPriceTwd: 3600, memberPriceNote: "贈拍套" },
  { slug: "sypik-triton5", memberPriceTwd: 5150, memberPriceNote: null },
  { slug: "zocker-aspire-signature", memberPriceTwd: 5000, memberPriceNote: null },
  { slug: "enhance-mpp-widebody", memberPriceTwd: 3650, memberPriceNote: null },
  { slug: "enhance-mpp-elongated", memberPriceTwd: 3650, memberPriceNote: null },
  { slug: "pakle-fuse", memberPriceTwd: 3800, memberPriceNote: null },
  { slug: "spartus-spitfire", memberPriceTwd: 3800, memberPriceNote: null },
  { slug: "rpm-q2", memberPriceTwd: 6800, memberPriceNote: null },
  { slug: "rpm-v2", memberPriceTwd: 6800, memberPriceNote: null },
  { slug: "rpm-v2-pink", memberPriceTwd: 6800, memberPriceNote: null },
  { slug: "rpm-jade", memberPriceTwd: 7400, memberPriceNote: null },
  { slug: "honolulu-j2cr", memberPriceTwd: 6100, memberPriceNote: "贈拍套" },
  { slug: "honolulu-j6cr", memberPriceTwd: 6100, memberPriceNote: "贈拍套" },
  { slug: "six-zero-coral-pro", memberPriceTwd: 6600, memberPriceNote: null },
  { slug: "selkirk-omni", memberPriceTwd: 8500, memberPriceNote: null },
  { slug: "selkirk-boomstik", memberPriceTwd: 9000, memberPriceNote: null },
  { slug: "selkirk-boomstik-asia-gift", memberPriceTwd: 7000, memberPriceNote: null },
  { slug: "joola-pro-v-perseus", memberPriceTwd: null, memberPriceNote: "電洽" },
  { slug: "joola-pro-v-kosmos", memberPriceTwd: null, memberPriceNote: "電洽" },
  { slug: "joola-pro-v-scorpeus", memberPriceTwd: null, memberPriceNote: "電洽" },
];

async function main() {
  let ok = 0;
  const missing: string[] = [];
  for (const u of UPDATES) {
    const existing = await prisma.paddle.findUnique({ where: { slug: u.slug } });
    if (!existing) {
      missing.push(u.slug);
      continue;
    }
    await prisma.paddle.update({
      where: { slug: u.slug },
      data: {
        memberPriceTwd: u.memberPriceTwd,
        memberPriceNote: u.memberPriceNote,
      },
    });
    ok += 1;
    console.log("ok", u.slug, u.memberPriceTwd ?? "-", u.memberPriceNote ?? "");
  }
  console.log("updated", ok, "missing", missing.length, missing);
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
