export const APP_NAME = "PlayPlayPlay";
export const APP_TAGLINE = "匹克球多場館預約平台";

/** 對外聯繫 LINE（官方帳號） */
export const CONTACT_LINE_ID = "@700qpodg";
export const CONTACT_LINE_URL = `https://line.me/R/ti/p/${CONTACT_LINE_ID}`;

/** 平台預設對外營運的租戶（seed 建立） */
export const DEFAULT_TENANT_SLUG = "active-pickleball";
export const DEFAULT_TENANT_NAME = "Active Pickleball Club";

/** 樂活板橋：使用「今日 × 球場 × 每小時」看板為首頁 */
export const LOHO_TENANT_SLUG = "loho2";

export function usesHourlyBoardHome(slug: string) {
  return slug === LOHO_TENANT_SLUG;
}

export const ROUTES = {
  home: "/",
  doublesScheduler: "/doubles-scheduler",
  paddles: "/paddles",
  paddle: (id: string) => `/paddles/${id}`,
  me: "/me",
  meBookings: "/me/bookings",
  meInbox: "/me/inbox",
  meDupr: "/me/dupr",
  meProfile: "/me/profile",
  meAccounts: "/me/accounts",
  meNotifications: "/me/notifications",
  platformAdmin: "/platform/tenants",
  platformPaddles: "/platform/paddles",
  platformPaddleBrand: (brandId: string) => `/platform/paddles/${brandId}`,
  platformPaddleEdit: (brandId: string, paddleId: string) =>
    `/platform/paddles/${brandId}/${paddleId}`,
  tenant: (slug: string) => `/t/${slug}`,
  tenantAccess: (slug: string) => `/t/${slug}/access`,
  tenantAbout: (slug: string) => `/t/${slug}/about`,
  tenantActivities: (slug: string, type?: "open-play" | "course" | "dupr") =>
    type ? `/t/${slug}/activities?type=${type}` : `/t/${slug}/activities`,
  tenantActivity: (slug: string, id: string) => `/t/${slug}/activities/${id}`,
  tenantRentals: (slug: string) => `/t/${slug}/rentals`,
  tenantBoard: (slug: string, date?: string) => {
    const base = `/t/${slug}/board`;
    return date ? `${base}?date=${date}` : base;
  },
  tenantAdmin: (slug: string) => `/admin/${slug}`,
  tenantAdminBoard: (slug: string) => `/admin/${slug}/board`,
  tenantAdminRentals: (slug: string) => `/admin/${slug}/rentals`,
  tenantAdminVenues: (slug: string) => `/admin/${slug}/venues`,
  tenantAdminMembers: (
    slug: string,
    query?: {
      page?: number;
      pageSize?: number;
      view?: "paginate" | "scroll";
      q?: string;
    },
  ) => {
    const path = `/admin/${slug}/members`;
    if (!query) return path;
    const sp = new URLSearchParams();
    if (query.view === "scroll") sp.set("view", "scroll");
    if (query.page && query.page > 1) sp.set("page", String(query.page));
    if (query.pageSize) sp.set("pageSize", String(query.pageSize));
    if (query.q) sp.set("q", query.q);
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
  },
  tenantAdminStaff: (slug: string) => `/admin/${slug}/staff`,
  tenantAdminSettings: (slug: string) => `/admin/${slug}/settings`,
  tenantAdminActivityNew: (slug: string, type: "open-play" | "course" | "dupr") =>
    `/admin/${slug}/activities/new?type=${type}`,
} as const;

export const ACTIVITY_TYPE_LABELS = {
  OPEN_PLAY: "球敘",
  COURSE: "課程",
  DUPR: "DUPR",
} as const;

/** 管理後台／列表用活動類型標籤 */
export function adminActivityKindLabel(type: string, requiresDupr: boolean) {
  if (requiresDupr) return ACTIVITY_TYPE_LABELS.DUPR;
  return type === "OPEN_PLAY" ? ACTIVITY_TYPE_LABELS.OPEN_PLAY : ACTIVITY_TYPE_LABELS.COURSE;
}

/** 活動類型 Badge 樣式：課程為翠綠、球敘為品牌綠、DUPR 為藍色 */
export function activityKindBadgeVariant(
  type: string,
  requiresDupr: boolean,
): "default" | "success" | "course" | "dupr" {
  if (requiresDupr) return "dupr";
  if (type === "COURSE") return "course";
  if (type === "OPEN_PLAY") return "success";
  return "default";
}
