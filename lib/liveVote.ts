import { voteImagePathFromUrl } from "@/lib/liveVoteImages";
export type VoteChoice = 1 | 2;
export type VoteSlot = 1 | 2 | 3;
export type VoteItem = { id: string; imageUrl: string };
export type VoteSettings = { title: string; question: string; option1: string; option2: string; items: VoteItem[] };
export type VoteView = VoteSettings & { slot: VoteSlot; active: boolean; generation: string; counts: [number, number]; countsByItem: Record<string, [number, number]>; revision: number };
export const DEFAULT_ITEMS: VoteItem[] = [{ id: "1", imageUrl: "" }];
export const EMPTY_VOTE: VoteView = { slot: 1, title: "", question: "", option1: "1번", option2: "2번", items: DEFAULT_ITEMS, active: false, generation: "", counts: [0, 0], countsByItem: { "1": [0, 0] }, revision: 0 };
export class VoteError extends Error { constructor(message: string, public status = 400, public code = "invalid_input") { super(message); } }
export function voteSlot(value: unknown): VoteSlot {
  const slot = value == null ? 1 : Number(value);
  if (!Number.isInteger(slot) || slot < 1 || slot > 3) throw new VoteError("투표 번호를 확인해주세요.");
  return slot as VoteSlot;
}
export function validateVoteSettings(input: Record<string, unknown>): VoteSettings {
  const text = (key: string, label: string, max: number) => {
    const value = input[key];
    if (typeof value !== "string" || !value.trim() || value.length > max) throw new VoteError(label + "을 확인해주세요.");
    return value.trim();
  };
  const raw = input.items === undefined ? DEFAULT_ITEMS : input.items;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 8) throw new VoteError("투표 문항은 1~8개까지 등록할 수 있습니다.");
  const items = raw.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new VoteError("사진 문항을 확인해주세요.");
    const imageUrl = (entry as Record<string, unknown>).imageUrl;
    if (typeof imageUrl !== "string" || imageUrl.length > 1200) throw new VoteError("사진 주소를 확인해주세요.");
    if (imageUrl && !voteImagePathFromUrl(imageUrl)) {
      try {
        const url = new URL(imageUrl);
        if (url.protocol !== "https:" || url.hostname !== "firebasestorage.googleapis.com" ||
          !url.pathname.startsWith("/v0/b/history-quest-b8e96.firebasestorage.app/o/") ||
          !decodeURIComponent(url.pathname).includes("sunlab-vote/")) throw new Error("invalid");
      } catch { throw new VoteError("등록되지 않은 사진 주소입니다."); }
    }
    return { id: String(index + 1), imageUrl };
  });
  return { title: text("title", "제목", 120), question: text("question", "질문", 2000), option1: text("option1", "1번 선택지", 200), option2: text("option2", "2번 선택지", 200), items };
}

