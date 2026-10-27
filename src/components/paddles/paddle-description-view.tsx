import {
  plainTextToHtml,
  sanitizePaddleHtml,
} from "@/lib/paddle-description";

export function PaddleDescriptionView({ content }: { content: string }) {
  const html = sanitizePaddleHtml(plainTextToHtml(content));

  return (
    <div
      className="paddle-description max-w-[60ch] text-base leading-relaxed text-[var(--muted)] [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-brand-navy [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-brand-navy [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-bold [&_strong]:text-brand-navy [&_b]:font-bold [&_b]:text-brand-navy [&_img]:my-4 [&_img]:block [&_img]:h-auto [&_img]:w-full [&_img]:max-w-[min(100%,42rem)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
