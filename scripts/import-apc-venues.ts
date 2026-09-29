/**
 * 依 FitBook（urlname459 / 564）課程名稱中的上課地點，建立 Active Pickleball Club 場館。
 * 地址取自各校官網／政府公開資料；六方羽為商業登記地址。可重複執行（以 slug upsert）。
 * 用法：npx tsx scripts/import-apc-venues.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

const TENANT_SLUG = "active-pickleball-club";

const VENUES = [
  { slug: "zhonghe-ziqiang", name: "中和自強國小", address: "235新北市中和區莒光路200號" },
  { slug: "yonghe-xiulang", name: "永和秀朗國小", address: "234新北市永和區得和路202號" },
  { slug: "banqiao-zhongshan", name: "板橋中山國小", address: "220新北市板橋區大觀路二段59巷31號" },
  { slug: "zhonghe-liufangyu", name: "中和六方羽", address: "235新北市中和區中山路二段568巷20弄4號" },
  { slug: "wenshan-jingxing", name: "文山景興國小", address: "116臺北市文山區景華街150巷21號" },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: TENANT_SLUG } });
  for (const v of VENUES) {
    const venue = await prisma.venue.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: v.slug } },
      create: { tenantId: tenant.id, slug: v.slug, name: v.name, address: v.address },
      update: { name: v.name, address: v.address },
    });
    console.log(venue.slug, venue.name, venue.address);
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
