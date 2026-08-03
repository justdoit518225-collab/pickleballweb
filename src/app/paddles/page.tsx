import type { Metadata } from "next";
import { PaddleCatalog } from "@/components/paddles/paddle-catalog";

export const metadata: Metadata = {
  title: "匹克球拍",
  description: "依品牌瀏覽匹克球拍款式與詳細介紹",
};

export default function PaddlesPage() {
  return <PaddleCatalog />;
}
