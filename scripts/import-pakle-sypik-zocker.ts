/**
 * 為 PAKLE / SYPIK / ZOCKER 寫入官網（或通路）產品圖 + 評測摘要內文
 * 用法：npx tsx scripts/import-pakle-sypik-zocker.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import sharp from "sharp";

const CARD_GREY = { r: 0xec, g: 0xec, b: 0xec };
const WHITE_THRESHOLD = 235;

type Entry = {
  slug: string;
  imageUrl: string;
  description: string;
  highlights?: string[];
};

const ENTRIES: Entry[] = [
  {
    slug: "pakle-fuse",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0268/0943/4186/files/fuse-new-gen5-pickleball-paddle-8581821.jpg?v=1769310668",
    highlights: ["Gen4.5 泡沫芯", "力量導向", "高 CP 值"],
    description: [
      '<p><em>草稿來源：Pakle 官網產品頁 + Matt’s Pickleball / 社群評測摘要（請自行編輯成站上最終文案）</em></p>',
      '<p>來源：<a href="https://paklepickleball.com/products/fuse-new-gen5-pickleball-paddle">Pakle FUSE 官網</a>、<a href="https://www.mattspickleball.com/paddle/fuse-16mm">Matt’s Pickleball Fuse 16mm</a></p>',
      "<h2>總評</h2>",
      "<p>PAKLE FUSE 定位 Gen4.5 全泡沫（TriFusion）力量拍：接觸時反應快、聲音偏響、推進感明顯。評測常把它拿來對標更高價位的 power foam 拍，強調「百元美元級就能摸到精英級 pop」。力量導向明確，廚房軟手與被動 reset 需要時間適應。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>形狀：Elongated（約 16.5\" × 7.4\"）</li>",
      "<li>厚度：16mm</li>",
      "<li>拍面：Raw T700 Carbon + DuraSpin 紋理</li>",
      "<li>核心：TriFusion / 多密度泡沫（MPP + TPU 環 + EVA 邊緣概念）</li>",
      "<li>重量約：8.0–8.3 oz</li>",
      "<li>握柄：約 5.5\" / 周長約 4.25\"</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>驅動與反擊回彈很快，旋轉表現在多數評測中屬中上。甜蜜點相對友善；但靜態擋球、被動 reset 容易「坐起來」，要主動用手軟化。熟悉後對喜歡主導節奏、用 pace 結束點數的球員很有趣。</p>",
      "<h2>適合誰</h2>",
      "<p>進階球友、偏進攻／力量型打法、想用相對親民價格嘗試現代泡沫力量拍的人。</p>",
      "<h2>優點</h2>",
      "<ul><li>力量與 CP 值突出</li><li>旋轉與揮速表現不錯</li><li>泡沫結構甜蜜點相對寬</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>控制與靜態 soft game 學習曲線明顯</li><li>擊球聲偏響，場上兩極</li><li>純防守／細膩手感取向可能不愛</li></ul>",
      "<h2>一句話</h2>",
      "<p>想用實惠價格碰「會炸」的泡沫力量拍，FUSE 是常被點名的入門門檻之一。</p>",
    ].join(""),
  },
  {
    slug: "sypik-triton5",
    // PicklePlay 通路圖：Pro Tour Ultimate Triton 5
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0713/7493/0214/files/product_m_u4_da5d0e64-25ae-4898-be7f-585fc332ee2a.png?v=1760536453",
    highlights: ["操控優先", "T700 碳纖", "高 CP 值"],
    description: [
      '<p><em>草稿來源：SYPIK 官網／通路規格 + PicklrLab 實驗室評測摘要（請自行編輯成站上最終文案）</em></p>',
      '<p>來源：<a href="https://sypik.com/">SYPIK 官網</a>、<a href="https://picklrlab.com/reviews/sypik-triton-5-pro">PicklrLab Triton 5 Pro</a>、<a href="https://pickleplay.vn/en/products/vot-pickleball-sypik-triton-5">PicklePlay 產品頁</a></p>',
      "<h2>總評</h2>",
      "<p>SYPIK TRITON5（Triton 5 Pro / Pro Tour Ultimate 系列）是操控優先的全面型碳纖拍。PicklrLab 綜合約 88/100，控制 90、旋轉 88、力量 85、CP 值 92；多位評測者把它當「可當主力」的中高階選擇，強調精準落點與可預期手感，而非極致 pop。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>拍面：T700 Carbon</li>",
      "<li>核心：聚合物蜂巢（常見評測款約 14mm；市售也有不同厚度／色系）</li>",
      "<li>重量約：8.0 oz 級（依色系／批次略有差異）</li>",
      "<li>形狀：偏 elongated，延伸距離與容錯兼顧</li>",
      "<li>特色：部分款式內建 NFC 晶片做保固／真偽驗證</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>廚房短球、第三拍 drop、對拉落點穩定；甜蜜點偏寬，偏心也不容易刺手。力量足夠完成進攻，但極致 bang 玩家可能覺得不夠「炸」。雙打策略型打法特別有感。</p>",
      "<h2>適合誰</h2>",
      "<p>中高級想升級操控的球友、雙打為主、重視一致性與 CP 值的人。</p>",
      "<h2>優點</h2>",
      "<ul><li>操控與容錯出色</li><li>做工與回饋被多家評測肯定</li><li>相對同級碳纖拍定價親民</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>純力量／底線硬打可能不夠吃</li><li>旋轉屬優秀但非頂尖專門款</li><li>市售色系／子款多，規格請以實物為準</li></ul>",
      "<h2>一句話</h2>",
      "<p>要「打得準、打得穩」又想留預算的碳纖主力，TRITON5 是亞洲市場常被點名的一款。</p>",
    ].join(""),
  },
  {
    slug: "zocker-aspire-signature",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0713/7493/0214/files/product_mau7.png?v=1775883187",
    highlights: ["簽名聯名", "攻守平衡", "USA Pickleball"],
    description: [
      '<p><em>草稿來源：Zocker／PicklePlay 產品與評測頁摘要（請自行編輯成站上最終文案）</em></p>',
      '<p>來源：<a href="https://pickleplay.vn/en/products/vot-pickleball-zocker-aspire-signature-x-phuc-huynh">PicklePlay 產品頁</a>、<a href="https://pickleplay.vn/en/blogs/review-vot-pickleball/review-vot-pickleball-zocker-aspire-signature-x-phuc-huynh-vot-chu-ky-dinh-cao-cua-lang-pickleball-viet">PicklePlay 評測</a>、<a href="https://worldpickleballmagazine.com/blogs/world-pickleball-news/phuc-huynh-zocker-aspire-pickleball-paddle-launch">World Pickleball Magazine</a></p>',
      "<h2>總評</h2>",
      "<p>ZOCKER ASPIRE SIGNATURE（Aspire Signature × Phúc Huỳnh）是越南品牌與亞洲頂尖單打選手 Phúc Huỳnh 共同開發的簽名系列。定位攻守平衡：T700 碳面 + 熱壓蜂巢芯，強調清晰擊球感、穩定抗扭與可打進正式賽事的規格（USA Pickleball Approved）。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>厚度：常見 16mm（系列亦有約 13mm 選項）</li>",
      "<li>拍面：日本製 T700 Carbon</li>",
      "<li>核心：高密度熱壓 PP 蜂巢（部分通路標示搭配 EVA foam）</li>",
      "<li>重量約：225–235g（約 7.9–8.3 oz）</li>",
      "<li>握柄長約 14cm；3–9 點配重提升抗扭與甜蜜點</li>",
      "<li>邊框：較厚 TPE；內建 NFC 真偽驗證</li>",
      "<li>配色：Neptune／Earth／Space／Moon／Mars／Sun 等</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>通路評測給出操控約 9/10、力量約 8.5、旋轉約 8.5、穩定約 9.5。Dink、drop、drive、殺球都能兼顧；配重讓拍面扭轉較小，過渡球與對打較穩。整體偏「能攻也能守」的主力簽名拍，而非極致 bang 專用。</p>",
      "<h2>適合誰</h2>",
      "<p>中高級球友、想要簽名聯名外觀又要實戰平衡手感的人；單打／雙打都可當主力。</p>",
      "<h2>優點</h2>",
      "<ul><li>攻守平衡、擊球回饋清楚</li><li>配重與抗扭表現佳</li><li>認證＋NFC，賽事與正品辨識方便</li><li>外觀識別度高</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>極致力量取向可能還想更彈</li><li>海外通路與保固依地區而異</li><li>色系多，圖示為代表色之一</li></ul>",
      "<h2>一句話</h2>",
      "<p>亞洲選手背書的簽名平衡拍：好看、好認，場上也能當正式主力。</p>",
    ].join(""),
  },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function toCardGreyDataUrl(src: string): Promise<string> {
  const res = await fetch(src, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PlayPlayPlayBot/1.0)" },
  });
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

async function main() {
  for (const entry of ENTRIES) {
    const paddle = await prisma.paddle.findUnique({ where: { slug: entry.slug } });
    if (!paddle) {
      console.log(`略過（DB 無此 slug）：${entry.slug}`);
      continue;
    }
    try {
      const imageDataUrl = await toCardGreyDataUrl(entry.imageUrl);
      await prisma.paddle.update({
        where: { slug: entry.slug },
        data: {
          imageDataUrl,
          description: entry.description,
          ...(entry.highlights ? { highlights: entry.highlights } : {}),
        },
      });
      console.log(
        `OK ${entry.slug} img≈${Math.round(imageDataUrl.length / 1024)}kb desc=${entry.description.length}chars`,
      );
    } catch (e) {
      console.error(`失敗 ${entry.slug}:`, e);
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
