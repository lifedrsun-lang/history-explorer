/** Shared, backward-compatible question and comparison-table helpers. */
export type DiscussionQuestion = {
  id: string;
  text: string;
  type?: "text" | "table";
  columns?: string[];
  rows?: string[];
};
export const isTableQuestion = (q: DiscussionQuestion): boolean =>
  q.type === "table" && Array.isArray(q.columns) && Array.isArray(q.rows);
export const rowSlot = (q: DiscussionQuestion, index: number) => q.id + ":row:" + index;
export const opinionSlots = (q: DiscussionQuestion): string[] =>
  isTableQuestion(q) ? (q.rows || []).map((_, index) => rowSlot(q, index)) : [q.id];
export const readTableCells = (raw: string | undefined, columnCount: number): string[] => {
  if (!raw) return Array(columnCount).fill("");
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value) && value.length === columnCount && value.every(v => typeof v === "string")) {
      return value;
    }
  } catch { /* Old/malformed content is treated as an empty row. */ }
  return Array(columnCount).fill("");
};
export const formatOpinion = (q: DiscussionQuestion, slot: string, raw: string): string => {
  if (!isTableQuestion(q)) return raw;
  const index = opinionSlots(q).indexOf(slot);
  if (index < 0) return "";
  const cells = readTableCells(raw, q.columns!.length);
  return q.columns!.map((col, i) => col + ": " + cells[i]).join(" / ");
};
