/**
 * 從 FitBook 公開課程表匯入 Active Pickleball Club 的球敘與課程（以 FitBook 課程 ID upsert，可重複執行）。
 * 已存在的活動只更新標題、時間、場館、名額與說明，不改狀態（後台停課的不會被重新開啟）。
 * 用法：npx tsx scripts/import-fitbook-activities.ts [起日 YYYY-MM-DD] [迄日 YYYY-MM-DD] [--dry-run]
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type ActivityType } from "../src/generated/prisma/client";
import pg from "pg";
import { fetchFitbookCourses, getFitbookStore, isValidYmd, type FitbookCourse } from "../src/lib/fitbook";

const TENANT_SLUG = "active-pickleball-club";
/** 課程名稱沒寫場館、或只寫區名時的歸屬 */
const FALLBACK_VENUE_NAME = "中和自強國小";
const CANCEL_HOURS_BEFORE = 4;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [from = "2026-10-01", to = "2026-10-31"] = args.filter((a) => !a.startsWith("--"));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function* eachDate(start: string, end: string) {
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

function activityType(course: FitbookCourse): ActivityType {
  return course.categoryName.startsWith("匹克球敘") ? "OPEN_PLAY" : "COURSE";
}

function description(course: FitbookCourse, type: ActivityType) {
  return [
    course.categoryName,
    course.teacherName && `${type === "COURSE" ? "教練" : "帶隊"}：${course.teacherName}`,
    `FitBook：${course.url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  if (!isValidYmd(from) || !isValidYmd(to) || from > to) throw new Error(`日期範圍錯誤：${from} ~ ${to}`);
  const store = getFitbookStore(TENANT_SLUG);
  if (!store) throw new Error("找不到 FitBook 設定");
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: TENANT_SLUG } });
  const venues = await prisma.venue.findMany({ where: { tenantId: tenant.id, isActive: true } });
  const venueByName = new Map(venues.map((v) => [v.name, v]));
  const fallback = venueByName.get(FALLBACK_VENUE_NAME);
  if (!fallback) throw new Error(`找不到預設場館：${FALLBACK_VENUE_NAME}`);

  let created = 0;
  let updated = 0;
  for (const date of eachDate(from, to)) {
    const courses = await fetchFitbookCourses(store, date);
    for (const course of courses) {
      const venue: typeof fallback = (course.location && venueByName.get(course.location)) || fallback;
      if (venue === fallback && course.location !== FALLBACK_VENUE_NAME) {
        console.log(`  ↪ ${date} ${course.name}：地點「${course.location ?? "未標示"}」歸到 ${fallback.name}`);
      }
      const type = activityType(course);
      const data = {
        venueId: venue.id,
        type,
        title: course.name,
        description: description(course, type),
        startAt: course.startAt,
        endAt: course.endAt,
        capacity: Math.max(1, course.capacity),
      };
      const key = { tenantId_fitbookCourseId: { tenantId: tenant.id, fitbookCourseId: course.courseId } };
      const existing = await prisma.activity.findUnique({ where: key, select: { id: true } });
      console.log(
        `${existing ? "更新" : "新增"} ${date} ${course.showTime} ${type === "COURSE" ? "課程" : "球敘"} ${course.name} @${venue.name} 名額 ${data.capacity}`,
      );
      if (dryRun) continue;
      if (existing) {
        await prisma.activity.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.activity.create({
          data: {
            ...data,
            tenantId: tenant.id,
            fitbookCourseId: course.courseId,
            status: "PUBLISHED",
            cancelPolicyType: "HOURS_BEFORE",
            cancelHoursBefore: CANCEL_HOURS_BEFORE,
          },
        });
        created++;
      }
    }
  }
  console.log(dryRun ? "（試跑，未寫入）" : `完成：新增 ${created}、更新 ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
