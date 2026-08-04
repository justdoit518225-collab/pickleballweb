"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { ROUTES } from "@/lib/constants";
import { readPaddleImageDataUrl } from "@/lib/paddle-image-upload";
import { paddleDescriptionHasContent, sanitizePaddleHtml } from "@/lib/paddle-description";
import { slugifyPaddle } from "@/lib/paddles";
import { prisma } from "@/lib/prisma";

async function requirePlatformAdmin() {
  const session = await auth();
  if (session?.user?.platformRole !== "SUPER_ADMIN") {
    redirect("/");
  }
  return session;
}

function parseHighlights(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

const brandSchema = z.object({
  name: z.string().trim().min(1, "請輸入品牌名稱").max(80),
});

export async function createPaddleBrand(formData: FormData) {
  await requirePlatformAdmin();
  const parsed = brandSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    redirect(
      `${ROUTES.platformPaddles}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "驗證失敗")}`,
    );
  }

  const exists = await prisma.paddleBrand.findUnique({
    where: { name: parsed.data.name },
  });
  if (exists) {
    redirect(`${ROUTES.platformPaddles}?error=${encodeURIComponent("品牌已存在")}`);
  }

  const maxSort = await prisma.paddleBrand.aggregate({ _max: { sortOrder: true } });
  await prisma.paddleBrand.create({
    data: {
      name: parsed.data.name,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath(ROUTES.platformPaddles);
  revalidatePath(ROUTES.paddles);
  redirect(`${ROUTES.platformPaddles}?saved=1`);
}

export async function deletePaddleBrand(brandId: string) {
  await requirePlatformAdmin();
  await prisma.paddleBrand.delete({ where: { id: brandId } });
  revalidatePath(ROUTES.platformPaddles);
  revalidatePath(ROUTES.paddles);
  redirect(`${ROUTES.platformPaddles}?saved=1`);
}

const paddleSchema = z.object({
  series: z.string().trim().min(1).max(120),
  variant: z.string().trim().max(120).optional(),
  nameZh: z.string().trim().min(1).max(160),
  nameEn: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(800_000),
  slug: z.string().trim().max(80).optional(),
});

function normalizeDescription(raw: string, errorRedirect: string): string {
  if (!paddleDescriptionHasContent(raw)) {
    redirect(`${errorRedirect}?error=${encodeURIComponent("請填寫詳細介紹")}`);
  }
  return sanitizePaddleHtml(raw);
}

export async function createPaddle(brandId: string, formData: FormData) {
  await requirePlatformAdmin();

  const parsed = paddleSchema.safeParse({
    series: formData.get("series"),
    variant: formData.get("variant") || "-",
    nameZh: formData.get("nameZh"),
    nameEn: formData.get("nameEn"),
    description: formData.get("description"),
    slug: formData.get("slug") || undefined,
  });

  if (!parsed.success) {
    redirect(
      `${ROUTES.platformPaddleBrand(brandId)}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "驗證失敗")}`,
    );
  }

  const description = normalizeDescription(
    parsed.data.description,
    ROUTES.platformPaddleBrand(brandId),
  );

  const brand = await prisma.paddleBrand.findUnique({ where: { id: brandId } });
  if (!brand) {
    redirect(`${ROUTES.platformPaddles}?error=${encodeURIComponent("品牌不存在")}`);
  }

  let slug =
    parsed.data.slug?.trim() ||
    slugifyPaddle(parsed.data.nameEn || parsed.data.nameZh);
  if (!slug) slug = `paddle-${Date.now()}`;

  const slugTaken = await prisma.paddle.findUnique({ where: { slug } });
  if (slugTaken) {
    redirect(
      `${ROUTES.platformPaddleBrand(brandId)}?error=${encodeURIComponent("此 slug 已被使用")}`,
    );
  }

  let imageDataUrl: string | undefined;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageDataUrl = await readPaddleImageDataUrl(file);
    } catch (e) {
      redirect(
        `${ROUTES.platformPaddleBrand(brandId)}?error=${encodeURIComponent(e instanceof Error ? e.message : "圖片上傳失敗")}`,
      );
    }
  }

  const maxSort = await prisma.paddle.aggregate({
    where: { brandId },
    _max: { sortOrder: true },
  });

  await prisma.paddle.create({
    data: {
      brandId,
      slug,
      series: parsed.data.series,
      variant: parsed.data.variant?.trim() || "-",
      nameZh: parsed.data.nameZh,
      nameEn: parsed.data.nameEn,
      description,
      highlights: parseHighlights(formData.get("highlights")),
      imageDataUrl,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath(ROUTES.platformPaddleBrand(brandId));
  revalidatePath(ROUTES.paddles);
  redirect(`${ROUTES.platformPaddleBrand(brandId)}?saved=1`);
}

export async function updatePaddle(brandId: string, paddleId: string, formData: FormData) {
  await requirePlatformAdmin();

  const parsed = paddleSchema.safeParse({
    series: formData.get("series"),
    variant: formData.get("variant") || "-",
    nameZh: formData.get("nameZh"),
    nameEn: formData.get("nameEn"),
    description: formData.get("description"),
    slug: formData.get("slug") || undefined,
  });

  if (!parsed.success) {
    redirect(
      `${ROUTES.platformPaddleEdit(brandId, paddleId)}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "驗證失敗")}`,
    );
  }

  const description = normalizeDescription(
    parsed.data.description,
    ROUTES.platformPaddleEdit(brandId, paddleId),
  );

  const paddle = await prisma.paddle.findFirst({
    where: { id: paddleId, brandId },
  });
  if (!paddle) {
    redirect(`${ROUTES.platformPaddleBrand(brandId)}?error=${encodeURIComponent("球拍不存在")}`);
  }

  let slug = parsed.data.slug?.trim() || paddle.slug;
  if (!slug) slug = paddle.slug;

  if (slug !== paddle.slug) {
    const slugTaken = await prisma.paddle.findUnique({ where: { slug } });
    if (slugTaken) {
      redirect(
        `${ROUTES.platformPaddleEdit(brandId, paddleId)}?error=${encodeURIComponent("此 slug 已被使用")}`,
      );
    }
  }

  const clearImage = formData.get("clearImage") === "1";
  let imageDataUrl: string | null | undefined = undefined;
  if (clearImage) {
    imageDataUrl = null;
  } else {
    const file = formData.get("image");
    if (file instanceof File && file.size > 0) {
      try {
        imageDataUrl = await readPaddleImageDataUrl(file);
      } catch (e) {
        redirect(
          `${ROUTES.platformPaddleEdit(brandId, paddleId)}?error=${encodeURIComponent(e instanceof Error ? e.message : "圖片上傳失敗")}`,
        );
      }
    }
  }

  await prisma.paddle.update({
    where: { id: paddleId },
    data: {
      slug,
      series: parsed.data.series,
      variant: parsed.data.variant?.trim() || "-",
      nameZh: parsed.data.nameZh,
      nameEn: parsed.data.nameEn,
      description,
      highlights: parseHighlights(formData.get("highlights")),
      ...(imageDataUrl !== undefined ? { imageDataUrl } : {}),
    },
  });

  revalidatePath(ROUTES.platformPaddleBrand(brandId));
  revalidatePath(ROUTES.platformPaddleEdit(brandId, paddleId));
  revalidatePath(ROUTES.paddles);
  revalidatePath(ROUTES.paddle(slug));
  if (slug !== paddle.slug) {
    revalidatePath(ROUTES.paddle(paddle.slug));
  }
  redirect(`${ROUTES.platformPaddleEdit(brandId, paddleId)}?saved=1`);
}

export async function deletePaddle(brandId: string, paddleId: string) {
  await requirePlatformAdmin();
  const paddle = await prisma.paddle.findFirst({
    where: { id: paddleId, brandId },
  });
  if (paddle) {
    await prisma.paddle.delete({ where: { id: paddleId } });
    revalidatePath(ROUTES.paddle(paddle.slug));
  }
  revalidatePath(ROUTES.platformPaddleBrand(brandId));
  revalidatePath(ROUTES.paddles);
  redirect(`${ROUTES.platformPaddleBrand(brandId)}?saved=1`);
}
