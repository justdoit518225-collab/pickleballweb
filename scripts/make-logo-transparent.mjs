import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const input = path.join(root, "public", "logo-icon.png");
const output = input;

/** 將接近白色的像素改為透明（保留球拍深藍與細節） */
function isBackground(r, g, b, a) {
  if (a < 10) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  // 高亮度、低彩度 → 視為底色
  if (max >= 235 && saturation < 0.12) return true;
  // 系統灰底 #f8fafc 附近
  if (r >= 248 && g >= 250 && b >= 252) return true;
  return false;
}

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  if (isBackground(r, g, b, a)) {
    data[i + 3] = 0;
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png({ compressionLevel: 9 })
  .toFile(output + ".tmp");

fs.renameSync(output + ".tmp", output);

const meta = await sharp(output).metadata();
console.log("Wrote transparent PNG:", output, `${meta.width}x${meta.height}`, "alpha:", meta.hasAlpha);
