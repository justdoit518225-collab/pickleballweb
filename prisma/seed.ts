import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_ROSTER } from "./demo-zhonghe-roster";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "active-pickleball" },
    update: {
      displayName: "Active Pickleball Club",
      description: "匹克球課程與球敘",
      visibility: "PUBLIC",
      accessCodeHash: null,
    },
    create: {
      slug: "active-pickleball",
      displayName: "Active Pickleball Club",
      description: "匹克球課程與球敘",
      visibility: "PUBLIC",
    },
  });

  const venue = await prisma.venue.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "zhonghe" } },
    update: {},
    create: {
      tenantId: tenant.id,
      slug: "zhonghe",
      name: "中和館",
      address: "新北市中和區",
    },
  });

  const courtA = await prisma.court.upsert({
    where: { venueId_name: { venueId: venue.id, name: "A 場" } },
    update: {},
    create: { venueId: venue.id, name: "A 場", sortOrder: 1 },
  });

  const courtB = await prisma.court.upsert({
    where: { venueId_name: { venueId: venue.id, name: "B 場" } },
    update: {},
    create: { venueId: venue.id, name: "B 場", sortOrder: 2 },
  });

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  await prisma.activity.deleteMany({
    where: {
      tenantId: tenant.id,
      OR: [
        { title: { startsWith: "[示範]" } },
        { title: { startsWith: "週三晚上球敘" } },
        { title: { startsWith: "DUPR 積分球敘" } },
        { title: { startsWith: "新手體驗課" } },
      ],
    },
  });

  const DEMO_OPEN_PLAY_TITLE = "中和自強國小(三小時球敘)";
  const DEMO_CAPACITY = 22;

  /** 下一個 1/22 19:00–22:00（三小時球敘） */
  const nextJan22Year =
    now.getMonth() > 0 || (now.getMonth() === 0 && now.getDate() > 22)
      ? now.getFullYear() + 1
      : now.getFullYear();
  const demoStartAt = new Date(nextJan22Year, 0, 22, 19, 0, 0, 0);
  const demoEndAt = new Date(nextJan22Year, 0, 22, 22, 0, 0, 0);

  let demoActivity = await prisma.activity.findFirst({
    where: { tenantId: tenant.id, title: DEMO_OPEN_PLAY_TITLE },
  });

  if (!demoActivity) {
    demoActivity = await prisma.activity.create({
      data: {
        tenantId: tenant.id,
        venueId: venue.id,
        courtId: courtA.id,
        type: "OPEN_PLAY",
        status: "PUBLISHED",
        title: DEMO_OPEN_PLAY_TITLE,
        description: "三小時球敘，歡迎各程度球友。",
        startAt: demoStartAt,
        endAt: demoEndAt,
        capacity: DEMO_CAPACITY,
        cancelPolicyType: "HOURS_BEFORE",
        cancelHoursBefore: 4,
        requiresDupr: false,
      },
    });
  } else {
    demoActivity = await prisma.activity.update({
      where: { id: demoActivity.id },
      data: {
        startAt: demoStartAt,
        endAt: demoEndAt,
        capacity: DEMO_CAPACITY,
        status: "PUBLISHED",
      },
    });
  }

  await prisma.booking.deleteMany({ where: { activityId: demoActivity.id } });

  const demoBookerIds: string[] = [];
  for (let i = 0; i < DEMO_ROSTER.length; i++) {
    const { name: displayName, avatarUrl } = DEMO_ROSTER[i];
    const email = `seed-zhonghe-${i + 1}@playplayplay.local`;
    const player = await prisma.user.upsert({
      where: { email },
      update: { name: displayName, image: avatarUrl },
      create: { email, name: displayName, image: avatarUrl },
    });
    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: player.id } },
      update: { nickname: displayName, avatarUrl },
      create: { tenantId: tenant.id, userId: player.id, nickname: displayName, avatarUrl },
    });
    demoBookerIds.push(player.id);
  }

  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL;
  let adminIncluded = false;
  if (superAdminEmail) {
    const adminUser = await prisma.user.findUnique({ where: { email: superAdminEmail } });
    if (adminUser) {
      await prisma.tenantMembership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: adminUser.id } },
        update: {},
        create: { tenantId: tenant.id, userId: adminUser.id },
      });
      demoBookerIds.push(adminUser.id);
      adminIncluded = true;
    }
  }

  await prisma.booking.createMany({
    data: demoBookerIds.map((userId) => ({
      activityId: demoActivity!.id,
      userId,
      status: "CONFIRMED" as const,
    })),
  });

  console.log(
    `示範活動「${DEMO_OPEN_PLAY_TITLE}」：${demoBookerIds.length}/${DEMO_CAPACITY} 名額已滿` +
      (adminIncluded ? `（含 ${superAdminEmail}）` : `（尚無 ${superAdminEmail ?? "管理員"} 帳號，請先登入後再 seed）`),
  );

  await prisma.activity.createMany({
    data: [
      {
        tenantId: tenant.id,
        venueId: venue.id,
        courtId: courtA.id,
        type: "OPEN_PLAY",
        status: "PUBLISHED",
        title: "週三晚上球敘",
        description: "初級至中級，歡迎自備球拍。",
        startAt: new Date(now.getTime() + 3 * day),
        endAt: new Date(now.getTime() + 3 * day + 2 * 60 * 60 * 1000),
        capacity: 12,
        cancelPolicyType: "HOURS_BEFORE",
        cancelHoursBefore: 4,
        requiresDupr: false,
      },
      {
        tenantId: tenant.id,
        venueId: venue.id,
        courtId: courtB.id,
        type: "OPEN_PLAY",
        status: "PUBLISHED",
        title: "DUPR 積分球敘",
        description: "請先於會員中心連結 DUPR 後再預約。",
        startAt: new Date(now.getTime() + 7 * day),
        endAt: new Date(now.getTime() + 7 * day + 2 * 60 * 60 * 1000),
        capacity: 8,
        cancelPolicyType: "DEADLINE",
        cancelDeadlineAt: new Date(now.getTime() + 6 * day),
        requiresDupr: true,
        duprEventName: "Friday DUPR Social",
      },
      {
        tenantId: tenant.id,
        venueId: venue.id,
        type: "COURSE",
        status: "PUBLISHED",
        title: "新手體驗課",
        description: "教練帶領基礎握拍與發球。",
        startAt: new Date(now.getTime() + 10 * day),
        endAt: new Date(now.getTime() + 10 * day + 90 * 60 * 1000),
        capacity: 6,
        cancelPolicyType: "HOURS_BEFORE",
        cancelHoursBefore: 24,
        requiresDupr: false,
      },
    ],
  });

  if (superAdminEmail) {
    const adminUser = await prisma.user.findUnique({ where: { email: superAdminEmail } });
    if (adminUser) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { platformRole: "SUPER_ADMIN" },
      });
      const existingStaff = await prisma.tenantStaffRole.findFirst({
        where: {
          tenantId: tenant.id,
          userId: adminUser.id,
          role: "TENANT_ADMIN",
          venueId: null,
        },
      });
      if (!existingStaff) {
        await prisma.tenantStaffRole.create({
          data: {
            tenantId: tenant.id,
            userId: adminUser.id,
            role: "TENANT_ADMIN",
          },
        });
      }
      console.log(`已將 ${superAdminEmail} 設為 SUPER_ADMIN + Active Pickleball 管理員`);
    } else {
      console.log(`尚無使用者 ${superAdminEmail}，請先登入後再執行 seed`);
    }
  }

  // 場地租借須由管理後台建立；清除示範租戶所有既有租借時段（含舊 seed）
  const removedRentals = await prisma.rentalSlot.deleteMany({
    where: { tenantId: tenant.id },
  });
  if (removedRentals.count > 0) {
    console.log(`已清除 ${removedRentals.count} 筆租借時段（請至管理後台新增）`);
  }

  // 匹克球拍目錄（已存在的 brand / slug 略過）
  const { SEED_PADDLES } = await import("./paddle-seed-data");
  const brandNames = [...new Set(SEED_PADDLES.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" }),
  );
  const brandIdByName = new Map<string, string>();
  for (let i = 0; i < brandNames.length; i++) {
    const name = brandNames[i]!;
    const brand = await prisma.paddleBrand.upsert({
      where: { name },
      update: {},
      create: { name, sortOrder: i },
    });
    brandIdByName.set(name, brand.id);
  }
  let paddlesCreated = 0;
  for (let i = 0; i < SEED_PADDLES.length; i++) {
    const p = SEED_PADDLES[i]!;
    const brandId = brandIdByName.get(p.brand);
    if (!brandId) continue;
    const existing = await prisma.paddle.findUnique({ where: { slug: p.slug } });
    if (existing) continue;
    await prisma.paddle.create({
      data: {
        brandId,
        slug: p.slug,
        series: p.series,
        variant: p.variant,
        nameZh: p.nameZh,
        nameEn: p.nameEn,
        description: p.description,
        highlights: [...p.highlights],
        sortOrder: i,
      },
    });
    paddlesCreated += 1;
  }
  console.log(
    `匹克球拍：品牌 ${brandNames.length}、新增球拍 ${paddlesCreated}（既有 slug 已略過）`,
  );

  console.log("Seed 完成：Active Pickleball Club 租戶與示範活動已建立（場地租借請於管理後台新增）");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
