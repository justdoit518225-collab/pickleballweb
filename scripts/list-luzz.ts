import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const rows = await prisma.paddle.findMany({
    where: { brand: { name: "LUZZ" } },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      nameZh: true,
      nameEn: true,
      series: true,
      variant: true,
      imageDataUrl: true,
    },
  });
  console.log("count", rows.length);
  for (const r of rows) {
    console.log(
      [r.slug, r.series, r.variant, r.nameEn, r.imageDataUrl ? "img" : "no"].join(
        " | ",
      ),
    );
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
