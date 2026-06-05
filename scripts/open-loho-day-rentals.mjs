/**
 * 為樂活板橋（loho2）指定日期開放每小時租場時段（三場 A/B/C，09:00–24:00）。
 *
 *   npx tsx scripts/open-loho-day-rentals.mjs
 *   npx tsx scripts/open-loho-day-rentals.mjs 2026-06-05
 *   npx tsx scripts/open-loho-day-rentals.mjs --dry-run
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import pg from "pg";

const dryRun = process.argv.includes("--dry-run");
const dateArg = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));

const HOUR_START = 9;
const HOUR_END = 24;

function nextTaipeiYmd(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

function taipeiSlotRange(ymd, hour) {
  const pad = (n) => String(n).padStart(2, "0");
  const startAt = new Date(`${ymd}T${pad(hour)}:00:00+08:00`);
  const endHour = hour + 1;
  const endAt =
    endHour >= 24
      ? new Date(`${nextTaipeiYmd(ymd)}T00:00:00+08:00`)
      : new Date(`${ymd}T${pad(endHour)}:00:00+08:00`);
  return { startAt, endAt };
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function sortCourts(courts) {
  const rank = (name) => {
    if (/A/.test(name)) return 0;
    if (/B/.test(name)) return 1;
    if (/C/.test(name)) return 2;
    return 3;
  };
  return [...courts].sort((a, b) => rank(a.name) - rank(b.name) || a.sortOrder - b.sortOrder);
}

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: "loho2" },
    include: {
      venues: {
        where: { isActive: true },
        include: { courts: { where: { isActive: true } } },
      },
    },
  });
  if (!tenant) {
    console.error("找不到租戶 loho2");
    process.exit(1);
  }

  const dayLabel = dateArg
    ? dateArg
    : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });

  const courts = sortCourts(tenant.venues.flatMap((v) => v.courts));
  if (courts.length === 0) {
    console.error("沒有球場");
    process.exit(1);
  }

  const toCreate = [];

  for (const court of courts) {
    for (let h = HOUR_START; h < HOUR_END; h++) {
      const { startAt, endAt } = taipeiSlotRange(dayLabel, h);

      const conflict = await prisma.rentalSlot.findFirst({
        where: {
          courtId: court.id,
          status: { not: "BLOCKED" },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });
      if (conflict) continue;

      toCreate.push({
        tenantId: tenant.id,
        venueId: court.venueId,
        courtId: court.id,
        startAt,
        endAt,
        status: "OPEN",
        cancelHoursBefore: 4,
      });
    }
  }

  console.log(`租戶：${tenant.displayName}（${dayLabel}）`);
  console.log(`球場：${courts.map((c) => c.name).join("、")}`);
  console.log(`時段：每日 ${HOUR_START}:00–${HOUR_END}:00（每小時一格）`);
  console.log(dryRun ? "模式：預覽\n" : "模式：正式建立\n");
  console.log(`將建立 ${toCreate.length} 個租場時段`);

  if (!dryRun && toCreate.length > 0) {
    await prisma.rentalSlot.createMany({ data: toCreate });
    console.log("完成。");
  }

  await prisma.$disconnect();
  await pool.end();
}

await main();
