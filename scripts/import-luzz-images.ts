/**
 * 從 luzzpickleball.com Shopify 產品圖，對應站上 16 支 LUZZ 球拍並寫入縮圖
 * 用法：npx tsx scripts/import-luzz-images.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CARD_GREY = { r: 0xec, g: 0xec, b: 0xec };
const WHITE_THRESHOLD = 235;

/** slug → Shopify product handle（必要時指定圖片 index） */
const MAP: Record<
  string,
  { handle: string; imageIndex?: number; variantTitleIncludes?: string }
> = {
  "luzz-inferno-zero": { handle: "luzz-pro-4-frozen-inferno" },
  "luzz-inferno-darkness": { handle: "luzz-pro-4-darkness-inferno" },
  // 官網目前無獨立「粉紫 Inferno」SKU，暫用 Pro 4 Inferno 主圖
  "luzz-inferno-pink-purple": {
    handle:
      "luzzpickleball-pro-4-inferno-mpp-pickleball-paddle-large-sweet-spot-durable-core",
  },
  "luzz-inferno-blue-flame": {
    handle:
      "luzzpickleball-pro-4-blue-blaze-inferno-mpp-pickleball-paddle-large-sweet-spot-durable-core",
  },
  "luzz-tornado-black": {
    handle: "luzzpickleball-pro-4-tornazo-carbon-fiber-pickleball-paddle-dual-layer-core",
    variantTitleIncludes: "Shadow",
  },
  "luzz-tornado-purple": {
    handle: "luzzpickleball-pro-4-tornazo-carbon-fiber-pickleball-paddle-dual-layer-core",
    variantTitleIncludes: "Tornazo",
    imageIndex: 0,
  },
  "luzz-cannon-g1-black": {
    handle:
      "luzzpickleball-cannon-paddle-t700-carbon-friction-surface-thermoformed",
  },
  "luzz-cannon-g1-collab": {
    handle:
      "luzzpickleball-kung-fu-panda-t700-carbon-friction-surface-thermoformed",
  },
  "luzz-cannon-g1-candy": {
    handle:
      "luzzpickleball-candy-cannon-paddle-t700-carbon-friction-surface-thermoformed",
  },
  "luzz-cannon-g1-ex": { handle: "luzz-cannon-ex" },
  "luzz-cannon-g1-jurassic": {
    handle:
      "luzzpickleball-jurassic-cannon-paddle-t700-carbon-friction-surface-thermoformed",
  },
  "luzz-cannon-g1-minions": {
    handle:
      "luzzpickleball-minions-cannon-paddle-t700-carbon-friction-surface-thermoformed",
  },
  "luzz-glider-2026": { handle: "luzz-glider-2026" },
  "luzz-glider-signature": { handle: "luzz-chris-glider-hybrid-paddle" },
  "luzz-glider-gatsby": {
    handle: "luzz-gabbys-dollhouse-glider-2026-hybrid-paddle",
  },
  "luzz-bladz-longyuan": { handle: "luzz-pro-blade2-long-yuan-paddle" },
  "luzz-cannon-g2-black": { handle: "luzz-cannon2-m1-paddle" },
  "luzz-cannon-g2-collab": { handle: "luzz-minions-cannon2-m1-paddle" },
};

type ShopifyProduct = {
  handle: string;
  title: string;
  body_html: string;
  images: { src: string; variant_ids?: number[] }[];
  variants: { id: number; title: string; featured_image?: { src: string } | null }[];
};

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function loadProducts(): Promise<Map<string, ShopifyProduct>> {
  const local = join(process.cwd(), "scripts/luzz-products.json");
  let data: { products: ShopifyProduct[] };
  try {
    data = JSON.parse(readFileSync(local, "utf8"));
  } catch {
    const res = await fetch(
      "https://luzzpickleball.com/collections/all/products.json?limit=250",
    );
    data = (await res.json()) as { products: ShopifyProduct[] };
    writeFileSync(local, JSON.stringify(data));
  }
  // Shopify pagination: also fetch page 2 if needed
  if (data.products.length >= 250) {
    const res2 = await fetch(
      "https://luzzpickleball.com/collections/all/products.json?limit=250&page=2",
    );
    const j2 = (await res2.json()) as { products: ShopifyProduct[] };
    data.products.push(...j2.products);
  }
  return new Map(data.products.map((p) => [p.handle, p]));
}

function pickImageSrc(
  product: ShopifyProduct,
  opts: { imageIndex?: number; variantTitleIncludes?: string },
): string | null {
  if (opts.variantTitleIncludes) {
    const v = product.variants.find((x) =>
      x.title.toLowerCase().includes(opts.variantTitleIncludes!.toLowerCase()),
    );
    if (v?.featured_image?.src) return v.featured_image.src;
    // Shopify often links images via variant_ids
    if (v) {
      const img = product.images.find((im) => im.variant_ids?.includes(v.id));
      if (img?.src) return img.src;
    }
  }
  const idx = opts.imageIndex ?? 0;
  return product.images[idx]?.src ?? product.images[0]?.src ?? null;
}

async function toCardGreyDataUrl(src: string): Promise<string> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`下載失敗 ${res.status}: ${src}`);
  const input = Buffer.from(await res.arrayBuffer());

  const resized = await sharp(input)
    .rotate()
    .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(resized.data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      pixels[i] = CARD_GREY.r;
      pixels[i + 1] = CARD_GREY.g;
      pixels[i + 2] = CARD_GREY.b;
    }
  }

  const png = await sharp(pixels, {
    raw: {
      width: resized.info.width,
      height: resized.info.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 8 })
    .toBuffer();

  if (png.length > 900_000) {
    const jpg = await sharp(png).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  }
  return `data:image/png;base64,${png.toString("base64")}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

async function main() {
  const byHandle = await loadProducts();
  console.log(`Shopify 產品數：${byHandle.size}`);

  for (const [slug, map] of Object.entries(MAP)) {
    const paddle = await prisma.paddle.findUnique({ where: { slug } });
    if (!paddle) {
      console.log(`略過（DB 無此 slug）：${slug}`);
      continue;
    }
    const product = byHandle.get(map.handle);
    if (!product) {
      console.log(`略過（官網無 handle）：${slug} ← ${map.handle}`);
      continue;
    }
    const src = pickImageSrc(product, map);
    if (!src) {
      console.log(`略過（無圖）：${slug}`);
      continue;
    }

    try {
      const imageDataUrl = await toCardGreyDataUrl(src);
      const blurb = stripHtml(product.body_html || "");
      const description =
        paddle.description.length < 80 && blurb
          ? `<p><em>草稿來源：Luzz 官網（請自行編輯）</em></p><p>${blurb}</p>`
          : paddle.description;

      await prisma.paddle.update({
        where: { slug },
        data: {
          imageDataUrl,
          ...(description !== paddle.description ? { description } : {}),
        },
      });
      console.log(`OK ${slug} ← ${product.title}`);
    } catch (e) {
      console.error(`失敗 ${slug}:`, e);
    }
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
