/** 將字串轉為 URL／資料庫用的 slug（小寫英數與連字號） */
export function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** 場館 slug：優先使用英文名稱，否則從場館名稱推導，仍無則產生唯一後綴 */
export function venueSlugFromInputs(englishName: string, displayName: string): string {
  const fromEnglish = toSlug(englishName);
  if (fromEnglish) return fromEnglish;

  const fromName = toSlug(displayName);
  if (fromName) return fromName;

  return `venue-${Date.now().toString(36)}`;
}
