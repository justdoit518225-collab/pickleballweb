const MAX_BYTES = 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function readPaddleImageDataUrl(file: File): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("僅支援 JPG、PNG、WebP 圖片");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("圖片請小於 1 MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}
