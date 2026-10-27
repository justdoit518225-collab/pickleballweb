import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL;
  if (superAdminEmail) {
    const adminUser = await prisma.user.findUnique({ where: { email: superAdminEmail } });
    if (adminUser) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { platformRole: "SUPER_ADMIN" },
      });
      console.log(`已將 ${superAdminEmail} 設為 SUPER_ADMIN`);
    } else {
      console.log(`尚無使用者 ${superAdminEmail}，請先登入後再執行 seed`);
    }
  }

  // 匹克球拍目錄（已存在的 brand / slug 略過）
  const { SEED_PADDLES } = await import("./paddle-seed-data");
  const brandNames = [...new Set(SEED_PADDLES.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" }),
  );
  const brandIdByName = new Map<string, string>();
  for (let i = 0; i < brandNames.length; i++) {
    const name = brandNames[i]!;
    const brand = await prisma.paddleBrand.upsert({
      where: { name },
      update: {},
      create: { name, sortOrder: i },
    });
    brandIdByName.set(name, brand.id);
  }
  let paddlesCreated = 0;
  for (let i = 0; i < SEED_PADDLES.length; i++) {
    const p = SEED_PADDLES[i]!;
    const brandId = brandIdByName.get(p.brand);
    if (!brandId) continue;
    const existing = await prisma.paddle.findUnique({ where: { slug: p.slug } });
    if (existing) continue;
    await prisma.paddle.create({
      data: {
        brandId,
        slug: p.slug,
        series: p.series,
        variant: p.variant,
        nameZh: p.nameZh,
        nameEn: p.nameEn,
        description: p.description,
        highlights: [...p.highlights],
        sortOrder: i,
      },
    });
    paddlesCreated += 1;
  }
  console.log(
    `匹克球拍：品牌 ${brandNames.length}、新增球拍 ${paddlesCreated}（既有 slug 已略過）`,
  );

  console.log("Seed 完成：球拍目錄與超級管理員（不再建立示範俱樂部）");
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
