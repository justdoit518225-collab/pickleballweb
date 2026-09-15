"use client";

import { useEffect } from "react";

/** 登入回來後捲到私人俱樂部區塊 */
export function ScrollToId({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [id]);
  return null;
}
