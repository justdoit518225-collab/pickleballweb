"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Heading2, ImagePlus, List, ListOrdered } from "lucide-react";
import { plainTextToHtml } from "@/lib/paddle-description";

type Props = {
  name?: string;
  initialValue?: string;
  required?: boolean;
};

const MAX_INLINE_BYTES = 450_000;

async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    throw new Error("僅支援 JPG、PNG、WebP");
  }

  const bitmap = await createImageBitmap(file);
  const maxEdge = 1000;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法處理圖片");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let quality = 0.85;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_INLINE_BYTES && quality > 0.45) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > MAX_INLINE_BYTES) {
    throw new Error("圖片壓縮後仍太大，請改用較小檔案或站內路徑（如 /paddles/xxx.jpg）");
  }
  return dataUrl;
}

function hasEditorContent(html: string, text: string) {
  if (text.trim().length > 0) return true;
  return /<img\b/i.test(html);
}

export function PaddleRichEditor({
  name = "description",
  initialValue = "",
  required = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [html, setHtml] = useState(() => plainTextToHtml(initialValue));
  const [plainOk, setPlainOk] = useState(() => {
    const h = plainTextToHtml(initialValue);
    return hasEditorContent(h, h.replace(/<[^>]+>/g, " "));
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "paddle-editor-img",
        },
      }),
    ],
    content: plainTextToHtml(initialValue),
    onUpdate: ({ editor: ed }) => {
      const next = ed.getHTML();
      setHtml(next);
      setPlainOk(hasEditorContent(next, ed.getText()));
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[220px] px-3 py-2 text-sm leading-relaxed text-slate-800 outline-none [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-bold [&_img.paddle-editor-img]:mx-auto [&_img.paddle-editor-img]:my-3 [&_img.paddle-editor-img]:block [&_img.paddle-editor-img]:h-auto [&_img.paddle-editor-img]:max-w-[min(100%,28rem)] [&_img.paddle-editor-img]:rounded-xl [&_img.paddle-editor-img]:border [&_img.paddle-editor-img]:border-slate-200",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = editor.getHTML();
    setHtml(next);
    setPlainOk(hasEditorContent(next, editor.getText()));
  }, [editor]);

  if (!editor) {
    return (
      <div className="mt-2 h-[260px] animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
    );
  }

  const btn = (active: boolean) =>
    [
      "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
      active
        ? "bg-brand-navy text-white"
        : "bg-white text-slate-700 hover:bg-slate-100",
    ].join(" ");

  async function onPickFile(file: File | undefined) {
    if (!file || !editor) return;
    setError(null);
    setBusy(true);
    try {
      const src = await fileToCompressedDataUrl(file);
      editor
        .chain()
        .focus()
        .setImage({ src, alt: file.name.replace(/\.[^.]+$/, "") })
        .run();
    } catch (e) {
      setError(e instanceof Error ? e.message : "插入圖片失敗");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function insertByUrl() {
    if (!editor) return;
    setError(null);
    const raw = window.prompt(
      "輸入圖片網址或站內路徑\n例如：/paddles/honolulu-j2cr-crystal-blue-radar.jpg",
    );
    if (!raw) return;
    const src = raw.trim();
    if (
      !src.startsWith("/") &&
      !src.startsWith("https://") &&
      !src.startsWith("http://") &&
      !src.startsWith("data:image/")
    ) {
      setError("請使用站內路徑（/…）或 http(s) 圖片網址");
      return;
    }
    editor.chain().focus().setImage({ src, alt: "" }).run();
  }

  return (
    <div className="relative mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
        <button
          type="button"
          className={btn(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
          粗體
        </button>
        <button
          type="button"
          className={btn(editor.isActive("heading", { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-3.5 w-3.5" />
          標題
        </button>
        <button
          type="button"
          className={btn(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
          項目
        </button>
        <button
          type="button"
          className={btn(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
          編號
        </button>
        <button
          type="button"
          className={btn(false)}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          title="上傳圖片插入內文"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {busy ? "處理中…" : "插入圖片"}
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={insertByUrl}
          title="用網址或 /paddles/… 路徑插入"
        >
          圖片網址
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void onPickFile(e.target.files?.[0])}
        />
      </div>

      <EditorContent editor={editor} />

      {error ? (
        <p className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : (
        <p className="border-t border-slate-100 bg-slate-50/80 px-3 py-1.5 text-[11px] text-slate-500">
          可上傳圖片，或用「圖片網址」插入站內檔（例如雷達圖
          /paddles/honolulu-j2cr-crystal-blue-radar.jpg）
        </p>
      )}

      <input type="hidden" name={name} value={html} readOnly />
      {required ? (
        <input
          required
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={plainOk ? "ok" : ""}
          onChange={() => undefined}
        />
      ) : null}
    </div>
  );
}
