/**
 * 從各品牌官網／Shopify 回填美金 MSRP（listPriceUsd）
 * 用法：npx tsx scripts/backfill-paddle-prices.ts
 *
 * 注意：Shopify 會依 IP 回傳當地幣；此腳本強制 Cookie USD。
 * 原價優先取 compare_at_price（若高於售價），否則取 price。
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

type Entry = {
  slug: string;
  /** Shopify .json product URL（需含 .json） */
  jsonUrl: string;
  /** 前台顯示的來源連結（無 .json） */
  sourceUrl: string;
  priceNote?: string;
  /** 若多 variant，可挑 title 包含字串 */
  variantIncludes?: string;
  /** 手動覆寫美金價（無法從 API 穩定取得時） */
  forceUsd?: number;
};

const ENTRIES: Entry[] = [
  // JOOLA
  {
    slug: "joola-pro-v-perseus",
    jsonUrl:
      "https://joola.com/products/joola-perseus-pro-v-pickleball-paddle-1.json",
    sourceUrl:
      "https://joola.com/products/joola-perseus-pro-v-pickleball-paddle-1",
    priceNote: "14/16mm 同價",
  },
  {
    slug: "joola-pro-v-kosmos",
    jsonUrl: "https://joola.com/products/kosmos-pro-v-pickleball-paddle.json",
    sourceUrl: "https://joola.com/products/kosmos-pro-v-pickleball-paddle",
    priceNote: "14/16mm 同價",
  },
  {
    slug: "joola-pro-v-scorpeus",
    jsonUrl: "https://joola.com/products/scorpeus-pro-v-pickleball-paddle.json",
    sourceUrl: "https://joola.com/products/scorpeus-pro-v-pickleball-paddle",
    priceNote: "14/16mm 同價",
  },
  // ENHANCE
  {
    slug: "enhance-mpp-widebody",
    jsonUrl: "https://enhancepickleball.com/products/mpp-turbo.json",
    sourceUrl: "https://enhancepickleball.com/products/mpp-turbo",
    priceNote: "MPP Turbo 各形狀同價",
  },
  {
    slug: "enhance-mpp-elongated",
    jsonUrl: "https://enhancepickleball.com/products/mpp-turbo.json",
    sourceUrl: "https://enhancepickleball.com/products/mpp-turbo",
    priceNote: "MPP Turbo 各形狀同價",
  },
  {
    slug: "enhance-epp-widebody",
    jsonUrl: "https://enhancepickleball.com/products/epp-turbo.json",
    sourceUrl: "https://enhancepickleball.com/products/epp-turbo",
    priceNote: "EPP Turbo 各形狀同價",
  },
  // HONOLULU
  {
    slug: "honolulu-j2cr",
    jsonUrl:
      "https://808pickle.com/products/j2cr-crystal-blue-endurance-surface%E2%84%A2-pre-order.json",
    sourceUrl:
      "https://808pickle.com/products/j2cr-crystal-blue-endurance-surface™-pre-order",
  },
  {
    slug: "honolulu-j6cr",
    jsonUrl:
      "https://808pickle.com/products/j6cr-crystal-blue-endurance-surface%E2%84%A2-pre-order.json",
    sourceUrl:
      "https://808pickle.com/products/j6cr-crystal-blue-endurance-surface™-pre-order",
  },
  // LUZZ Cannon
  {
    slug: "luzz-cannon-g1-black",
    jsonUrl:
      "https://luzzpickleball.com/products/luzzpickleball-cannon-paddle-t700-carbon-friction-surface-thermoformed.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzzpickleball-cannon-paddle-t700-carbon-friction-surface-thermoformed",
    variantIncludes: "Dual Certification",
  },
  {
    slug: "luzz-cannon-g1-collab",
    jsonUrl:
      "https://luzzpickleball.com/products/luzzpickleball-kung-fu-panda-t700-carbon-friction-surface-thermoformed.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzzpickleball-kung-fu-panda-t700-carbon-friction-surface-thermoformed",
  },
  {
    slug: "luzz-cannon-g1-candy",
    jsonUrl:
      "https://luzzpickleball.com/products/luzzpickleball-candy-cannon-paddle-t700-carbon-friction-surface-thermoformed.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzzpickleball-candy-cannon-paddle-t700-carbon-friction-surface-thermoformed",
  },
  {
    slug: "luzz-cannon-g1-jurassic",
    jsonUrl:
      "https://luzzpickleball.com/products/luzzpickleball-jurassic-cannon-paddle-t700-carbon-friction-surface-thermoformed.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzzpickleball-jurassic-cannon-paddle-t700-carbon-friction-surface-thermoformed",
  },
  {
    slug: "luzz-cannon-g1-minions",
    jsonUrl:
      "https://luzzpickleball.com/products/luzzpickleball-minions-cannon-paddle-t700-carbon-friction-surface-thermoformed.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzzpickleball-minions-cannon-paddle-t700-carbon-friction-surface-thermoformed",
  },
  {
    slug: "luzz-cannon-g1-ex",
    jsonUrl: "https://luzzpickleball.com/products/luzz-cannon-ex.json",
    sourceUrl: "https://luzzpickleball.com/products/luzz-cannon-ex",
  },
  {
    slug: "luzz-cannon-g2-black",
    jsonUrl: "https://luzzpickleball.com/products/luzz-cannon2-m1-paddle.json",
    sourceUrl: "https://luzzpickleball.com/products/luzz-cannon2-m1-paddle",
    variantIncludes: "Cannon2 M1",
  },
  {
    slug: "luzz-cannon-g2-collab",
    jsonUrl:
      "https://luzzpickleball.com/products/luzz-minions-cannon2-m1-paddle.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzz-minions-cannon2-m1-paddle",
  },
  // LUZZ Inferno
  {
    slug: "luzz-inferno-zero",
    jsonUrl: "https://luzzpickleball.com/products/luzz-pro-4-frozen-inferno.json",
    sourceUrl: "https://luzzpickleball.com/products/luzz-pro-4-frozen-inferno",
  },
  {
    slug: "luzz-inferno-darkness",
    jsonUrl:
      "https://luzzpickleball.com/products/luzz-pro-4-darkness-inferno.json",
    sourceUrl: "https://luzzpickleball.com/products/luzz-pro-4-darkness-inferno",
  },
  {
    slug: "luzz-inferno-blue-flame",
    jsonUrl:
      "https://luzzpickleball.com/products/luzzpickleball-pro-4-blue-blaze-inferno-mpp-pickleball-paddle-large-sweet-spot-durable-core.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzzpickleball-pro-4-blue-blaze-inferno-mpp-pickleball-paddle-large-sweet-spot-durable-core",
  },
  {
    slug: "luzz-inferno-pink-purple",
    jsonUrl:
      "https://luzzpickleball.com/products/luzzpickleball-pro-4-inferno-mpp-pickleball-paddle-large-sweet-spot-durable-core.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzzpickleball-pro-4-inferno-mpp-pickleball-paddle-large-sweet-spot-durable-core",
    forceUsd: 229,
    priceNote: "標準 Inferno 標價（compare_at）",
  },
  // LUZZ Tornado / Glider / Bladz
  {
    slug: "luzz-tornado-black",
    jsonUrl:
      "https://luzzpickleball.com/products/luzzpickleball-pro-4-tornazo-carbon-fiber-pickleball-paddle-dual-layer-core.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzzpickleball-pro-4-tornazo-carbon-fiber-pickleball-paddle-dual-layer-core",
    variantIncludes: "Shadow",
  },
  {
    slug: "luzz-tornado-purple",
    jsonUrl:
      "https://luzzpickleball.com/products/luzzpickleball-pro-4-tornazo-carbon-fiber-pickleball-paddle-dual-layer-core.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzzpickleball-pro-4-tornazo-carbon-fiber-pickleball-paddle-dual-layer-core",
    variantIncludes: "Tornazo",
  },
  {
    slug: "luzz-glider-2026",
    jsonUrl: "https://luzzpickleball.com/products/luzz-glider-2026.json",
    sourceUrl: "https://luzzpickleball.com/products/luzz-glider-2026",
  },
  {
    slug: "luzz-glider-signature",
    jsonUrl:
      "https://luzzpickleball.com/products/luzz-chris-glider-hybrid-paddle.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzz-chris-glider-hybrid-paddle",
  },
  {
    slug: "luzz-glider-gatsby",
    jsonUrl:
      "https://luzzpickleball.com/products/luzz-gabbys-dollhouse-glider-2026-hybrid-paddle.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzz-gabbys-dollhouse-glider-2026-hybrid-paddle",
  },
  {
    slug: "luzz-bladz-longyuan",
    jsonUrl:
      "https://luzzpickleball.com/products/luzz-pro-blade2-long-yuan-paddle.json",
    sourceUrl:
      "https://luzzpickleball.com/products/luzz-pro-blade2-long-yuan-paddle",
  },
  // RPM
  {
    slug: "rpm-q2",
    jsonUrl:
      "https://rpmpb.com/products/rpm-q2-16mm-widebody-pickleball-paddle.json",
    sourceUrl:
      "https://rpmpb.com/products/rpm-q2-16mm-widebody-pickleball-paddle",
    priceNote: "以 Widebody 16mm 官網標價為準",
  },
  {
    slug: "rpm-v2",
    jsonUrl:
      "https://rpmpb.com/products/rpm-friction-pro-16mm-elongated-v2.json",
    sourceUrl: "https://rpmpb.com/products/rpm-friction-pro-16mm-elongated-v2",
  },
  {
    slug: "rpm-v2-pink",
    jsonUrl: "https://rpmpb.com/products/ella-oh-pink-v2-elongated-16mm.json",
    sourceUrl: "https://rpmpb.com/products/ella-oh-pink-v2-elongated-16mm",
  },
  // FACOLOS
  {
    slug: "facolos-elite-x",
    jsonUrl: "https://shopfacolos.com/products/facolos-elite-x.json",
    sourceUrl: "https://shopfacolos.com/products/facolos-elite-x",
    priceNote: "取 compare_at 原價；14/16mm 同價",
  },
  // PAKLE / SYPIK / ZOCKER / LEOPARD — 手動或通路
  {
    slug: "pakle-fuse",
    jsonUrl: "https://paklepickleball.com/products/fuse-new-gen5-pickleball-paddle.json",
    sourceUrl: "https://paklepickleball.com/products/fuse-new-gen5-pickleball-paddle",
    forceUsd: 119,
  },
  {
    slug: "sypik-triton5",
    jsonUrl: "",
    sourceUrl: "https://picklrlab.com/reviews/sypik-triton-5-pro",
    forceUsd: undefined,
    priceNote: "待補官網美金標價",
  },
  {
    slug: "zocker-aspire-signature",
    jsonUrl: "",
    sourceUrl:
      "https://pickleplay.vn/en/products/vot-pickleball-zocker-aspire-signature-x-phuc-huynh",
    forceUsd: undefined,
    priceNote: "待補官網美金標價",
  },
  {
    slug: "leopard-wave-x",
    jsonUrl: "",
    sourceUrl:
      "https://pickleplay.vn/en/products/vot-pickleball-leopard-wave-x-pro-2026",
    priceNote: "區域通路標價（無統一美金 MSRP）",
  },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type ShopifyVariant = {
  title: string;
  price: string;
  compare_at_price: string | null;
  price_currency?: string;
};

async function fetchUsdProduct(jsonUrl: string): Promise<{
  variants: ShopifyVariant[];
}> {
  const res = await fetch(jsonUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PlayPlayPlayBot/1.0)",
      Cookie: "cart_currency=USD; localization=US",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = (await res.json()) as {
    product: { variants: ShopifyVariant[] };
  };
  return { variants: j.product.variants };
}

function pickListUsd(
  variants: ShopifyVariant[],
  variantIncludes?: string,
): { usd: number; currency: string } {
  const list = variantIncludes
    ? variants.filter((v) =>
        v.title.toLowerCase().includes(variantIncludes.toLowerCase()),
      )
    : variants;
  const pool = list.length ? list : variants;
  let best = 0;
  let currency = "USD";
  for (const v of pool) {
    const price = Number(v.price) || 0;
    const compare = Number(v.compare_at_price) || 0;
    const listPrice = Math.max(price, compare);
    if (listPrice > best) {
      best = listPrice;
      currency = v.price_currency || "USD";
    }
  }
  return { usd: best, currency };
}

async function main() {
  let ok = 0;
  let skip = 0;
  for (const entry of ENTRIES) {
    const paddle = await prisma.paddle.findUnique({ where: { slug: entry.slug } });
    if (!paddle) {
      console.log("missing slug", entry.slug);
      skip += 1;
      continue;
    }

    try {
      let listPriceUsd = entry.forceUsd ?? null;
      let currency = "USD";

      if (listPriceUsd == null && entry.jsonUrl) {
        const { variants } = await fetchUsdProduct(entry.jsonUrl);
        const picked = pickListUsd(variants, entry.variantIncludes);
        listPriceUsd = picked.usd || null;
        currency = picked.currency;
      }

      if (listPriceUsd == null || listPriceUsd <= 0) {
        console.log("no price", entry.slug);
        await prisma.paddle.update({
          where: { slug: entry.slug },
          data: {
            priceSourceUrl: entry.sourceUrl,
            priceNote: entry.priceNote ?? paddle.priceNote,
          },
        });
        skip += 1;
        continue;
      }

      if (currency !== "USD" && entry.forceUsd == null) {
        console.log("skip non-USD", entry.slug, currency, listPriceUsd);
        await prisma.paddle.update({
          where: { slug: entry.slug },
          data: {
            listPriceUsd: null,
            priceSourceUrl: entry.sourceUrl,
            priceNote: entry.priceNote ?? "非美金標價，待人工補 USD MSRP",
          },
        });
        skip += 1;
        continue;
      }

      await prisma.paddle.update({
        where: { slug: entry.slug },
        data: {
          listPriceUsd,
          priceSourceUrl: entry.sourceUrl,
          priceNote: entry.priceNote ?? null,
        },
      });
      console.log("OK", entry.slug, `US$${listPriceUsd}`, currency);
      ok += 1;
    } catch (e) {
      console.error("fail", entry.slug, e instanceof Error ? e.message : e);
      skip += 1;
    }
  }
  console.log("done ok", ok, "skip", skip);
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
