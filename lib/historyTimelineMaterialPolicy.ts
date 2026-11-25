export const TIMELINE_MATERIALS = [
  { key: "people", label: "인물카드" },
  { key: "elementary", label: "별별한국사 · 초등" },
  { key: "basic", label: "별별한국사 · 기본" },
  { key: "advanced", label: "별별한국사 · 심화" },
  { key: "yong", label: "용선생 교과서 한국사" },
  { key: "robin", label: "로빈의 한국사" },
  { key: "reading", label: "한국사 읽기책" },
  { key: "exam-basic", label: "한능검 · 기본" },
  { key: "exam-advanced", label: "한능검 · 심화" },
  { key: "heritage", label: "문화유산 현장 해설" },
] as const;
export type TimelineMaterialKey = typeof TIMELINE_MATERIALS[number]["key"];
export type TimelineEdition = "byeolkkum" | "integrated";
export type TimelineMaterialAccess = Record<TimelineMaterialKey, boolean>;
export type TimelineMaterialSettings = Record<TimelineEdition, TimelineMaterialAccess>;
export const EDITIONS = ["byeolkkum", "integrated"] as const;
export function defaultTimelineMaterialAccess(edition: TimelineEdition): TimelineMaterialAccess {
  return Object.fromEntries(TIMELINE_MATERIALS.map(({key}) => [key, edition === "integrated"])) as TimelineMaterialAccess;
}
export function normalizeTimelineMaterialSettings(input: unknown): TimelineMaterialSettings {
  const source = (input && typeof input === "object" ? input : {}) as Partial<Record<TimelineEdition, Partial<TimelineMaterialAccess>>>;
  return Object.fromEntries(EDITIONS.map(edition => {
    const defaults = defaultTimelineMaterialAccess(edition);
    return [edition, Object.fromEntries(TIMELINE_MATERIALS.map(({key}) => [key, typeof source[edition]?.[key] === "boolean" ? source[edition]![key] : defaults[key]]))];
  })) as TimelineMaterialSettings;
}
export function isCompleteTimelineMaterialSettings(input: unknown): input is TimelineMaterialSettings {
  if (!input || typeof input !== "object") return false;
  const value = input as Partial<TimelineMaterialSettings>;
  return EDITIONS.every(edition => value[edition] && TIMELINE_MATERIALS.every(({key}) => typeof value[edition]?.[key] === "boolean"));
}
export function filterTimelineMaterialRecords<T>(records: Record<string,T[]> | undefined, allowed: (entry:T)=>boolean, eventIds?: Set<string>): Record<string,T[]> {
  return Object.fromEntries(Object.entries(records ?? {}).filter(([id]) => !eventIds || eventIds.has(id))
    .map(([id, entries]) => [id, entries.filter(allowed)] as const).filter(([, entries])=>entries.length > 0));
}
