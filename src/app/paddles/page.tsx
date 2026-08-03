import type { Metadata } from "next";
import { PaddleCatalog } from "@/components/paddles/paddle-catalog";
import { getPaddleBrandNames, getPaddlesByBrandName } from "@/lib/paddles";

export const metadata: Metadata = {
  title: "匹克球拍",
  description: "依品牌瀏覽匹克球拍款式與詳細介紹",
};

export default async function PaddlesPage() {
  const brands = await getPaddleBrandNames();
  const paddlesByBrand: Record<string, Awaited<ReturnType<typeof getPaddlesByBrandName>>> =
    {};
  await Promise.all(
    brands.map(async (brand) => {
      paddlesByBrand[brand] = await getPaddlesByBrandName(brand);
    }),
  );

  return <PaddleCatalog brands={brands} paddlesByBrand={paddlesByBrand} />;
}
