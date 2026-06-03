"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  OAUTH_PROVIDER_IDS,
  type OAuthProviderId,
} from "@/lib/oauth-providers";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

function accountsPath(query?: Record<string, string>) {
  const base = ROUTES.meAccounts;
  if (!query || Object.keys(query).length === 0) return base;
  return `${base}?${new URLSearchParams(query).toString()}`;
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function unlinkOAuthAccount(formData: FormData) {
  const userId = await requireUserId();
  const provider = String(formData.get("provider") ?? "");

  if (!OAUTH_PROVIDER_IDS.includes(provider as OAuthProviderId)) {
    redirect(accountsPath({ error: "invalid_provider" }));
  }

  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true, provider: true },
  });

  if (accounts.length <= 1) {
    redirect(accountsPath({ error: "last_account" }));
  }

  const target = accounts.find((a) => a.provider === provider);
  if (!target) {
    redirect(accountsPath({ error: "not_linked" }));
  }

  await prisma.$transaction(async (tx) => {
    await tx.account.delete({ where: { id: target.id } });
    if (provider === "line") {
      await tx.notificationPreference.updateMany({
        where: { userId },
        data: { lineLinked: false, lineUserId: null },
      });
    }
  });

  revalidatePath(ROUTES.meAccounts);
  revalidatePath(ROUTES.me);
  redirect(accountsPath({ unlinked: provider }));
}
