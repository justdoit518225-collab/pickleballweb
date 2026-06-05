import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import pg from "pg";

const slug = process.argv[2] ?? "loho2";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const t = await prisma.tenant.findUnique({
  where: { slug },
  include: { venues: { include: { courts: { orderBy: { sortOrder: "asc" } } } } },
});
console.log(JSON.stringify(t, null, 2));
await prisma.$disconnect();
await pool.end();
