"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

const tenantSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/, "slug 僅能使用小寫英文、數字、連字號"),
  displayName: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});

export async function createTenant(formData: FormData) {
  const session = await auth();
  if (session?.user?.platformRole !== "SUPER_ADMIN") {
    redirect("/");
  }

  const parsed = tenantSchema.safeParse({
    slug: formData.get("slug"),
    displayName: formData.get("displayName"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    redirect(
      `${ROUTES.platformAdmin}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "驗證失敗")}`,
    );
  }

  const exists = await prisma.tenant.findUnique({ where: { slug: parsed.data.slug } });
  if (exists) {
    redirect(`${ROUTES.platformAdmin}?error=${encodeURIComponent("此 slug 已被使用")}`);
  }

  const creatorId = session.user!.id!;

  const tenant = await prisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: {
        ...parsed.data,
        visibility: "PUBLIC",
        venues: {
          create: {
            slug: "main",
            name: `${parsed.data.displayName} 主館`,
            address: "",
            courts: { create: [{ name: "A 場", sortOrder: 1 }, { name: "B 場", sortOrder: 2 }] },
          },
        },
      },
    });

    const existingStaff = await tx.tenantStaffRole.findFirst({
      where: {
        tenantId: created.id,
        userId: creatorId,
        role: "TENANT_ADMIN",
        venueId: null,
      },
    });
    if (!existingStaff) {
      await tx.tenantStaffRole.create({
        data: {
          tenantId: created.id,
          userId: creatorId,
          role: "TENANT_ADMIN",
        },
      });
    }

    return created;
  });

  revalidatePath(ROUTES.platformAdmin);
  revalidatePath(ROUTES.me);
  redirect(ROUTES.tenantAdmin(tenant.slug));
}

const updateDescriptionSchema = z.object({
  description: z.string().max(2000).optional(),
});

export async function updateTenantDescription(tenantId: string, formData: FormData) {
  const session = await auth();
  if (session?.user?.platformRole !== "SUPER_ADMIN") {
    redirect("/");
  }

  const raw = String(formData.get("description") ?? "").trim();
  const parsed = updateDescriptionSchema.safeParse({
    description: raw || undefined,
  });

  if (!parsed.success) {
    redirect(
      `${ROUTES.platformAdmin}?edit=${tenantId}&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "驗證失敗")}`,
    );
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { description: parsed.data.description ?? null },
    select: { slug: true },
  });

  revalidatePath(ROUTES.platformAdmin);
  revalidatePath(ROUTES.tenant(tenant.slug));
  revalidatePath(ROUTES.tenantAbout(tenant.slug));
  redirect(`${ROUTES.platformAdmin}?saved=1`);
}
