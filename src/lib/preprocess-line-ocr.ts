/** 瀏覽器端：強化 Line 接龍截圖對比，提升 Tesseract 辨識率 */

function dilateMask(mask: Uint8Array, width: number, height: number, radius: number) {
  const out = new Uint8Array(mask);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
            out[ny * width + nx] = 1;
          }
        }
      }
    }
  }
  return out;
}

/**
 * 放大、灰階、提高對比；若偵測到黃色對話框則裁出該區，減少背景雜訊。
 */
export async function preprocessLineScreenshot(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const targetWidth = Math.max(1600, bitmap.width * 2);
  const scale = targetWidth / bitmap.width;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;

  const warm = new Uint8Array(width * height);
  let warmCount = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const isWarm = r > 160 && g > 140 && b < 180 && (r + g) / 2 - b > 25;
    if (isWarm) {
      warm[p] = 1;
      warmCount++;
    }
  }

  const useBubbleMask = warmCount > width * height * 0.02;
  const mask = useBubbleMask
    ? dilateMask(warm, width, height, Math.max(4, Math.round(6 * scale)))
    : null;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (mask && !mask[p]) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
      continue;
    }

    let y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // 提高對比，讓黑字更清楚
    y = (y - 128) * 1.55 + 128;
    y = Math.max(0, Math.min(255, y));
    // 輕度二值化，壓掉黃底殘留
    if (y < 140) y = Math.max(0, y * 0.55);
    else y = Math.min(255, 220 + (y - 140) * 0.2);

    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
    data[i + 3] = 255;
  }

  ctx.putImageData(image, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  return blob ?? file;
}
