/**
 * 將 PaddleReviewHub 對應球拍評論草稿寫入 DB（供後台再編輯）
 * 來源：https://paddlereviewhub.com/reviews
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const SOURCE_NOTE =
  '<p><em>草稿來源：PaddleReviewHub（英文評論摘要／改寫，請自行編輯成站上最終文案）</em></p>';

/** @type {Record<string, string>} */
const UPDATES = {
  "honolulu-j2cr": [
    SOURCE_NOTE,
    '<p>來源：<a href="https://paddlereviewhub.com/reviews/honolulu-j2cr">Honolulu J2CR Review</a></p>',
    "<h2>總評</h2>",
    "<p>2026 年他們測過最全面的 all-around 球拍之一。力量與手感兼具：用力揮有推進力，輕觸又夠細膩。適合想要 hybrid 形狀、又不要犧牲手速的全面型球員。</p>",
    "<h2>規格摘要</h2>",
    "<ul><li>形狀：Aero Hybrid Plus</li><li>厚度：16mm</li><li>核心：Gen 4.5 multi-density EPP foam + Core Reactor</li><li>重量約：8.0–8.3 oz</li><li>握柄：5.5\" / 6\"</li><li>總分：約 9.2/10</li></ul>",
    "<h2>場上感受</h2>",
    "<p>Core Reactor 帶來「吃球、貼拍」的感覺，進攻好控制，過渡球也準；twist weight 約 7.0，甜蜜點外的容錯不錯。壓縮揮拍很快就能上手。</p>",
    "<h2>適合誰</h2>",
    "<p>想要一支全能拍的全面型球友、雙打賽事球員、從入門拍升級的人。</p>",
    "<h2>優點</h2>",
    "<ul><li>力量與容錯兼具</li><li>甜蜜點大、穩定性高</li><li>相對同級高端拍 CP 值突出</li></ul>",
    "<h2>缺點</h2>",
    "<ul><li>比 J2NF 更「彈」、更有反應</li><li>Hybrid 延伸距離不如 J6CR</li><li>定價不算便宜</li></ul>",
    "<h2>一句話</h2>",
    "<p>不是革命性設計，但是 2026 測過最完整、最常想繼續拿來打的拍之一。</p>",
  ].join(""),

  "honolulu-j6cr": [
    SOURCE_NOTE,
    '<p>來源：<a href="https://paddlereviewhub.com/reviews/honolulu-j6cr">Honolulu J6CR Review</a></p>',
    "<h2>總評</h2>",
    "<p>Honolulu 的 elongated 攻擊版：要延伸距離與 decisively put-away，但揮速比多數 elongated 更輕快，不會像「平底鍋」那麼笨重。</p>",
    "<h2>規格摘要</h2>",
    "<ul><li>形狀：Elongated（約 16.48\" × 7.52\"）</li><li>厚度：16mm</li><li>核心：Gen 4.5 multi-density EPP foam + Core Reactor</li><li>重量約：8.0–8.2 oz</li><li>握柄：6\"</li><li>總分：約 8.8/10</li></ul>",
    "<h2>場上感受</h2>",
    "<p>一般 elongated 常是「有延伸就犧牲手速」；J6CR 的 swing weight 相對好帶，回位更快，Core Reactor 接觸感也比很多力量拍更連貫。建議打兩場再下定論。</p>",
    "<h2>適合誰</h2>",
    "<p>偏進攻、想要 elongated 力量與延伸，又不想揮起來太慢的球員。</p>",
    "<h2>優點</h2>",
    "<ul><li>對 elongated 來說揮速意外地快</li><li>力量與旋轉出色</li><li>此形狀下甜蜜點相對大</li></ul>",
    "<h2>缺點</h2>",
    "<ul><li>twist weight 不如 J2CR</li><li>不適合純廚房軟手打法</li><li>容錯不如 hybrid</li></ul>",
    "<h2>一句話</h2>",
    "<p>J2CR 是全能；J6CR 是想結束這球時的攻擊選擇。</p>",
  ].join(""),

  "enhance-mpp": [
    SOURCE_NOTE,
    '<p>來源（最接近的款）：<a href="https://paddlereviewhub.com/reviews/enhance-mpp-turbo-widebody">Enhance MPP Turbo Widebody</a>（站上為 ENHANCE MPP，請依實際子款再改）</p>',
    "<h2>總評</h2>",
    "<p>MPP Turbo 系列中最「好上手／容錯」的方向之一：廚房防守快、對打反擊快，加速時仍有明顯 pop。</p>",
    "<h2>規格摘要</h2>",
    "<ul><li>形狀：Widebody（參考評測款）</li><li>厚度：16mm</li><li>核心：Full Floating MPP Foam + EVA Perimeter</li><li>重量約：7.8–8.1 oz</li><li>握柄約：5.3\"</li><li>總分：約 9.2/10</li></ul>",
    "<h2>場上感受</h2>",
    "<p>保留 MPP「球會跳」的個性，但更寬的拍面讓擋球、反擊比較不緊張；手速與甜蜜點在雙手戰特別有感。犧牲一點 elongated 的延伸與 leverage，但一般雙打點數很順手。</p>",
    "<h2>適合誰</h2>",
    "<p>雙打、喜歡反擊節奏、想要 MPP pop 又不想 elongated 那麼沉的球友。</p>",
    "<h2>優點</h2>",
    "<ul><li>系列中容錯最好的方向之一</li><li>手速快、仍有 pop／旋轉</li><li>價位親民（評測站常見折扣後約百元美元級）</li></ul>",
    "<h2>缺點</h2>",
    "<ul><li>短握柄對雙手反拍較緊</li><li>延伸距離不如 elongated</li><li>MPP 空心聲響兩極</li></ul>",
    "<h2>一句話</h2>",
    "<p>若只買一支 MPP Turbo 打雙打，評測站會先推這類「有 pop 又好容錯」的形狀。</p>",
  ].join(""),

  "rpm-q2": [
    SOURCE_NOTE,
    '<p>來源：<a href="https://paddlereviewhub.com/reviews/rpm-q2-widebody-16mm">RPM Q2 Widebody 16mm</a></p>',
    "<h2>總評</h2>",
    "<p>多數人最適合的 RPM Q2 起點：大力量、高旋轉（約 2,310 RPM）、揮速快（swing weight 約 107），又有不錯 twist weight，比很多純力量拍更好打。</p>",
    "<h2>規格摘要</h2>",
    "<ul><li>形狀：Widebody / Standard</li><li>厚度：16mm</li><li>核心：Full-foam performance</li><li>重量約：7.8 oz</li><li>握柄：5.5\"</li><li>總分：約 9.2/10</li></ul>",
    "<h2>場上感受</h2>",
    "<p>實際打起來比 107 swing weight「更有份量」：drive 有 plow-through，碳板吃上旋好；相對 elongated Q2，犧牲延伸換穩定與容錯，多數雙打玩家會覺得划算。拍面偏硬、連貫而非柔軟，reset 要乾淨，但偏心仍較能守住。</p>",
    "<h2>適合誰</h2>",
    "<p>想要 RPM 招牌力量＋旋轉、又不要太犧牲穩定的攻擊型雙打；或從力量 elongated 想改好打雙手戰的人。</p>",
    "<h2>優點</h2>",
    "<ul><li>Widebody 仍有很強力量</li><li>旋轉頂尖</li><li>揮速快、穩定度不錯</li><li>比 elongated Q2 更好容錯</li></ul>",
    "<h2>缺點</h2>",
    "<ul><li>定價偏高</li><li>延伸不如 elongated</li><li>偏力量拍，軟手需要乾淨技術</li></ul>",
    "<h2>一句話</h2>",
    "<p>不知道 Q2 選哪支，先從 Widebody 開始最穩。</p>",
  ].join(""),

  "luzz-inferno-blue-flame": [
    SOURCE_NOTE,
    '<p>來源（最接近的款）：<a href="https://paddlereviewhub.com/reviews/luzz-pro-4-blue-blaze-inferno">Luzz Pro 4 Blue Blaze Inferno</a>（對應站上「藍焰／Inferno」系，請再核對實際子款）</p>',
    "<h2>總評</h2>",
    "<p>Luzz 高端 MPP foam 力量拍的亮眼塗裝版：發球速度與火力很強，吃球 dwell 明顯，但要求乾淨擊球點。</p>",
    "<h2>規格摘要</h2>",
    "<ul><li>形狀：Elongated</li><li>厚度：16mm</li><li>核心：MPP 100% foam</li><li>重量約：7.94 oz</li><li>握柄約：5.52\"</li><li>Swing weight 約：119</li><li>總分：約 8.9/10</li></ul>",
    "<h2>場上感受</h2>",
    "<p>比多數 foam 拍更「活」、回饋更接近 Gen-3；球在拍面停留夠久好塑形。MPP 吸收大量衝擊、drive／反擊穩。代價是頭重與較高 swing weight，reset、快速雙手交換較吃力——適合主動揮穿球的人，不適合只靠反應與軟手的人。</p>",
    "<h2>適合誰</h2>",
    "<p>攻擊型、底線力量、想要頂級發球速度與 foam dwell 的球員。</p>",
    "<h2>優點</h2>",
    "<ul><li>發球速度與火力頂尖</li><li>MPP dwell＋回饋並存</li><li>電鍍邊框加強耐用</li><li>外觀辨識度高</li></ul>",
    "<h2>缺點</h2>",
    "<ul><li>控制／軟手分數偏低</li><li>手速不是強項</li><li>標準碳纖 grit，非長效 grit 技術</li></ul>",
    "<h2>一句話</h2>",
    "<p>要力量與回饋可以；要軟手廚房為主，建議另選。</p>",
  ].join(""),
};

async function main() {
  let updated = 0;
  for (const [slug, html] of Object.entries(UPDATES)) {
    const row = await prisma.paddle.findUnique({ where: { slug } });
    if (!row) {
      console.log(`略過（找不到）：${slug}`);
      continue;
    }
    await prisma.paddle.update({
      where: { slug },
      data: { description: html },
    });
    updated += 1;
    console.log(`已更新：${slug}`);
  }
  console.log(`完成，共更新 ${updated} 支`);
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
