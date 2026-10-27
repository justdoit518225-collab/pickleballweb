/**
 * 為 2026-08 新增球拍補產品圖 + 中文評測草稿
 * 用法：npx tsx scripts/import-new-paddles-2026-08.ts
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
  highlights: string[];
};

const ENTRIES: Entry[] = [
  {
    slug: "joola-pro-v-perseus",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0685/6943/2278/files/p-bhIbyC-JOOLA-Perseus-Pro-V-16mm-Piackleball-Paddle-Red-2.jpg?v=1777383690",
    highlights: ["Pro V", "Elongated", "KineticFrame"],
    description: [
      '<p><em>草稿來源：JOOLA 官網 + PaddleReviewHub（請自行編輯成站上最終文案）</em></p>',
      '<p>來源：<a href="https://joola.com/products/joola-perseus-pro-v-pickleball-paddle-1">JOOLA Perseus Pro V 官網</a>、<a href="https://paddlereviewhub.com/reviews/joola-perseus-pro-v">PRH Perseus Pro V</a></p>',
      "<h2>總評</h2>",
      "<p>Pro V 系列的長版旗艦（Ben Johns 簽名款常見）。KineticFrame 讓擊球比 Pro IV 更「踩得住」、更可預期；力量仍強，但瞬間 pop 略收。PRH 綜合約 8.7/10，適合已愛 Perseus 形狀、想要更穩控制版的人。若預算敏感，評測站常提醒 Pro IV 性價比更高。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>形狀：Elongated（約 16.5\" × 7.5\"）</li>",
      "<li>厚度：14mm／16mm</li>",
      "<li>核心：Propulsion Core + KineticFrame</li>",
      "<li>拍面：Carbon Friction Surface</li>",
      "<li>重量約：8.1 oz（16mm）；握柄約 5.5\"</li>",
      "<li>認證：USAP + UPA-A</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>底線 drive 有權威感，回饋比 Pro IV 更平滑；軟手與過渡比上一代可預期。延伸距離是長版優勢，容錯不如寬版 Scorpeus。</p>",
      "<h2>適合誰</h2>",
      "<p>攻擊／全面型長版玩家、想要 Pro 平台可預期手感、預算允許旗艦定價者。</p>",
      "<h2>優點</h2>",
      "<ul><li>比 Pro IV 更可預期</li><li>軟手與控制改善</li><li>雙認證＋較長保固政策</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>定價高，升級幅度相對有限</li><li>瞬間 pop 不如 Pro IV 兇</li><li>耐久史仍須關注</li></ul>",
      "<h2>一句話</h2>",
      "<p>要更穩的 Perseus，選 Pro V；要划算的同形狀火力，先比 Pro IV。</p>",
    ].join(""),
  },
  {
    slug: "joola-pro-v-kosmos",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0685/6943/2278/files/p-ed3X93-JOOLA-Komos-Pro-V-16mm-Pickleball-Paddle-1.jpg?v=1777383594",
    highlights: ["Pro V", "Hybrid", "全面型"],
    description: [
      '<p><em>草稿來源：JOOLA 官網 + Pro V 系列評測／選拍指南（PRH 尚無獨立 Kosmos 頁；請自行編輯）</em></p>',
      '<p>來源：<a href="https://joola.com/products/kosmos-pro-v-pickleball-paddle">JOOLA Kosmos Pro V 官網</a>、<a href="https://joola.com/pages/prov">Pro V 技術頁</a>、<a href="https://pickleballcentral.com/blog/expert-review-joola-pro-v-paddle-series/">Pickleball Central Pro V 系列評測</a></p>',
      "<h2>總評</h2>",
      "<p>Kosmos 是 JOOLA 第一支 hybrid 形狀：介於 Perseus 長版延伸與 Scorpeus 寬版容錯之間，Pro V 平台（KineticFrame）強調可預期回饋。Federico Staksrud／Tyson McGuffin 等簽名款常見，定位「什麼都能打」的全面中間選項。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>形狀：Hybrid（約 16.3\" × 7.7\"）</li>",
      "<li>厚度：14mm／16mm（站上列 16mm 取向）</li>",
      "<li>平台：Pro V KineticFrame + Carbon Friction</li>",
      "<li>認證：USAP + UPA-A</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>底線有一定延伸，廚房比純長版更好轉身與穩定；力量／控制落在 Perseus 與 Scorpeus 中間。適合不想極端選邊的雙打全面手。</p>",
      "<h2>適合誰</h2>",
      "<p>想要一拍打遍攻守、hybrid 形狀偏好、Pro V 手感取向的球員。</p>",
      "<h2>優點</h2>",
      "<ul><li>形狀平衡，上手廣</li><li>承襲 Pro V 可預期回饋</li><li>職業簽名款選擇多</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>定價旗艦級</li><li>極致延伸／極致容錯都不如專精形狀</li><li>獨立長評測資料少於 Perseus</li></ul>",
      "<h2>一句話</h2>",
      "<p>Pro V 裡最「中庸全面」的一支——延伸與容錯都要一點就選 Kosmos。</p>",
    ].join(""),
  },
  {
    slug: "joola-pro-v-scorpeus",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0685/6943/2278/files/p-37FcGf-JOOLA-Scorpeus-Pro-V-14mm-Pickleball-Paddle-Yellow-1.jpg?v=1777383806",
    highlights: ["Pro V", "Widebody", "容錯"],
    description: [
      '<p><em>草稿來源：JOOLA 官網 + Pro V 系列評測／選拍指南（PRH 尚無獨立 Scorpeus Pro V 頁；請自行編輯）</em></p>',
      '<p>來源：<a href="https://joola.com/products/scorpeus-pro-v-pickleball-paddle">JOOLA Scorpeus Pro V 官網</a>、<a href="https://pickleballcentral.com/blog/expert-review-joola-pro-v-paddle-series/">Pickleball Central Pro V 系列評測</a></p>',
      "<h2>總評</h2>",
      "<p>Scorpeus 是 Pro V 裡最寬、最容錯的形狀（Anna Bright／Collin Johns 簽名款常見）。強調廚房 block、reset、雙手戰穩定；犧牲部分延伸換甜蜜點與抗扭。適合雙打防守／過渡優先的球員。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>形狀：Standard／Widebody（系列最短最寬）</li>",
      "<li>厚度：14mm／16mm</li>",
      "<li>平台：Pro V KineticFrame + Carbon Friction</li>",
      "<li>認證：USAP + UPA-A</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>網前穩定、偏心容錯高；底線火力與延伸不如 Perseus。Pro V 的可預期感讓軟手比「純兇力量拍」好掌握。</p>",
      "<h2>適合誰</h2>",
      "<p>雙打廚房戰、重視穩定與容錯、不需要極致長版延伸的球員。</p>",
      "<h2>優點</h2>",
      "<ul><li>系列最大甜蜜點取向</li><li>block／reset 穩定</li><li>揮速相對友善</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>延伸與單打覆蓋較弱</li><li>旗艦定價</li><li>要極致 plow-through 可能更愛長版</li></ul>",
      "<h2>一句話</h2>",
      "<p>Pro V 裡最「好守、好擋」的寬版——雙打廚房優先就看 Scorpeus。</p>",
    ].join(""),
  },
  {
    slug: "luzz-cannon-g1-jurassic",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0659/0772/0365/files/1_eb001bf1-3cb6-426a-a202-dfa200de467a.jpg?v=1760594510",
    highlights: ["一代加農砲", "侏羅紀聯名", "力量"],
    description: [
      '<p><em>草稿來源：Luzz 官網產品頁 + Cannon 同平台評測摘要（請自行編輯成站上最終文案）</em></p>',
      '<p>來源：<a href="https://luzzpickleball.com/products/luzzpickleball-jurassic-cannon-paddle-t700-carbon-friction-surface-thermoformed">Luzz Jurassic Cannon 官網</a>（性能對齊一代 Cannon；可參考 <a href="https://paddlereviewhub.com/reviews/luzz-cannon">PRH Cannon</a>）</p>',
      "<h2>總評</h2>",
      "<p>侏羅紀公園聯名外觀的一代加農砲：T700 摩擦拍面、熱壓 Gen3+ 構造，定位高性價比力量拍。打感與標準／其他聯名 Cannon 同平台，差異主要在外觀與收藏識別。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>系列：Cannon Gen 1 · Jurassic Edition</li>",
      "<li>厚度：16mm</li>",
      "<li>拍面：T700 raw carbon friction</li>",
      "<li>重量約：7.9 oz；長度約 16.5\"</li>",
      "<li>認證：UPA-A + USAP</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>Drive 與揮重感偏攻擊；甜蜜點相對緊、偏心要準。適合主動進攻、能自己處理軟手的人。</p>",
      "<h2>適合誰</h2>",
      "<p>想要 Cannon 火力又愛侏羅紀外觀的攻擊型球友。</p>",
      "<h2>優點</h2>",
      "<ul><li>聯名外觀辨識度高</li><li>同平台高性價比力量</li><li>雙認證</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>容錯與軟手非強項</li><li>打感與標準 Cannon 本質相同</li></ul>",
      "<h2>一句話</h2>",
      "<p>打感是加農砲，外觀是恐龍——要聯名火力就選這支。</p>",
    ].join(""),
  },
  {
    slug: "luzz-cannon-g1-minions",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0659/0772/0365/files/1_4c6aebf6-7ec0-45e1-80b5-512cea9edfab.jpg?v=1760579032",
    highlights: ["一代加農砲", "小小兵聯名", "力量"],
    description: [
      '<p><em>草稿來源：Luzz 官網產品頁 + Cannon 同平台評測摘要（請自行編輯成站上最終文案）</em></p>',
      '<p>來源：<a href="https://luzzpickleball.com/products/luzzpickleball-minions-cannon-paddle-t700-carbon-friction-surface-thermoformed">Luzz Minions Cannon 官網</a>（一代小小兵聯名；二代請看站上「二代小小兵聯名」。評測可參考 <a href="https://paddlereviewhub.com/reviews/luzz-cannon">PRH Cannon</a>）</p>',
      "<h2>總評</h2>",
      "<p>Universal 小小兵聯名的一代加農砲，結構與標準 Cannon 同平台：力量優先、熱壓碳面。與「二代小小兵聯名加農砲」是不同世代 SKU，選購時請認清 Gen 1／Gen 2。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>系列：Cannon Gen 1 · Minions</li>",
      "<li>厚度：16mm</li>",
      "<li>拍面：T700 raw carbon friction</li>",
      "<li>認證：UPA-A + USAP</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>攻擊推進明顯，廚房軟手需主動技術；外觀趣味性高，打感仍是典型 Cannon。</p>",
      "<h2>適合誰</h2>",
      "<p>喜歡小小兵外觀、打法偏力量的一代 Cannon 買家。</p>",
      "<h2>優點</h2>",
      "<ul><li>聯名辨識度極高</li><li>同平台攻擊手感</li><li>雙認證</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>勿與二代小小兵混淆</li><li>容錯非強項</li></ul>",
      "<h2>一句話</h2>",
      "<p>一代加農砲的打感，小小兵的臉——認準 Gen 1 再下單。</p>",
    ].join(""),
  },
  {
    slug: "enhance-epp-widebody",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0617/4123/6383/files/EPP_Turbo_Widebody_main_product_image.png?v=1778878879",
    highlights: ["EPP Turbo", "Widebody", "容錯"],
    description: [
      '<p><em>草稿來源：Enhance 官網 + PaddleReviewHub（請自行編輯成站上最終文案）</em></p>',
      '<p>來源：<a href="https://enhancepickleball.com/products/epp-turbo">Enhance EPP Turbo 官網</a>、<a href="https://paddlereviewhub.com/reviews/enhance-epp-turbo-widebody">PRH EPP Turbo Widebody</a></p>',
      "<h2>總評</h2>",
      "<p>EPP Turbo 寬版是系列裡最容錯、最穩的形狀：大拍面、高 twist weight、揮速快，適合雙打網前。全浮動 EPP 泡沫＋EVA 環，價位親民卻有現代泡沫力量。PRH 綜合約 9.1/10，常被當成「預算泡沫拍最安全推薦」之一。有別於站上 MPP Turbo 系列。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>形狀：Widebody（約 16\" × 8\"）</li>",
      "<li>厚度：16mm</li>",
      "<li>核心：Full Floating EPP Foam + EVA Perimeter Ring</li>",
      "<li>拍面：CFC Layup + Raw T700 grit</li>",
      "<li>重量約：7.8–8.0 oz；握柄約 5.3\"</li>",
      "<li>Swing weight 約 108–112；Twist weight 7.0+</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>Block／reset 穩定，偏心容錯高，手速友善；延伸與極致 leverage 不如長版。Spin／pop 對價格帶很有競爭力。</p>",
      "<h2>適合誰</h2>",
      "<p>雙打為主、想從蜂巢升級泡沫、重視甜蜜點與穩定的球友。</p>",
      "<h2>優點</h2>",
      "<ul><li>系列最大甜蜜點</li><li>性價比極高</li><li>網前快、穩</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>延伸不如 elongated</li><li>極致單打火力非定位</li></ul>",
      "<h2>一句話</h2>",
      "<p>要平價泡沫又好打的寬版，EPP Turbo Widebody 幾乎是預設答案。</p>",
    ].join(""),
  },
  {
    slug: "leopard-wave-x",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0713/7493/0214/files/product_m_u2_1d86b64c-e1d3-40fb-be31-33012961611c.png?v=1772901298",
    highlights: ["Wave X", "T700", "均衡"],
    description: [
      '<p><em>草稿來源：通路產品頁規格摘要（PRH 無對應頁；請自行編輯成站上最終文案）</em></p>',
      '<p>來源：<a href="https://pickleplay.vn/en/products/vot-pickleball-leopard-wave-x-pro-2026">PicklePlay — LEOPARD Wave X Pro 2026</a></p>',
      "<h2>總評</h2>",
      "<p>LEOPARD Wave X（Pro 2026）定位攻守均衡的碳纖拍：日系 T700 拍面、PP 蜂巢芯、強調推進輔助與較大甜蜜點，外觀漸層邊框辨識度高。獨立實驗室長評測較少，建議以實打為準。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>拍面：Japanese T700 Carbon</li>",
      "<li>核心：Polypropylene Honeycomb</li>",
      "<li>厚度：16mm</li>",
      "<li>重量約：8.1 oz</li>",
      "<li>尺寸約：16.5\" × 7.4\"</li>",
      "<li>特色：握柄 NFC 防偽（依批次）</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>通路描述偏「好打、有推進、震動抑制」；適合想要外觀個性又要均衡手感的中高階球友。細部旋轉／力量天花板待更多場測驗證。</p>",
      "<h2>適合誰</h2>",
      "<p>喜歡 Wave X 外型、想要均衡碳纖拍作為主力或第二拍的人。</p>",
      "<h2>優點</h2>",
      "<ul><li>外觀辨識度高</li><li>規格完整、有防偽設計</li><li>均衡取向易上手</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>國際長評測資料少</li><li>通路價格／保固依地區而異</li></ul>",
      "<h2>一句話</h2>",
      "<p>外型搶眼的均衡碳纖拍——先確認手感與通路保固再入手。</p>",
    ].join(""),
  },
  {
    slug: "facolos-elite-x",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0749/2088/6412/files/0008_FACOLOS_0164a.webp?v=1771616372",
    highlights: ["ELITE-X", "Elongated", "T700"],
    description: [
      '<p><em>草稿來源：Facolos 官網／通路規格（PRH 無對應頁；請自行編輯成站上最終文案）</em></p>',
      '<p>來源：<a href="https://shopfacolos.com/products/facolos-elite-x">Facolos Elite X 官網</a></p>',
      "<h2>總評</h2>",
      "<p>Facolos Elite X（Elongated）走競技向長版：多向 T700 raw carbon、ElasticPP 蜂巢芯、雙熱壓與 EVA 邊框系統，強調延伸、旋轉與可控力量。Gabriel Tardio 等選手合作曝光較多；厚度常見 14／16mm。</p>",
      "<h2>規格摘要</h2>",
      "<ul>",
      "<li>形狀：Elongated</li>",
      "<li>厚度：14mm／16mm</li>",
      "<li>拍面：Multidirectional T700 Raw Carbon</li>",
      "<li>核心：ElasticPP Honeycomb（＋EVA／中空碳管邊系，依文案）</li>",
      "<li>重量約：7.9–8.3 oz；長度約 16.5\"</li>",
      "</ul>",
      "<h2>場上感受</h2>",
      "<p>長版延伸適合底線與高球；旋轉與 pop 是賣點，reset／軟手需依厚度與個人技術調整。色系選擇多（藍／綠／橘／粉等）。</p>",
      "<h2>適合誰</h2>",
      "<p>想要競技長版、重視旋轉與延伸、可接受新興品牌生態的球員。</p>",
      "<h2>優點</h2>",
      "<ul><li>長版覆蓋與旋轉取向</li><li>厚度／配色選擇多</li><li>職業曝光增加可信度</li></ul>",
      "<h2>缺點</h2>",
      "<ul><li>PRH 等主流長測較少</li><li>通路與保固需自行確認</li></ul>",
      "<h2>一句話</h2>",
      "<p>要長版競技臉又有色系可挑，Elite X 值得列入試打名單。</p>",
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
          highlights: entry.highlights,
        },
      });
      console.log(
        `OK ${entry.slug} img≈${Math.round(imageDataUrl.length / 1024)}kb desc=${entry.description.length}`,
      );
    } catch (e) {
      console.error(`失敗 ${entry.slug}:`, e);
    }
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
