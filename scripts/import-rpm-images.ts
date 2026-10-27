/**
 * 為 RPM Q2 / V2 / V2 Pink 寫入官網產品圖 + 評測摘要內文
 * 用法：npx tsx scripts/import-rpm-images.ts
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
  /** 若設為 true，僅更新圖片、保留既有內文 */
  imageOnly?: boolean;
  description?: string;
  highlights?: string[];
};

const ENTRIES: Entry[] = [
  {
    slug: "rpm-q2",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0690/0891/6654/files/1_Q2_Widebody_16mm_Straight.png?v=1771538132",
    // 既有 PRH 草稿已寫入，只補圖；若內文仍極短才覆寫
    description: [
      '<p><em>草稿來源：RPM 官網 + PaddleReviewHub（請自行編輯成站上最終文案）</em></p>',
      '<p>來源：<a href="https://rpmpb.com/products/rpm-q2-16mm-widebody-pickleball-paddle">RPM Q2 16mm Widebody 官網</a>、<a href="https://paddlereviewhub.com/reviews/rpm-q2-widebody-16mm">PRH Q2 Widebody 16mm</a></p>',
      "<h2>總評</h2>",
      "<p>多數人最適合的 RPM Q2 起點：大力量、高旋轉（約 2,310 RPM）、揮速快（swing weight 約 107），又有不錯 twist weight，比很多純力量拍更好打。PRH 綜合約 9.2/10，視作「不知道選哪支 Q2，先從 Widebody 開始」。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>形狀：Widebody / Standard</li>",
      "<li>厚度：16mm（系列另有 14mm／Elongated）</li>",
      "<li>核心：Full-foam，區域密度調校</li>",
      "<li>拍面：Carbon fiber</li>",
      "<li>重量約：7.8 oz；握柄約 5.5\"</li>",
      "<li>認證：USAP PBCoR .43</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>Drive 有 plow-through，碳板吃上旋好；相對 elongated Q2，犧牲延伸換穩定與容錯，多數雙打會覺得划算。拍面偏硬、連貫而非柔軟，reset 要乾淨，但偏心仍較能守住。</p>",
      "<h2>適合誰</h2>",
      "<p>想要 RPM 招牌力量＋旋轉、又不要太犧牲穩定的攻擊型雙打；或從力量 elongated 想改好打雙手戰的人。</p>",
      "<h2>優點</h2>",
      "<ul><li>Widebody 仍有很強力量</li><li>旋轉頂尖</li><li>揮速快、穩定度不錯</li><li>比 elongated Q2 更好容錯</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>定價偏高</li><li>延伸不如 elongated</li><li>偏力量拍，軟手需要乾淨技術</li></ul>",
      "<h2>一句話</h2>",
      "<p>不知道 Q2 選哪支，先從 Widebody 開始最穩。</p>",
    ].join(""),
    highlights: ["全泡沫力量", "高旋轉", "Widebody 容錯"],
  },
  {
    slug: "rpm-v2",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0690/0891/6654/files/V2_16_USAP_only.png?v=1776437125",
    highlights: ["Friction Pro V2", "高旋轉", "Elongated 攻擊"],
    description: [
      '<p><em>草稿來源：RPM 官網 + PaddleReviewHub／評測摘要（請自行編輯成站上最終文案）</em></p>',
      '<p>來源：<a href="https://rpmpb.com/products/rpm-friction-pro-16mm-elongated-v2">RPM Friction Pro V2 16mm 官網</a>、<a href="https://paddlereviewhub.com/reviews/rpm-friction-pro-elongated-v2">PRH Friction Pro Elongated V2</a>、<a href="https://www.pickleheads.com/pickleball-gear/rpm-friction-pro-v2-review">Pickleheads 評測</a></p>',
      "<h2>總評</h2>",
      "<p>RPM Friction Pro V2（站上簡稱 V2）是 Gen3 系 Friction Pro 的升級版：Axial Carbon Layup + 強化 EVA 環，旋轉與發球速度極強，甜蜜點比初代更寬。PRH 約 8.9/10，定位比 Q2 更「攻擊／elongated」；多數人若只買一支 RPM，評測站仍常推 Q2 Widebody，但要延伸距離與單打火力就選 V2。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>形狀：Elongated（約 16.5\" × 7.5\"）</li>",
      "<li>厚度：16mm（另有 14mm）</li>",
      "<li>拍面：Axial Carbon Layup + CarbonBite</li>",
      "<li>核心：Tri-Density + 強化 EVA 周邊</li>",
      "<li>重量約：7.9 oz；握柄約 5.5\"</li>",
      "<li>Swing weight 約 117；Twist weight 約 6.5</li>",
      "<li>與 James Ignatowich 共同開發；USAP PBCoR .43</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>底線 drive／發球 plow-through 明顯，旋轉約 2,200+ RPM 級；廚房與 reset 相對不是強項，拍面偏硬。V2 比初代 Friction Pro 更好容錯，仍屬力量優先。適合已經會主動進攻、能自己軟化過渡球的球員。</p>",
      "<h2>適合誰</h2>",
      "<p>攻擊型 elongated 玩家、單打或偏底線雙打、想要延伸距離與旋轉的人。</p>",
      "<h2>優點</h2>",
      "<ul><li>旋轉與發球速度頂尖</li><li>V2 甜蜜點優於初代</li><li>延伸距離適合單打／高球</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>控制／軟手分數低於 Q2 Widebody</li><li>定價偏高</li><li>純防守型可能不愛</li></ul>",
      "<h2>一句話</h2>",
      "<p>要 RPM 最兇的 elongated 火力與旋轉，選 V2；要更好上手的全面力量，先看 Q2。</p>",
    ].join(""),
  },
  {
    slug: "rpm-v2-pink",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0690/0891/6654/files/16E_Final_1.png?v=1783657671",
    highlights: ["Ella Oh 聯名", "Friction Pro V2", "粉紅配色"],
    description: [
      '<p><em>草稿來源：RPM 官網 Ella Oh Pink V2 產品頁 + Friction Pro V2 評測摘要（請自行編輯成站上最終文案）</em></p>',
      '<p>來源：<a href="https://rpmpb.com/products/ella-oh-pink-v2-elongated-16mm">Ella Oh Pink V2 16mm Elongated 官網</a>（性能同 Friction Pro V2 線；評測可參考 <a href="https://paddlereviewhub.com/reviews/rpm-friction-pro-elongated-v2">PRH V2</a>）</p>',
      "<h2>總評</h2>",
      "<p>RPM V2 Pink（Ella Oh Pink V2）是 Friction Pro V2 的聯名粉紅配色版，結構與打感對齊 V2 線：Axial Carbon、強化 EVA 環、高旋轉與攻擊向 elongated 手感。差異主要在外觀識別與聯名定位，適合想要同款性能、又想要粉紅視覺的球友。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>系列：Friction Pro V2 × Ella Oh Pink</li>",
      "<li>形狀：Elongated（另有 Widebody／14mm 選項）</li>",
      "<li>厚度：圖示代表款 16mm</li>",
      "<li>技術：CarbonBite、Axial Carbon Layup、Tri-Density + EVA 環</li>",
      "<li>性能取向：與標準 V2 同系——力量、旋轉、延伸優先</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>場上特性可比照標準 Friction Pro V2：發球與 drive 強、旋轉出色、甜蜜點優於初代 Friction Pro；軟手與被動 reset 仍需主動技術。選粉紅款多半是外觀偏好，不必期待打感與黑款有本質差異。</p>",
      "<h2>適合誰</h2>",
      "<p>喜歡聯名／粉紅外觀、打法偏攻擊 elongated、已確認 V2 手感適合自己的人。</p>",
      "<h2>優點</h2>",
      "<ul><li>辨識度高的聯名配色</li><li>承襲 V2 旋轉與火力</li><li>系列有多種形狀／厚度可選</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>與標準 V2 同價級，外觀溢價需自行衡量</li><li>同樣偏力量，非軟手向</li><li>庫存／色系依官網批次而定</li></ul>",
      "<h2>一句話</h2>",
      "<p>打感跟 V2，外觀跟 Ella Oh——要粉紅攻擊拍就選這支。</p>",
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
          ...(entry.description ? { description: entry.description } : {}),
          ...(entry.highlights ? { highlights: entry.highlights } : {}),
        },
      });
      console.log(
        `OK ${entry.slug} img≈${Math.round(imageDataUrl.length / 1024)}kb` +
          (entry.description ? ` desc=${entry.description.length}` : ""),
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
