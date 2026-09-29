import { fetchDuprPlayerByDuprId, isDuprApiConfigured } from "@/lib/dupr-api";
import { fetchDuprBasicInfo, parseSsoRatings } from "@/lib/dupr-sso";
import { prisma } from "@/lib/prisma";

export type DuprLinkInput = {
  duprId: string;
  duprName?: string;
  singlesRating?: number;
  doublesRating?: number;
};

/** 手動連結或更新 DUPR 資料 */
export async function linkDuprProfile(userId: string, input: DuprLinkInput) {
  const duprId = input.duprId.trim().toUpperCase();
  return prisma.duprProfile.upsert({
    where: { userId },
    create: {
      userId,
      duprId,
      duprName: input.duprName ?? null,
      singlesRating: input.singlesRating ?? null,
      doublesRating: input.doublesRating ?? null,
      linkStatus: "LINKED",
      profileUrl: `https://www.dupr.com/dashboard/player/${duprId}`,
      lastSyncedAt: new Date(),
    },
    update: {
      duprId,
      duprName: input.duprName ?? undefined,
      singlesRating: input.singlesRating ?? undefined,
      doublesRating: input.doublesRating ?? undefined,
      linkStatus: "LINKED",
      profileUrl: `https://www.dupr.com/dashboard/player/${duprId}`,
      lastSyncedAt: new Date(),
    },
  });
}

/** 依 DUPR ID 從 API 帶入資料並寫入資料庫 */
export async function importDuprProfileFromApi(userId: string, duprId: string) {
  const snapshot = await fetchDuprPlayerByDuprId(duprId);
  return prisma.duprProfile.upsert({
    where: { userId },
    create: {
      userId,
      duprId: snapshot.duprId,
      duprName: snapshot.duprName,
      singlesRating: snapshot.singlesRating,
      doublesRating: snapshot.doublesRating,
      linkStatus: "LINKED",
      profileUrl: snapshot.profileUrl,
      lastSyncedAt: new Date(),
      rawData: snapshot.rawData as object,
    },
    update: {
      duprId: snapshot.duprId,
      duprName: snapshot.duprName ?? undefined,
      singlesRating: snapshot.singlesRating ?? undefined,
      doublesRating: snapshot.doublesRating ?? undefined,
      linkStatus: "LINKED",
      profileUrl: snapshot.profileUrl,
      lastSyncedAt: new Date(),
      rawData: snapshot.rawData as object,
    },
  });
}

/** 經 DUPR SSO 登入後連結帳號：DUPR ID 以伺服器端驗證 token 取得，積分優先用 Partner API */
export async function linkDuprProfileViaSso(userId: string, input: { userToken: string; stats?: unknown }) {
  const basic = await fetchDuprBasicInfo(input.userToken);
  const owner = await prisma.duprProfile.findUnique({ where: { duprId: basic.duprId }, select: { userId: true } });
  if (owner && owner.userId !== userId) throw new Error("此 DUPR 帳號已連結到其他會員");

  let { singles, doubles } = parseSsoRatings(input.stats);
  let duprName = basic.fullName;
  if (isDuprApiConfigured()) {
    try {
      const snapshot = await fetchDuprPlayerByDuprId(basic.duprId);
      singles = snapshot.singlesRating ?? singles;
      doubles = snapshot.doublesRating ?? doubles;
      duprName = duprName ?? snapshot.duprName;
    } catch {
      // Partner API 失敗時沿用 SSO 回傳的積分
    }
  }

  const data = {
    duprId: basic.duprId,
    duprName,
    singlesRating: singles,
    doublesRating: doubles,
    linkStatus: "LINKED" as const,
    profileUrl: `https://www.dupr.com/dashboard/player/${basic.duprId}`,
    lastSyncedAt: new Date(),
    rawData: { source: "SSO", basicInfo: basic, stats: input.stats ?? null } as object,
  };
  return prisma.duprProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}

export async function unlinkDuprProfile(userId: string) {
  await prisma.duprProfile.deleteMany({ where: { userId } });
}

/** 若已有 DUPR ID，從 API 重新同步 */
export async function syncDuprFromApi(userId: string) {
  const profile = await prisma.duprProfile.findUnique({ where: { userId } });
  if (!profile?.duprId) {
    throw new Error("請先填寫 DUPR ID");
  }

  if (!isDuprApiConfigured()) {
    await prisma.duprProfile.update({
      where: { userId },
      data: { linkStatus: "LINKED", lastSyncedAt: new Date() },
    });
    return {
      synced: false,
      message: "未設定 DUPR API 憑證，已保留手動資料",
    };
  }

  try {
    await importDuprProfileFromApi(userId, profile.duprId);
    return { synced: true, message: "已從 DUPR 更新資料" };
  } catch {
    await prisma.duprProfile.update({
      where: { userId },
      data: { linkStatus: "PENDING" },
    });
    throw new Error("DUPR API 同步失敗，請稍後再試或改用手動填寫");
  }
}

export { isDuprApiConfigured };
