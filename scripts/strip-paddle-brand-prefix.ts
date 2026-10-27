/**
 * 移除各球拍 nameZh / nameEn 開頭的品牌前綴（品牌已另欄顯示）
 * 用法：npx tsx scripts/strip-paddle-brand-prefix.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripBrandPrefix(name: string, brand: string): string {
  const raw = name.trim();
  if (!raw) return raw;

  const variants = [
    brand,
    brand.toUpperCase(),
    brand.toLowerCase(),
    brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase(),
  ];
  const unique = [...new Set(variants.filter(Boolean))];

  for (const b of unique) {
    const re = new RegExp(`^${escapeRegex(b)}\\s*[\\-–—·]?\\s*`, "i");
    if (re.test(raw)) {
      const next = raw.replace(re, "").trim();
      return next || raw;
    }
  }
  return raw;
}

async function main() {
  const paddles = await prisma.paddle.findMany({
    orderBy: [{ brand: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: {
      id: true,
      slug: true,
      nameZh: true,
      nameEn: true,
      brand: { select: { name: true } },
    },
  });

  let changed = 0;
  for (const p of paddles) {
    const brand = p.brand.name;
    const nameZh = stripBrandPrefix(p.nameZh, brand);
    const nameEn = stripBrandPrefix(p.nameEn, brand);
    if (nameZh === p.nameZh && nameEn === p.nameEn) {
      console.log("skip", p.slug, { zh: p.nameZh, en: p.nameEn });
      continue;
    }
    await prisma.paddle.update({
      where: { id: p.id },
      data: { nameZh, nameEn },
    });
    changed += 1;
    console.log(p.slug);
    console.log("  zh:", p.nameZh, "→", nameZh);
    console.log("  en:", p.nameEn, "→", nameEn);
  }
  console.log("updated", changed, "/", paddles.length);
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
