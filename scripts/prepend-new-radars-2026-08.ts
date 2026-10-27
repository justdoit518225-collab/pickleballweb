/**
 * 把雷達圖 prepend 到指定球拍 description（不重複）
 * 用法：npx tsx scripts/prepend-new-radars-2026-08.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

type Spec = {
  slug: string;
  alt: string;
  noteHtml: string;
};

const SPECS: Spec[] = [
  {
    slug: "joola-pro-v-perseus",
    alt: "JOOLA PERSEUS PRO V PERFORMANCE DISTRIBUTION",
    noteHtml:
      '能力值來源：<a href="https://paddlereviewhub.com/reviews/joola-perseus-pro-v">PaddleReviewHub — Perseus Pro V</a>（SPIN 8.6 · FORGIVENESS 8.3 · CONTROL 8.6 · POP 8.8 · MANEUVERABILITY 8.3 · POWER 9.0）',
  },
  {
    slug: "enhance-epp-widebody",
    alt: "ENHANCE EPP TURBO WIDEBODY PERFORMANCE DISTRIBUTION",
    noteHtml:
      '能力值來源：<a href="https://paddlereviewhub.com/reviews/enhance-epp-turbo-widebody">PaddleReviewHub — EPP Turbo Widebody</a>（SPIN 9.2 · FORGIVENESS 9.3 · CONTROL 9.0 · POP 9.2 · MANEUVERABILITY 9.5 · POWER 9.0）',
  },
  {
    slug: "luzz-cannon-g1-jurassic",
    alt: "LUZZ CANNON GEN 1 JURASSIC PERFORMANCE DISTRIBUTION",
    noteHtml:
      '能力值來源：<a href="https://paddlereviewhub.com/reviews/luzz-cannon">PaddleReviewHub — Cannon（同平台）</a>（SPIN 8.5 · FORGIVENESS 8.2 · CONTROL 7.8 · POP 8.7 · MANEUVERABILITY 7.6 · POWER 8.8）',
  },
  {
    slug: "luzz-cannon-g1-minions",
    alt: "LUZZ CANNON GEN 1 MINIONS PERFORMANCE DISTRIBUTION",
    noteHtml:
      '能力值來源：<a href="https://paddlereviewhub.com/reviews/luzz-cannon">PaddleReviewHub — Cannon（同平台）</a>（SPIN 8.5 · FORGIVENESS 8.2 · CONTROL 7.8 · POP 8.7 · MANEUVERABILITY 7.6 · POWER 8.8）',
  },
  {
    slug: "joola-pro-v-kosmos",
    alt: "JOOLA KOSMOS PRO V PERFORMANCE DISTRIBUTION",
    noteHtml:
      "能力值來源：依 Pro V 系列評測／選拍指南推估（SPIN 8.6 · FORGIVENESS 8.7 · CONTROL 8.8 · POP 8.6 · MANEUVERABILITY 8.7 · POWER 8.7）",
  },
  {
    slug: "joola-pro-v-scorpeus",
    alt: "JOOLA SCORPEUS PRO V PERFORMANCE DISTRIBUTION",
    noteHtml:
      "能力值來源：依 Pro V 系列評測／選拍指南推估（SPIN 8.4 · FORGIVENESS 9.0 · CONTROL 9.0 · POP 8.4 · MANEUVERABILITY 8.9 · POWER 8.4）",
  },
  {
    slug: "leopard-wave-x",
    alt: "LEOPARD WAVE X PERFORMANCE DISTRIBUTION",
    noteHtml:
      "能力值來源：依產品規格與通路說明推估（SPIN 8.6 · FORGIVENESS 8.7 · CONTROL 8.6 · POP 8.5 · MANEUVERABILITY 8.6 · POWER 8.5）",
  },
  {
    slug: "facolos-elite-x",
    alt: "FACOLOS ELITE-X PERFORMANCE DISTRIBUTION",
    noteHtml:
      "能力值來源：依品牌／通路規格推估（SPIN 8.8 · FORGIVENESS 8.4 · CONTROL 8.3 · POP 8.9 · MANEUVERABILITY 8.4 · POWER 8.9）",
  },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  for (const spec of SPECS) {
    const marker = `${spec.slug}-radar.jpg`;
    const p = await prisma.paddle.findUnique({ where: { slug: spec.slug } });
    if (!p) {
      console.log("missing", spec.slug);
      continue;
    }
    if (p.description.includes(marker)) {
      console.log("skip", spec.slug);
      continue;
    }
    const prepend = [
      `<p><img src="/paddles/${marker}" alt="${spec.alt}" /></p>`,
      `<p><em>${spec.noteHtml}</em></p>`,
    ].join("");
    await prisma.paddle.update({
      where: { id: p.id },
      data: { description: `${prepend}${p.description}` },
    });
    console.log("prepended", spec.slug);
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
