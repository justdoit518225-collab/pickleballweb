"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, List, ListOrdered } from "lucide-react";
import { plainTextToHtml } from "@/lib/paddle-description";

type Props = {
  name?: string;
  initialValue?: string;
  required?: boolean;
};

export function PaddleRichEditor({
  name = "description",
  initialValue = "",
  required = false,
}: Props) {
  const [html, setHtml] = useState(() => plainTextToHtml(initialValue));
  const [plainOk, setPlainOk] = useState(
    () => plainTextToHtml(initialValue).replace(/<[^>]+>/g, "").trim().length > 0,
  );

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
    ],
    content: plainTextToHtml(initialValue),
    onUpdate: ({ editor: ed }) => {
      setHtml(ed.getHTML());
      setPlainOk(ed.getText().trim().length > 0);
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[220px] px-3 py-2 text-sm leading-relaxed text-slate-800 outline-none [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-bold",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    setHtml(editor.getHTML());
    setPlainOk(editor.getText().trim().length > 0);
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

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
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
      </div>

      <EditorContent editor={editor} />

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
