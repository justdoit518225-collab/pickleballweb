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

/** 對應 DB slug ← PIKA 2026.10.01「售價」與「備註」 */
const UPDATES: PriceUpdate[] = [
  { slug: "luzz-inferno-zero", memberPriceTwd: 6700, memberPriceNote: "贈拍套" },
  { slug: "luzz-inferno-darkness", memberPriceTwd: 6700, memberPriceNote: "贈拍套" },
  { slug: "luzz-inferno-pink-purple", memberPriceTwd: 6700, memberPriceNote: "贈拍套" },
  { slug: "luzz-inferno-blue-flame", memberPriceTwd: 6950, memberPriceNote: "贈拍套" },
  { slug: "luzz-inferno-dawn", memberPriceTwd: 7200, memberPriceNote: "贈拍套" },
  { slug: "luzz-tornado-black", memberPriceTwd: 6600, memberPriceNote: "贈拍套" },
  { slug: "luzz-tornado-purple", memberPriceTwd: 6600, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g1-black", memberPriceTwd: 2950, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g1-collab", memberPriceTwd: 3300, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g1-jurassic", memberPriceTwd: 3300, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g1-minions", memberPriceTwd: 3300, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g1-candy", memberPriceTwd: 3150, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g1-ex", memberPriceTwd: 4600, memberPriceNote: "贈拍套" },
  { slug: "luzz-glider-2026", memberPriceTwd: 3300, memberPriceNote: "贈拍套" },
  { slug: "luzz-glider-signature", memberPriceTwd: 3550, memberPriceNote: "贈拍套" },
  { slug: "luzz-glider-gatsby", memberPriceTwd: 3550, memberPriceNote: "贈拍套" },
  { slug: "luzz-glider-sugar", memberPriceTwd: 3550, memberPriceNote: "贈拍套" },
  { slug: "luzz-glider-falcon", memberPriceTwd: 3550, memberPriceNote: "贈拍套" },
  { slug: "luzz-bladz-longyuan", memberPriceTwd: 4800, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g2-black", memberPriceTwd: 3350, memberPriceNote: "贈拍套" },
  { slug: "luzz-cannon-g2-collab", memberPriceTwd: 3600, memberPriceNote: "贈拍套" },
  { slug: "sypik-triton5", memberPriceTwd: 5150, memberPriceNote: null },
  { slug: "zocker-aspire-signature", memberPriceTwd: 5000, memberPriceNote: null },
  { slug: "enhance-mpp-widebody", memberPriceTwd: 3650, memberPriceNote: null },
  { slug: "enhance-mpp-elongated", memberPriceTwd: 3650, memberPriceNote: null },
  { slug: "pakle-fuse", memberPriceTwd: 3750, memberPriceNote: null },
  { slug: "spartus-spitfire", memberPriceTwd: 3750, memberPriceNote: "贈拍套" },
  { slug: "rpm-q2", memberPriceTwd: 6650, memberPriceNote: null },
  { slug: "rpm-v2", memberPriceTwd: 6650, memberPriceNote: null },
  { slug: "rpm-v2-pink", memberPriceTwd: 6650, memberPriceNote: null },
  { slug: "rpm-jade", memberPriceTwd: 7350, memberPriceNote: null },
  { slug: "honolulu-j2cr", memberPriceTwd: 6100, memberPriceNote: "贈拍套" },
  { slug: "honolulu-j6cr", memberPriceTwd: 6100, memberPriceNote: "贈拍套" },
  { slug: "six-zero-coral-pro", memberPriceTwd: 6600, memberPriceNote: "贈拍套" },
  { slug: "selkirk-omni", memberPriceTwd: 8700, memberPriceNote: null },
  { slug: "selkirk-boomstik", memberPriceTwd: 9200, memberPriceNote: null },
  { slug: "selkirk-boomstik-asia-gift", memberPriceTwd: 7650, memberPriceNote: null },
  { slug: "bread-and-butter-loco2", memberPriceTwd: 7000, memberPriceNote: null },
  { slug: "11six24-power2", memberPriceTwd: 6400, memberPriceNote: "贈拍套" },
  { slug: "11six24-jelly-bean2", memberPriceTwd: 5300, memberPriceNote: "贈拍套" },
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
