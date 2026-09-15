"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROUTES } from "@/lib/constants";
import {
  ensureTenantMembershipOnAccess,
  grantTenantAccess,
  hashAccessCode,
} from "@/lib/tenant-access";
import { prisma } from "@/lib/prisma";

function homePrivateError(message: string): never {
  redirect(
    `${ROUTES.home}?privateError=${encodeURIComponent(message)}#private-club`,
  );
}

/** 首頁：以邀請碼直接加入對應的私人俱樂部（須已登入） */
export async function submitHomePrivateAccessCode(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      ROUTES.loginWithCallback(`${ROUTES.home}?private=1`),
    );
  }

  const code = String(formData.get("accessCode") ?? "").trim();
  if (!code) {
    homePrivateError("請輸入邀請碼");
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      visibility: "PRIVATE",
      isActive: true,
      accessCodeHash: hashAccessCode(code),
    },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    homePrivateError("邀請碼不正確");
  }

  await grantTenantAccess(tenant.slug);
  await ensureTenantMembershipOnAccess(tenant.id, session.user.id);

  revalidatePath(ROUTES.tenant(tenant.slug));
  redirect(`${ROUTES.tenant(tenant.slug)}?joined=1`);
}
