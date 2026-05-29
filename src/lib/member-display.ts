/**
 * 活動名單顯示：優先使用該場館會員資料（會員中心可編輯），
 * 未設定時 fallback 至登入帳號名稱／頭像（LINE、Google 等）。
 */
export function resolveMemberDisplay(
  user: { id: string; name: string | null; image: string | null },
  membership?: { nickname: string | null; avatarUrl: string | null } | null,
) {
  const nickname = membership?.nickname?.trim();
  const avatarUrl = membership?.avatarUrl?.trim();
  return {
    userId: user.id,
    displayName: nickname || user.name?.trim() || "會員",
    avatarUrl: avatarUrl || user.image?.trim() || null,
  };
}