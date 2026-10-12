export type VoteChoice = 1 | 2;
export type VoteSettings = { title: string; question: string; option1: string; option2: string };
export type VoteView = VoteSettings & { active: boolean; generation: string; counts: [number, number]; revision: number };
export const EMPTY_VOTE: VoteView = { title: "", question: "", option1: "1번", option2: "2번", active: false, generation: "", counts: [0, 0], revision: 0 };
export class VoteError extends Error {
  constructor(message: string, public status = 400, public code = "invalid_input") { super(message); }
}
export function validateVoteSettings(input: Record<string, unknown>): VoteSettings {
  const text = (key: string, label: string, max: number) => {
    const value = input[key];
    if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw new VoteError(`${label}을 확인해주세요.`);
    return value.trim();
  };
  return { title: text("title", "제목", 120), question: text("question", "질문", 2000), option1: text("option1", "1번 선택지", 200), option2: text("option2", "2번 선택지", 200) };
}
