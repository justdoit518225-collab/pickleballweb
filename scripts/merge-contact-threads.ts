/**
 * 合併同一帳號／同一訪客 cookie 的重複聯繫對話，再套 unique。
 * 用法：npx tsx scripts/merge-contact-threads.ts
 */
import "dotenv/config";
import { mergeDuplicateContactThreads } from "../src/lib/contact";
import { prisma } from "../src/lib/prisma";

async function main() {
  const before = await prisma.contactThread.count();
  await mergeDuplicateContactThreads();
  const after = await prisma.contactThread.count();
  console.log(`contact threads: ${before} -> ${after}`);
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
