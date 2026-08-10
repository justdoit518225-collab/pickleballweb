import { prisma } from "@/lib/prisma";

export type PaddleListItem = {
  id: string;
  slug: string;
  brand: string;
  brandId: string;
  series: string;
  variant: string;
  nameZh: string;
  nameEn: string;
  description: string;
  highlights: string[];
  imageDataUrl: string | null;
  listPriceUsd: number | null;
  priceSourceUrl: string | null;
  priceNote: string | null;
};

export type PaddleBrandItem = {
  id: string;
  name: string;
  paddleCount: number;
};

function mapPaddle(row: {
  id: string;
  slug: string;
  series: string;
  variant: string;
  nameZh: string;
  nameEn: string;
  description: string;
  highlights: string[];
  imageDataUrl: string | null;
  listPriceUsd: { toNumber(): number } | number | null;
  priceSourceUrl: string | null;
  priceNote: string | null;
  brand: { id: string; name: string };
}): PaddleListItem {
  const listPriceUsd =
    row.listPriceUsd == null
      ? null
      : typeof row.listPriceUsd === "number"
        ? row.listPriceUsd
        : row.listPriceUsd.toNumber();
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand.name,
    brandId: row.brand.id,
    series: row.series,
    variant: row.variant,
    nameZh: row.nameZh,
    nameEn: row.nameEn,
    description: row.description,
    highlights: row.highlights,
    imageDataUrl: row.imageDataUrl,
    listPriceUsd,
    priceSourceUrl: row.priceSourceUrl,
    priceNote: row.priceNote,
  };
}

export async function listPaddleBrands(): Promise<PaddleBrandItem[]> {
  const brands = await prisma.paddleBrand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { paddles: true } } },
  });
  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    paddleCount: b._count.paddles,
  }));
}

export async function getPaddleBrandNames(): Promise<string[]> {
  const brands = await prisma.paddleBrand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { name: true },
  });
  return brands.map((b) => b.name);
}

export async function getPaddlesByBrandName(brandName: string): Promise<PaddleListItem[]> {
  const rows = await prisma.paddle.findMany({
    where: { brand: { name: brandName } },
    orderBy: [{ sortOrder: "asc" }, { nameZh: "asc" }],
    include: { brand: { select: { id: true, name: true } } },
  });
  return rows.map(mapPaddle);
}

export async function getPaddleBySlug(slug: string): Promise<PaddleListItem | null> {
  const row = await prisma.paddle.findUnique({
    where: { slug },
    include: { brand: { select: { id: true, name: true } } },
  });
  return row ? mapPaddle(row) : null;
}

export async function getAllPaddleSlugs(): Promise<string[]> {
  const rows = await prisma.paddle.findMany({ select: { slug: true } });
  return rows.map((r) => r.slug);
}

export function slugifyPaddle(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/[\u4e00-\u9fff]/g, (ch) => `u${ch.codePointAt(0)!.toString(16)}`)
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
