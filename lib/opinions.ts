export const OPINION_PATH = "/opinion";
export const DEFAULT_OPINION_TOPIC = "나의 개인정보 보호 수칙";
export const DEFAULT_OPINION_INSTRUCTION = "AI를 사용할 때 개인정보를 보호하기 위해 지켜야 할 수칙을 한 문장으로 작성해 보세요.";
export type Opinion = { id: string; text: string; createdAt: string };
export type OpinionState = {
  topic: string; instruction: string; active: boolean; round: string | null;
  revision: number; participantCount: number; opinions: Opinion[];
};
export type StudentOpinionState = Omit<OpinionState, "opinions" | "participantCount"> & {
  submitted: boolean; opinion: Opinion | null;
};
export function cleanOpinion(value: unknown) {
  if (typeof value !== "string") throw new Error("invalid_text");
  const text = value.trim();
  if (!text || Array.from(text).length > 60) throw new Error("invalid_text");
  return text;
}

export const OPINION_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type OpinionSlot = (typeof OPINION_SLOTS)[number];
export function opinionSlot(value: unknown): OpinionSlot {
  if (value == null) return 1;
  const slot = OPINION_SLOTS.find(number => value === number || value === String(number));
  if (slot === undefined) throw new Error("invalid_slot");
  return slot;
}
export function opinionPath(slot: OpinionSlot) {
  return slot === 1 ? OPINION_PATH : OPINION_PATH + "/" + slot;
}
