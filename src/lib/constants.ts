export const APP_NAME = "PlayPlayPlay";
export const APP_TAGLINE = "匹克球多場館預約平台";

/** 平台預設對外營運的租戶（seed 建立） */
export const DEFAULT_TENANT_SLUG = "active-pickleball";
export const DEFAULT_TENANT_NAME = "Active Pickleball Club";

export const ROUTES = {
  home: "/",
  me: "/me",
  meBookings: "/me/bookings",
  meInbox: "/me/inbox",
  meDupr: "/me/dupr",
  meProfile: "/me/profile",
  meNotifications: "/me/notifications",
  platformAdmin: "/platform/tenants",
  tenant: (slug: string) => `/t/${slug}`,
  tenantAccess: (slug: string) => `/t/${slug}/access`,
  tenantAbout: (slug: string) => `/t/${slug}/about`,
  tenantActivities: (slug: string, type?: "open-play" | "course" | "dupr") =>
    type ? `/t/${slug}/activities?type=${type}` : `/t/${slug}/activities`,
  tenantActivity: (slug: string, id: string) => `/t/${slug}/activities/${id}`,
  tenantRentals: (slug: string) => `/t/${slug}/rentals`,
  tenantAdmin: (slug: string) => `/admin/${slug}`,
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
