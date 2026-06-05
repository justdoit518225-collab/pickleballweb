import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const tenants = await prisma.tenant.findMany({
  select: { slug: true, displayName: true, isActive: true },
  orderBy: { displayName: "asc" },
});
for (const t of tenants) {
  console.log(`${t.displayName} → slug: ${t.slug} → https://www.playplayplay.fun/t/${t.slug}`);
}
await prisma.$disconnect();
await pool.end();
