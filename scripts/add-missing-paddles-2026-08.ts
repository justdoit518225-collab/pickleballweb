/**
 * 建立缺品牌（JOOLA / LEOPARD / FACOLOS）與缺球拍
 * 用法：npx tsx scripts/add-missing-paddles-2026-08.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const NEW_BRANDS = ["JOOLA", "LEOPARD", "FACOLOS"] as const;

type NewPaddle = {
  brand: string;
  slug: string;
  series: string;
  variant: string;
  nameZh: string;
  nameEn: string;
  description: string;
  highlights: string[];
};

const NEW_PADDLES: NewPaddle[] = [
  {
    brand: "JOOLA",
    slug: "joola-pro-v-perseus",
    series: "Pro V",
    variant: "Perseus 14/16mm",
    nameZh: "Pro V Perseus",
    nameEn: "Pro V Perseus",
    description:
      "<p>JOOLA Pro V Perseus（14/16mm）。Pro V 系列長版攻擊取向，強調推進與旋轉；厚度可選 14mm／16mm。</p>",
    highlights: ["Pro V", "Perseus", "14/16mm"],
  },
  {
    brand: "JOOLA",
    slug: "joola-pro-v-kosmos",
    series: "Pro V",
    variant: "Kosmos 16mm",
    nameZh: "Pro V Kosmos",
    nameEn: "Pro V Kosmos",
    description:
      "<p>JOOLA Pro V Kosmos（16mm）。Pro V 系列中的 Kosmos 款式，16mm 厚度取向。</p>",
    highlights: ["Pro V", "Kosmos", "16mm"],
  },
  {
    brand: "JOOLA",
    slug: "joola-pro-v-scorpeus",
    series: "Pro V",
    variant: "Scorpeus 14/16mm",
    nameZh: "Pro V Scorpeus",
    nameEn: "Pro V Scorpeus",
    description:
      "<p>JOOLA Pro V Scorpeus（14/16mm）。Pro V 系列 Scorpeus 款式，厚度可選 14mm／16mm。</p>",
    highlights: ["Pro V", "Scorpeus", "14/16mm"],
  },
  {
    brand: "LUZZ",
    slug: "luzz-cannon-g1-jurassic",
    series: "一代加農砲",
    variant: "侏羅紀公園聯名",
    nameZh: "一代加農砲 侏羅紀公園聯名",
    nameEn: "Cannon Gen 1 - Jurassic Edition",
    description:
      '<p>來源：<a href="https://luzzpickleball.com/products/luzzpickleball-jurassic-cannon-paddle-t700-carbon-friction-surface-thermoformed">Luzz Jurassic Cannon</a></p><p>一代加農砲侏羅紀公園聯名版，延續 Cannon 力量平台，外觀為 Jurassic Edition。</p>',
    highlights: ["一代加農砲", "侏羅紀聯名"],
  },
  {
    brand: "LUZZ",
    slug: "luzz-cannon-g1-minions",
    series: "一代加農砲",
    variant: "小小兵聯名",
    nameZh: "一代加農砲 小小兵聯名",
    nameEn: "Cannon Gen 1 - Minions",
    description:
      '<p>來源：<a href="https://luzzpickleball.com/products/luzzpickleball-minions-cannon-paddle-t700-carbon-friction-surface-thermoformed">Luzz Minions Cannon</a></p><p>一代加農砲小小兵聯名版（有別於二代小小兵聯名），延續 Cannon 攻擊手感與聯名外觀。</p>',
    highlights: ["一代加農砲", "小小兵聯名"],
  },
  {
    brand: "ENHANCE",
    slug: "enhance-epp-widebody",
    series: "EPP 寬版",
    variant: "-",
    nameZh: "EPP 寬版",
    nameEn: "EPP Widebody",
    description:
      "<p>ENHANCE EPP 寬版。有別於站上既有的 MPP Turbo 系列，EPP 為另一產品線的寬版款。</p>",
    highlights: ["EPP", "寬版"],
  },
  {
    brand: "LEOPARD",
    slug: "leopard-wave-x",
    series: "Wave X",
    variant: "-",
    nameZh: "Wave X",
    nameEn: "Wave X",
    description: "<p>Leopard Wave X。後續可再補規格、評測與產品圖。</p>",
    highlights: ["Wave X"],
  },
  {
    brand: "FACOLOS",
    slug: "facolos-elite-x",
    series: "ELITE-X",
    variant: "-",
    nameZh: "ELITE-X",
    nameEn: "ELITE-X",
    description: "<p>Facolos ELITE-X。後續可再補規格、評測與產品圖。</p>",
    highlights: ["ELITE-X"],
  },
];

async function ensureBrand(name: string): Promise<string> {
  const existing = await prisma.paddleBrand.findUnique({ where: { name } });
  if (existing) {
    console.log("brand exists", name);
    return existing.id;
  }
  const maxSort = await prisma.paddleBrand.aggregate({ _max: { sortOrder: true } });
  const brand = await prisma.paddleBrand.create({
    data: {
      name,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });
  console.log("brand created", name);
  return brand.id;
}

async function main() {
  const brandIdByName = new Map<string, string>();

  for (const name of NEW_BRANDS) {
    brandIdByName.set(name, await ensureBrand(name));
  }
  // existing brands needed for new paddles
  for (const name of ["LUZZ", "ENHANCE"] as const) {
    const b = await prisma.paddleBrand.findUnique({ where: { name } });
    if (!b) throw new Error(`missing brand ${name}`);
    brandIdByName.set(name, b.id);
  }

  let created = 0;
  for (const p of NEW_PADDLES) {
    const brandId = brandIdByName.get(p.brand);
    if (!brandId) throw new Error(`no brand id for ${p.brand}`);

    const exists = await prisma.paddle.findUnique({ where: { slug: p.slug } });
    if (exists) {
      console.log("paddle skip", p.slug);
      continue;
    }

    const maxSort = await prisma.paddle.aggregate({
      where: { brandId },
      _max: { sortOrder: true },
    });

    await prisma.paddle.create({
      data: {
        brandId,
        slug: p.slug,
        series: p.series,
        variant: p.variant,
        nameZh: p.nameZh,
        nameEn: p.nameEn,
        description: p.description,
        highlights: p.highlights,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    created += 1;
    console.log("paddle created", p.slug);
  }

  console.log("done brands", NEW_BRANDS.length, "paddles created", created);
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
