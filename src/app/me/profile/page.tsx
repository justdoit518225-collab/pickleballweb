import { auth } from "@/auth";
import {
  resetMembershipAvatarToLogin,
  updateMembershipProfile,
} from "@/app/me/actions";
import { resolveMemberDisplay } from "@/lib/member-display";
import { Avatar } from "@/components/ui/avatar";
import { prisma } from "@/lib/prisma";

export default async function MeProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id;

  const [memberships, accountUser] = await Promise.all([
    prisma.tenantMembership.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, image: true, email: true },
    }),
  ]);

  const loginName = accountUser?.name ?? session!.user!.name ?? "會員";
  const loginImage = accountUser?.image ?? session!.user!.image ?? null;
  const accountForDisplay = {
    id: userId,
    name: accountUser?.name ?? session!.user!.name ?? null,
    image: accountUser?.image ?? session!.user!.image ?? null,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p>
          各場館可設定<strong className="font-medium text-slate-800">專用暱稱與頭像</strong>
          ，活動報名名單會優先顯示此資料。
        </p>
        <p className="mt-2">
          首次加入場館時，會自動帶入您<strong className="font-medium text-slate-800">登入帳號</strong>
          的名稱與頭像（例如 LINE 大頭貼）；之後可在此修改，或改回使用登入帳號頭像。
        </p>
      </section>

      <section className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <Avatar src={loginImage} name={loginName} size="md" />
        <div className="text-sm">
          <p className="font-medium text-slate-800">登入帳號</p>
          <p className="text-slate-600">{loginName}</p>
          {accountUser?.email && (
            <p className="text-slate-500">{accountUser.email}</p>
          )}
        </div>
      </section>

      {saved && <p className="text-sm text-brand-teal">已儲存</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {memberships.length === 0 ? (
        <p className="text-sm text-slate-500">尚無場館會員資料，預約任一活動後會自動建立</p>
      ) : (
        memberships.map((m) => {
          const display = resolveMemberDisplay(accountForDisplay, m);
          const nicknameDefault = m.nickname ?? loginName;
          const avatarDefault = m.avatarUrl ?? loginImage ?? "";

          return (
            <form
              key={m.id}
              action={updateMembershipProfile}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <input type="hidden" name="tenantId" value={m.tenantId} />
              <div className="flex items-center gap-3">
                <Avatar src={display.avatarUrl} name={display.displayName} size="md" />
                <h2 className="font-semibold text-slate-800">{m.tenant.displayName}</h2>
              </div>

              <div>
                <label htmlFor={`nickname-${m.id}`} className="block text-sm font-medium text-slate-700">
                  暱稱
                </label>
                <input
                  id={`nickname-${m.id}`}
                  name="nickname"
                  defaultValue={nicknameDefault}
                  placeholder={loginName}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">留空則顯示登入帳號名稱</p>
              </div>

              <div>
                <label htmlFor={`avatar-${m.id}`} className="block text-sm font-medium text-slate-700">
                  頭像網址
                </label>
                <input
                  id={`avatar-${m.id}`}
                  name="avatarUrl"
                  type="url"
                  defaultValue={avatarDefault}
                  placeholder={loginImage ?? "https://..."}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  可貼上圖片連結；清除後按「使用登入帳號頭像」可改回 LINE／Google 大頭貼
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  儲存
                </button>
              </div>
            </form>
          );
        })
      )}

      {memberships.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-500">快速操作</p>
          {memberships.map((m) => (
            <form key={`reset-${m.id}`} action={resetMembershipAvatarToLogin}>
              <input type="hidden" name="tenantId" value={m.tenantId} />
              <button
                type="submit"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {m.tenant.displayName}：改回使用登入帳號頭像
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
