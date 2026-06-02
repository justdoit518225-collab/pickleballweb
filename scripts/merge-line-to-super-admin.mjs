/**
 * 將 LINE 帳號併入既有 SUPER_ADMIN（Google 信箱帳號），避免兩個使用者重複。
 * 用法：在 .env 設好 DATABASE_URL 後執行
 *   npx tsx scripts/merge-line-to-super-admin.mjs
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import pg from "pg";

const SUPER_ADMIN_EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL ?? "justdoit518225@gmail.com";
const LINE_PROVIDER_ACCOUNT_ID =
  process.env.SEED_SUPER_ADMIN_LINE_SUB ?? "Uf18d14b08d6088deb00b2bacb9c69ee4";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const adminUser = await prisma.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
if (!adminUser) {
  console.error(`找不到 ${SUPER_ADMIN_EMAIL}，請先用 Google 登入並執行 seed`);
  process.exit(1);
}

const lineAccount = await prisma.account.findUnique({
  where: {
    provider_providerAccountId: {
      provider: "line",
      providerAccountId: LINE_PROVIDER_ACCOUNT_ID,
    },
  },
  include: { user: true },
});

if (!lineAccount) {
  console.error(`找不到 LINE 帳號 ${LINE_PROVIDER_ACCOUNT_ID}`);
  process.exit(1);
}

if (lineAccount.userId === adminUser.id) {
  console.log("LINE 已經綁在同一個使用者上，無需合併");
  process.exit(0);
}

const lineUserId = lineAccount.userId;

await prisma.$transaction(async (tx) => {
  await tx.account.update({
    where: { id: lineAccount.id },
    data: { userId: adminUser.id },
  });

  await tx.session.deleteMany({ where: { userId: lineUserId } });

  const lineMemberships = await tx.tenantMembership.findMany({ where: { userId: lineUserId } });
  for (const m of lineMemberships) {
    await tx.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: m.tenantId, userId: adminUser.id } },
      create: {
        tenantId: m.tenantId,
        userId: adminUser.id,
        nickname: m.nickname,
        avatarUrl: m.avatarUrl,
      },
      update: {},
    });
  }

  await tx.tenantMembership.deleteMany({ where: { userId: lineUserId } });

  await tx.user.delete({ where: { id: lineUserId } });

  await tx.user.update({
    where: { id: adminUser.id },
    data: { platformRole: "SUPER_ADMIN" },
  });

  const tenant = await tx.tenant.findUnique({ where: { slug: "active-pickleball" } });
  if (tenant) {
    const existingStaff = await tx.tenantStaffRole.findFirst({
      where: {
        tenantId: tenant.id,
        userId: adminUser.id,
        role: "TENANT_ADMIN",
        venueId: null,
      },
    });
    if (!existingStaff) {
      await tx.tenantStaffRole.create({
        data: { tenantId: tenant.id, userId: adminUser.id, role: "TENANT_ADMIN" },
      });
    }
  }
});

console.log(
  `已將 LINE（${LINE_PROVIDER_ACCOUNT_ID}）併入 ${SUPER_ADMIN_EMAIL}，此帳號可用 Google 或 LINE 登入，皆為 SUPER_ADMIN`,
);

await prisma.$disconnect();
await pool.end();
