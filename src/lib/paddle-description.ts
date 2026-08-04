const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "img",
]);

/** 舊純文字轉成簡易 HTML，保留換行 */
export function plainTextToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "<p></p>";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;

  return trimmed
    .split(/\n{2,}/)
    .map((block) => {
      const withBreaks = block
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br>");
      return `<p>${withBreaks}</p>`;
    })
    .join("");
}

/**
 * 輕量 HTML 消毒（不依賴 jsdom／isomorphic-dompurify，避免 Vercel serverless 崩潰）
 */
export function sanitizePaddleHtml(html: string): string {
  // 拿掉 script／style／事件處理
  let out = html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  out = out.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full, rawTag: string, rawAttrs = "") => {
    const tag = rawTag.toLowerCase();
    const closing = full.startsWith("</");
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (closing) return `</${tag}>`;
    if (tag === "br") return "<br>";

    if (tag === "a") {
      const href = pickAttr(rawAttrs, "href");
      if (!href || !isSafeHref(href)) return "";
      const safeHref = escapeAttr(href);
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">`;
    }

    if (tag === "img") {
      const src = pickAttr(rawAttrs, "src");
      if (!src || !isSafeImgSrc(src)) return "";
      const alt = pickAttr(rawAttrs, "alt") ?? "";
      return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />`;
    }

    // 其他允許標籤：不帶屬性
    return `<${tag}>`;
  });

  return out;
}

export function paddleDescriptionPlainLength(htmlOrText: string): number {
  return htmlOrText
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

/** 有文字或有圖片都算有內容 */
export function paddleDescriptionHasContent(htmlOrText: string): boolean {
  if (paddleDescriptionPlainLength(htmlOrText) >= 1) return true;
  return /<img\b/i.test(htmlOrText);
}

function pickAttr(attrs: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = attrs.match(re);
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? null;
}

function isSafeHref(href: string) {
  const v = href.trim().toLowerCase();
  return (
    v.startsWith("https://") ||
    v.startsWith("http://") ||
    v.startsWith("/") ||
    v.startsWith("#")
  );
}

function isSafeImgSrc(src: string) {
  const v = src.trim().toLowerCase();
  return (
    v.startsWith("/") ||
    v.startsWith("https://") ||
    v.startsWith("http://") ||
    v.startsWith("data:image/")
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
