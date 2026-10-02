export type RecentMaterial = { cardKey: string; openedAt: number };
export const RECENT_MATERIAL_LIMIT = 4;

/** Current cards supply titles/content; missing cards never become stale shortcuts. */
export function getRecentMaterials<T>(items: T[], recentKeys: string[], getKey: (item: T) => string): T[] {
  const byKey = new Map(items.map((item) => [getKey(item), item]));
  const seen = new Set<string>();
  const result: T[] = [];
  for (const key of recentKeys) {
    const item = byKey.get(key);
    if (item === undefined || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length === RECENT_MATERIAL_LIMIT) break;
  }
  return result;
}
