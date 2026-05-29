"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  ensureTenantMembershipOnAccess,
  grantTenantAccess,
  verifyAccessCode,
} from "@/lib/tenant-access";
import { getTenantBySlug } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

export async function submitTenantAccessCode(
  tenantSlug: string,
  formData: FormData,
) {
  const code = String(formData.get("accessCode") ?? "").trim();
  if (!code) {
    redirect(
      `${ROUTES.tenantAccess(tenantSlug)}?error=${encodeURIComponent("請輸入邀請碼")}`,
    );
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) redirect("/");

  if (tenant.visibility === "PUBLIC") {
    redirect(ROUTES.tenant(tenantSlug));
  }

  if (!verifyAccessCode(code, tenant.accessCodeHash)) {
    redirect(
      `${ROUTES.tenantAccess(tenantSlug)}?error=${encodeURIComponent("邀請碼不正確")}`,
    );
  }

  await grantTenantAccess(tenantSlug);

  const session = await auth();
  if (session?.user?.id) {
    await ensureTenantMembershipOnAccess(tenant.id, session.user.id);
  }

  revalidatePath(ROUTES.tenant(tenantSlug));
  redirect(`${ROUTES.tenant(tenantSlug)}?joined=1`);
}

export async function submitTenantReview(tenantSlug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) redirect("/");

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim() || null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect(
      `${ROUTES.tenantAbout(tenantSlug)}?error=${encodeURIComponent("請選擇 1–5 星")}`,
    );
  }

  await prisma.tenantReview.upsert({
    where: {
      tenantId_userId: { tenantId: tenant.id, userId: session.user.id },
    },
    create: {
      tenantId: tenant.id,
      userId: session.user.id,
      rating,
      comment,
    },
    update: { rating, comment },
  });

  revalidatePath(ROUTES.tenantAbout(tenantSlug));
  redirect(`${ROUTES.tenantAbout(tenantSlug)}?saved=1`);
}
