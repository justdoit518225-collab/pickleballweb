/**
 * 從「預約明細」CSV 匯入樂活（或其它租戶）預約。
 *
 * CSV 欄位（第一列標題）：
 *   姓名,臨打人數,日期,時段,數
 *
 * 用法：
 *   npx tsx scripts/import-reservations.mjs data/import-loho-reservations.csv --dry-run
 *   npx tsx scripts/import-reservations.mjs data/import-loho-reservations.csv
 *
 * 環境變數（選填）：
 *   TENANT_SLUG=loho2   預設自動找名稱含「樂活」的租戶
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import pg from "pg";

const dryRun = process.argv.includes("--dry-run");
const csvPath = process.argv.find((a) => a.endsWith(".csv"));

if (!csvPath) {
  console.error("請指定 CSV 路徑，例如：data/import-loho-reservations.csv");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const stats = {
  rental: 0,
  activity: 0,
  skipped: 0,
  errors: [],
};

function slugifyName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "guest";
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim());
  const idx = {
    name: header.findIndex((h) => h.includes("姓名") || h === "name"),
    type: header.findIndex((h) => h.includes("臨打") || h.includes("人數") || h === "type"),
    date: header.findIndex((h) => h.includes("日期") || h === "date"),
    time: header.findIndex((h) => h.includes("時段") || h === "time"),
    extra: header.findIndex((h) => h === "數" || h.includes("備註")),
  };

  if (idx.name < 0 || idx.date < 0 || idx.time < 0) {
    throw new Error(`CSV 標題需含：姓名、日期、時段。目前：${lines[0]}`);
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const name = (cols[idx.name] ?? "").trim();
    if (!name || name === "預約明細") continue;
    rows.push({
      name,
      typeRaw: idx.type >= 0 ? (cols[idx.type] ?? "").trim() : "",
      dateRaw: (cols[idx.date] ?? "").trim(),
      timeRaw: (cols[idx.time] ?? "").trim(),
      extra: idx.extra >= 0 ? (cols[idx.extra] ?? "").trim() : "",
    });
  }
  return rows;
}

function parseDate(dateRaw) {
  const m = dateRaw.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return d;
}

function parseTimePart(date, part) {
  const p = part.trim().replace(/：/g, ":");
  let h = 0;
  let min = 0;
  if (p.includes(":")) {
    const [hs, ms] = p.split(":");
    h = Number(hs);
    min = Number(ms) || 0;
  } else {
    h = Number(p);
    min = 0;
  }
  const out = new Date(date);
  out.setHours(h, min, 0, 0);
  return out;
}

function parseTimeRange(date, timeRaw) {
  const s = timeRaw.replace(/\s/g, "").replace(/：/g, ":");
  const parts = s.split("-");
  if (parts.length !== 2) return null;
  const startAt = parseTimePart(date, parts[0]);
  const endAt = parseTimePart(date, parts[1]);
  if (endAt <= startAt) return null;
  return { startAt, endAt };
}

function classifyRow(name, typeRaw) {
  const type = typeRaw.trim();
  if (/租/.test(type) || /^\d+面$/.test(type)) return "rental";
  if (/班|DUPR|教練|體驗|課程|樂活/.test(name)) return "class";
  if (/^\d+$/.test(type)) return "class";
  if (/租/.test(name)) return "rental";
  return "rental";
}

function parseRentalMeta(typeRaw) {
  const s = typeRaw.replace(/\s/g, "");
  let courtCount = 1;
  let partySize = 1;
  const m1 = s.match(/租(\d+)面/);
  if (m1) courtCount = Number(m1[1]);
  const m2 = s.match(/^(\d+)面$/);
  if (m2) courtCount = Number(m2[1]);
  const m3 = s.match(/\/(\d+)/);
  if (m3) partySize = Number(m3[1]);
  const m4 = s.match(/^(\d+)$/);
  if (m4 && !/租/.test(s)) partySize = Number(m4[1]);
  return { courtCount: Math.min(Math.max(courtCount, 1), 3), partySize };
}

function parseClassCapacity(name, typeRaw) {
  const s = typeRaw.trim();
  const slash = s.match(/\/(\d+)/);
  if (slash) return Number(slash[1]);
  const n = s.match(/^(\d+)/);
  if (n) return Number(n[1]);
  if (/^\d+$/.test(s)) return Number(s);
  const extra = name.match(/(\d+)\s*人/);
  if (extra) return Number(extra[1]);
  return 12;
}

async function findTenant() {
  if (process.env.TENANT_SLUG) {
    return prisma.tenant.findUnique({
      where: { slug: process.env.TENANT_SLUG },
      include: {
        venues: { include: { courts: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } } },
      },
    });
  }
  return prisma.tenant.findFirst({
    where: {
      isActive: true,
      OR: [
        { displayName: { contains: "樂活", mode: "insensitive" } },
        { displayName: { contains: "板橋", mode: "insensitive" } },
      ],
    },
    include: {
      venues: { include: { courts: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } } },
    },
  });
}

const userCache = new Map();

async function getImportUser(displayName) {
  const key = displayName.trim();
  if (userCache.has(key)) return userCache.get(key);

  const local = `import-${slugifyName(key)}@import.playplayplay.local`;
  let user = await prisma.user.findUnique({ where: { email: local } });
  if (!user && !dryRun) {
    user = await prisma.user.create({
      data: { email: local, name: key },
    });
  }
  if (user) userCache.set(key, user);
  return user;
}

function courtsForTenant(tenant) {
  const courts = tenant.venues.flatMap((v) => v.courts);
  return courts.sort((a, b) => a.sortOrder - b.sortOrder);
}

async function slotConflicts(courtId, startAt, endAt) {
  const hit = await prisma.rentalSlot.findFirst({
    where: {
      courtId,
      status: { in: ["OPEN", "BOOKED"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });
  return Boolean(hit);
}

async function importRental(tenant, courts, row, range, meta, note) {
  const courtList = courts.slice(0, meta.courtCount);
  if (courtList.length < meta.courtCount) {
    stats.errors.push(`${row.name} ${row.dateRaw}：球場不足 ${meta.courtCount} 面`);
    stats.skipped++;
    return;
  }

  const user = await getImportUser(row.name);
  if (!user && dryRun) {
    console.log(`[dry-run] 租場 ${row.name} ${row.dateRaw} ${row.timeRaw} ×${meta.courtCount}面`);
    stats.rental++;
    return;
  }

  for (const court of courtList) {
    if (await slotConflicts(court.id, range.startAt, range.endAt)) {
      stats.errors.push(
        `跳過重疊：${row.name} ${court.name} ${row.dateRaw} ${row.timeRaw}`,
      );
      stats.skipped++;
      continue;
    }

    const noteText = [note, meta.partySize > 1 ? `${meta.partySize}人` : null, `[匯入] ${row.typeRaw}`]
      .filter(Boolean)
      .join(" · ");

    if (dryRun) {
      console.log(`[dry-run] 租場 ${court.name} ${row.name} ${range.startAt.toISOString()}`);
      stats.rental++;
      continue;
    }

    const venue = tenant.venues.find((v) => v.courts.some((c) => c.id === court.id));
    const slot = await prisma.rentalSlot.create({
      data: {
        tenantId: tenant.id,
        venueId: venue.id,
        courtId: court.id,
        startAt: range.startAt,
        endAt: range.endAt,
        status: "BOOKED",
        bookedById: user.id,
        note: noteText || null,
        cancelHoursBefore: 4,
      },
    });
    await prisma.rentalBooking.create({
      data: { slotId: slot.id, userId: user.id, status: "CONFIRMED", racketRental: 0 },
    });
    stats.rental++;
  }
}

async function importClass(tenant, courts, row, range, capacity, note) {
  const court = courts[0];
  const venue = tenant.venues.find((v) => v.id === court.venueId);
  const requiresDupr = /DUPR/i.test(row.name);
  const title = row.name.startsWith("[匯入]") ? row.name : `[匯入] ${row.name}`;

  const existing = await prisma.activity.findFirst({
    where: {
      tenantId: tenant.id,
      title,
      startAt: range.startAt,
      endAt: range.endAt,
    },
  });
  if (existing) {
    stats.skipped++;
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] 活動 ${title} 容量${capacity} ${row.dateRaw} ${row.timeRaw}`);
    stats.activity++;
    return;
  }

  await prisma.activity.create({
    data: {
      tenantId: tenant.id,
      venueId: venue.id,
      courtId: court.id,
      type: /課|班|教練|體驗/.test(row.name) ? "COURSE" : "OPEN_PLAY",
      status: "PUBLISHED",
      title,
      description: [note, row.typeRaw ? `臨打欄：${row.typeRaw}` : null].filter(Boolean).join("\n"),
      startAt: range.startAt,
      endAt: range.endAt,
      capacity: Math.max(capacity, 1),
      cancelPolicyType: "HOURS_BEFORE",
      cancelHoursBefore: 4,
      requiresDupr,
    },
  });
  stats.activity++;
}

async function main() {
  const absPath = path.resolve(csvPath);
  if (!fs.existsSync(absPath)) {
    console.error(`找不到檔案：${absPath}`);
    process.exit(1);
  }

  const tenant = await findTenant();
  if (!tenant) {
    console.error("找不到租戶。請設 TENANT_SLUG=loho2");
    process.exit(1);
  }

  const courts = courtsForTenant(tenant);
  if (courts.length === 0) {
    console.error("此租戶沒有球場，請先在後台建立 A/B/C 場");
    process.exit(1);
  }

  console.log(`租戶：${tenant.displayName}（slug: ${tenant.slug}）`);
  console.log(`球場：${courts.map((c) => c.name).join("、")}`);
  console.log(dryRun ? "模式：預覽（不寫入）\n" : "模式：正式匯入\n");

  const rows = parseCsv(fs.readFileSync(absPath, "utf8"));
  console.log(`讀取 ${rows.length} 列\n`);

  for (const row of rows) {
    const date = parseDate(row.dateRaw);
    const range = date ? parseTimeRange(date, row.timeRaw) : null;
    if (!date || !range) {
      stats.errors.push(`日期/時段無法解析：${row.name} ${row.dateRaw} ${row.timeRaw}`);
      stats.skipped++;
      continue;
    }

    const mode = classifyRow(row.name, row.typeRaw);
    const note = row.extra ? `試算表備註：${row.extra}` : "";

    try {
      if (mode === "rental") {
        const meta = parseRentalMeta(row.typeRaw || row.name);
        await importRental(tenant, courts, row, range, meta, note);
      } else {
        const cap = parseClassCapacity(row.name, row.typeRaw);
        await importClass(tenant, courts, row, range, cap, note);
      }
    } catch (e) {
      stats.errors.push(`${row.name}: ${e instanceof Error ? e.message : String(e)}`);
      stats.skipped++;
    }
  }

  console.log("\n--- 完成 ---");
  console.log(`租場時段：${stats.rental}`);
  console.log(`活動（班級）：${stats.activity}`);
  console.log(`跳過/失敗：${stats.skipped}`);
  if (stats.errors.length) {
    console.log("\n明細：");
    for (const e of stats.errors.slice(0, 30)) console.log(`  - ${e}`);
    if (stats.errors.length > 30) console.log(`  …另有 ${stats.errors.length - 30} 筆`);
  }
  console.log(`\n看板：https://www.playplayplay.fun/t/${tenant.slug}/board`);
}

await main();
await prisma.$disconnect();
await pool.end();
