import {
  plainTextToHtml,
  sanitizePaddleHtml,
} from "@/lib/paddle-description";

export function PaddleDescriptionView({ content }: { content: string }) {
  const html = sanitizePaddleHtml(plainTextToHtml(content));

  return (
    <div
      className="paddle-description text-sm leading-relaxed text-slate-600 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-900 [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-bold [&_b]:font-bold [&_img]:my-3 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
