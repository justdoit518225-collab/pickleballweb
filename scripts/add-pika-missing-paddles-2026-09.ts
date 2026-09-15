/**
 * 依 PIKA 教練團主價格表（2026.09.01）補上站上尚未收錄的球拍
 * 用法：npx tsx scripts/add-pika-missing-paddles-2026-09.ts
 *
 * 對照結果（價格表有、站上無）：
 * - LUZZ 地獄火 破曉（Inferno2 M1 Dawn）
 * - SPARTUS Spitfire
 * - RPM Jade
 * - SIX ZERO Coral Pro
 * - SELKIRK Omni / Boomstik / Boomstik 亞洲版禮盒
 *
 * 略過：PP C16（疑似非球拍／資訊不足）、JOOLA「全系列電洽」（站上已有 Pro V）
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import sharp from "sharp";

const CARD_GREY = { r: 0xec, g: 0xec, b: 0xec };
const WHITE_THRESHOLD = 235;

type Entry = {
  brand: string;
  slug: string;
  series: string;
  variant: string;
  nameZh: string;
  nameEn: string;
  listPriceUsd: number | null;
  priceSourceUrl: string | null;
  priceNote: string | null;
  highlights: string[];
  description: string;
  imageUrl?: string;
};

const ENTRIES: Entry[] = [
  {
    brand: "LUZZ",
    slug: "luzz-inferno-dawn",
    series: "地獄火",
    variant: "破曉",
    nameZh: "地獄火 破曉",
    nameEn: "Inferno2 M1 Dawn",
    listPriceUsd: 239,
    priceSourceUrl: "https://luzzpickleball.com/products/luzz-inferno2-m1",
    priceNote: "Inferno2 M1；PIKA 表列破曉",
    highlights: ["地獄火", "破曉", "Inferno2 M1", "MPP2"],
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0659/0772/0365/files/1_77049e26-42e2-43d8-8e34-f3dfc9ac3c39.jpg?v=1786500643",
    description: [
      "<p><em>草稿來源：Luzz 官網 Inferno2 M1 Dawn（請自行編輯）</em></p>",
      '<p>來源：<a href="https://luzzpickleball.com/products/luzz-inferno2-m1">Luzz Inferno2 M1 Dawn</a></p>',
      "<h2>總評</h2>",
      "<p>地獄火二代（Inferno2 M1／破曉）：延續一代地獄火力量取向，升級 MPP2 核心、TPEE Dynamic Return Ring 與 Aero-Black 碳化矽拍面，強調長時間擊球仍保有 pop 與旋轉。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>系列：地獄火／Inferno2 M1 · 破曉（Dawn）</li>",
      "<li>厚度：16mm · 長版</li>",
      "<li>核心：MPP2™ Power Core + TPEE Dynamic Return Ring™</li>",
      "<li>拍面：Aero-Black™ Integrated Silicon Carbide</li>",
      "<li>認證：UPA-A（依官網批次）</li>",
      "</ul>",
      "<h2>適合誰</h2>",
      "<p>喜歡地獄火力量、想要二代更穩甜蜜點與更耐用旋貼的攻擊型球友。</p>",
      "<h2>一句話</h2>",
      "<p>地獄火二代破曉：同樣兇，打更久還咬得住。</p>",
    ].join(""),
  },
  {
    brand: "SPARTUS",
    slug: "spartus-spitfire",
    series: "Spitfire",
    variant: "-",
    nameZh: "Spitfire",
    nameEn: "Spitfire Elongated",
    listPriceUsd: 109.99,
    priceSourceUrl: "https://gospartus.com/products/spitfire-elongated",
    priceNote: null,
    highlights: ["Spitfire", "長版", "Gen4", "USAP"],
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0669/2310/2503/files/SFE1.png?v=1783019645",
    description: [
      "<p><em>草稿來源：Spartus 官網 Spitfire Elongated（請自行編輯）</em></p>",
      '<p>來源：<a href="https://gospartus.com/products/spitfire-elongated">Spartus Spitfire Elongated</a></p>',
      "<h2>總評</h2>",
      "<p>Spartus Spitfire 長版：Gen 4 Turbo Foam 核心 + PermaGritNano 耐用旋貼，定位高性價比力量拍；揮重偏輕、旋轉表現突出。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>形狀：Elongated · 16mm</li>",
      "<li>平均重量約 7.85 oz；握柄約 5.5\"</li>",
      "<li>認證：USAP</li>",
      "</ul>",
      "<h2>適合誰</h2>",
      "<p>想要長版力量與高旋轉、預算約百美元級的球友。</p>",
      "<h2>一句話</h2>",
      "<p>百元級長版力量拍裡，旋轉與耐用旋貼是賣點。</p>",
    ].join(""),
  },
  {
    brand: "RPM",
    slug: "rpm-jade",
    series: "Jade",
    variant: "14/16mm",
    nameZh: "Jade",
    nameEn: "Jade",
    listPriceUsd: 269.99,
    priceSourceUrl: "https://rpmpb.com/products/rpm-jade-14mm-elongated-pickleball-paddle",
    priceNote: "長版／寬版、14／16mm 官網同價",
    highlights: ["Jade", "MPP", "SICmatrix", "14/16mm"],
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0690/0891/6654/files/Jade_14E_-_Front.png?v=1787936287",
    description: [
      "<p><em>草稿來源：RPM 官網 Jade 系列（請自行編輯）</em></p>",
      '<p>來源：<a href="https://rpmpb.com/collections/jade-series">RPM Jade Series</a></p>',
      "<h2>總評</h2>",
      "<p>RPM Jade：全泡沫 MPP floating core + SICmatrix 碳化矽拍面，主打「旋轉能撐很久」的力量泡沫拍。可選長版／寬版、14mm／16mm。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>核心：MPP floating + EVA 周邊</li>",
      "<li>拍面：SICmatrix（Tier 1 耐用旋貼取向）</li>",
      "<li>形狀：Elongated／Widebody · 厚度 14／16mm</li>",
      "<li>認證：USAP（依官網）</li>",
      "</ul>",
      "<h2>適合誰</h2>",
      "<p>喜歡 RPM 力量泡沫、又在意旋貼壽命的進階球友。</p>",
      "<h2>一句話</h2>",
      "<p>RPM 新世代泡沫拍：要力量，也要咬球咬得久。</p>",
    ].join(""),
  },
  {
    brand: "SIX ZERO",
    slug: "six-zero-coral-pro",
    series: "Coral Pro",
    variant: "16mm",
    nameZh: "Coral Pro",
    nameEn: "Coral Pro 16mm",
    listPriceUsd: 220,
    priceSourceUrl: "https://us.sixzeropickleball.com/products/coral-pro",
    priceNote: "Hybrid／Elongated／Widebody 同價",
    highlights: ["Coral Pro", "16mm", "Six Zero"],
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0861/2118/5565/files/2G1A0013.png?v=1787519686",
    description: [
      "<p><em>草稿來源：Six Zero 官網 Coral Pro（請自行編輯）</em></p>",
      '<p>來源：<a href="https://us.sixzeropickleball.com/products/coral-pro">Six Zero Coral Pro</a></p>',
      "<h2>總評</h2>",
      "<p>Six Zero Coral Pro 16mm：Coral 線的進階版，強調旋轉、柔軟力量與控制；可選 Hybrid／Elongated／Widebody 與多種配色。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>厚度：16mm</li>",
      "<li>形狀：Hybrid／Elongated／Widebody</li>",
      "<li>定位：全面偏力量的 Coral 進階款</li>",
      "</ul>",
      "<h2>適合誰</h2>",
      "<p>喜歡 Six Zero 手感、想要 Coral 系列更高階表現的球友。</p>",
      "<h2>一句話</h2>",
      "<p>Coral 進階款：旋與柔軟力量並重。</p>",
    ].join(""),
  },
  {
    brand: "SELKIRK",
    slug: "selkirk-omni",
    series: "OMNI",
    variant: "-",
    nameZh: "OMNI",
    nameEn: "OMNI",
    listPriceUsd: 300,
    priceSourceUrl: "https://www.selkirk.com/products/selkirk-omni-pickleball-paddle",
    priceNote: null,
    highlights: ["OMNI", "ReactCore", "MOI", "全面型"],
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0152/5763/2822/files/vertical_PNG_3000x4000-Selkirk-Omni-Pickleball-Paddle-Elongated-Hydro-Blue-03.png?v=1778779946",
    description: [
      "<p><em>草稿來源：Selkirk 官網 OMNI（請自行編輯）</em></p>",
      '<p>來源：<a href="https://www.selkirk.com/products/selkirk-omni-pickleball-paddle">Selkirk OMNI</a></p>',
      "<h2>總評</h2>",
      "<p>Selkirk OMNI：全面型泡沫拍，ReactCore（PureFoam + EVA Power Ring）搭配可調 MOI 配重，定位比 Boomstik 更偏控制與全場適應。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>核心：ReactCore™</li>",
      "<li>拍面：InfiniGrit®</li>",
      "<li>特色：可拆／重排 MOI Tuning System</li>",
      "</ul>",
      "<h2>適合誰</h2>",
      "<p>想要 Selkirk 旗艦全面拍、重視控制與可調配重的球友。</p>",
      "<h2>一句話</h2>",
      "<p>Selkirk 全面泡沫拍：比 Boomstik 更柔、更好調度。</p>",
    ].join(""),
  },
  {
    brand: "SELKIRK",
    slug: "selkirk-boomstik",
    series: "LABS Boomstik",
    variant: "-",
    nameZh: "Boomstik",
    nameEn: "LABS Project Boomstik",
    listPriceUsd: 333,
    priceSourceUrl: "https://www.selkirk.com/products/selkirk-labs-project-boomstik",
    priceNote: null,
    highlights: ["Boomstik", "LABS", "力量", "MOI"],
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0152/5763/2822/files/vertical_1500x2000-PDP-Labs-Boomstik-Widebody-Pickleball-Paddle-01x.jpg?v=1787102091",
    description: [
      "<p><em>草稿來源：Selkirk LABS Project Boomstik（請自行編輯）</em></p>",
      '<p>來源：<a href="https://www.selkirk.com/products/selkirk-labs-project-boomstik">Selkirk LABS Project Boomstik</a></p>',
      "<h2>總評</h2>",
      "<p>Selkirk LABS Project Boomstik：LABS 力量泡沫旗艦，MOI Tuning System + InfiniGrit，主打爆炸 pop 與進攻壓力。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>系列：LABS Project Boomstik</li>",
      "<li>拍面：InfiniGrit®</li>",
      "<li>特色：MOI Tuning System</li>",
      "</ul>",
      "<h2>適合誰</h2>",
      "<p>進攻型、想要 Selkirk 最高力量泡沫體驗的球友。</p>",
      "<h2>一句話</h2>",
      "<p>Selkirk 力量泡沫旗艦：要壓制對手就選 Boomstik。</p>",
    ].join(""),
  },
  {
    brand: "SELKIRK",
    slug: "selkirk-boomstik-asia-gift",
    series: "LABS Boomstik",
    variant: "亞洲版禮盒",
    nameZh: "Boomstik 亞洲版禮盒",
    nameEn: "LABS Project Boomstik Asia Gift Set",
    listPriceUsd: null,
    priceSourceUrl: null,
    priceNote: "PIKA 表列亞洲版禮盒；美金 MSRP 待補",
    highlights: ["Boomstik", "亞洲版", "禮盒"],
    description: [
      "<p><em>草稿來源：PIKA 教練團主價格表 2026.09.01（請自行編輯）</em></p>",
      "<h2>總評</h2>",
      "<p>Selkirk Boomstik 亞洲版禮盒：區域／通路禮盒配置，性能大致對齊 LABS Boomstik 平台；包裝與配件以實際到貨為準。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>系列：LABS Boomstik · 亞洲版禮盒</li>",
      "<li>美金官網標價：待補</li>",
      "</ul>",
      "<h2>一句話</h2>",
      "<p>Boomstik 亞洲禮盒版：手感對齊旗艦，包裝走區域限定。</p>",
    ].join(""),
  },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function ensureBrand(name: string): Promise<string> {
  const existing = await prisma.paddleBrand.findUnique({ where: { name } });
  if (existing) return existing.id;
  const maxSort = await prisma.paddleBrand.aggregate({ _max: { sortOrder: true } });
  const brand = await prisma.paddleBrand.create({
    data: { name, sortOrder: (maxSort._max.sortOrder ?? -1) + 1 },
  });
  console.log("brand created", name);
  return brand.id;
}

async function toCardGreyDataUrl(src: string): Promise<string> {
  const res = await fetch(src, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PlayPlayPlayBot/1.0)" },
  });
  if (!res.ok) throw new Error(`download ${res.status}: ${src}`);
  const input = Buffer.from(await res.arrayBuffer());

  const resized = await sharp(input)
    .rotate()
    .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(resized.data);
  for (let i = 0; i < pixels.length; i += 4) {
    if (
      pixels[i]! >= WHITE_THRESHOLD &&
      pixels[i + 1]! >= WHITE_THRESHOLD &&
      pixels[i + 2]! >= WHITE_THRESHOLD
    ) {
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

async function main() {
  let created = 0;
  let updated = 0;

  for (const entry of ENTRIES) {
    const brandId = await ensureBrand(entry.brand);
    let imageDataUrl: string | undefined;
    if (entry.imageUrl) {
      try {
        imageDataUrl = await toCardGreyDataUrl(entry.imageUrl);
        console.log("img ok", entry.slug, Math.round(imageDataUrl.length / 1024), "kb");
      } catch (e) {
        console.warn("img fail", entry.slug, e);
      }
    }

    const existing = await prisma.paddle.findUnique({ where: { slug: entry.slug } });
    const data = {
      series: entry.series,
      variant: entry.variant,
      nameZh: entry.nameZh,
      nameEn: entry.nameEn,
      description: entry.description,
      highlights: entry.highlights,
      listPriceUsd: entry.listPriceUsd,
      priceSourceUrl: entry.priceSourceUrl,
      priceNote: entry.priceNote,
      ...(imageDataUrl ? { imageDataUrl } : {}),
    };

    if (existing) {
      await prisma.paddle.update({ where: { slug: entry.slug }, data });
      updated += 1;
      console.log("updated", entry.slug);
    } else {
      const maxSort = await prisma.paddle.aggregate({
        where: { brandId },
        _max: { sortOrder: true },
      });
      await prisma.paddle.create({
        data: {
          brandId,
          slug: entry.slug,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
          ...data,
        },
      });
      created += 1;
      console.log("created", entry.slug);
    }
  }

  console.log("done created", created, "updated", updated);
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
