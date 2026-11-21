import { FieldValue } from "firebase-admin/firestore";
import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getAfterSchoolClass, getAfterSchoolSchool, matchesAfterSchoolSchool } from "@/lib/afterSchool";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getEnrollmentStatus } from "@/lib/studentEnrollment";

export const CARD_COLLECTION = "sunlab_history_card_decks";
export const AWARD_COLLECTION = "sunlab_history_card_awards";
export type CardWeek = 1 | 2 | 3 | 4;
export type CardMode = 2 | 4;
export type CardWeeks = Record<"1" | "2" | "3" | "4", string[]>;

export class HistoryCardError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "HistoryCardError";
  }
}

export const blankCardWeeks = (): CardWeeks => ({ "1": [], "2": [], "3": [], "4": [] });
export const cardBook = (value: unknown): number => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 23) {
    throw new HistoryCardError("교재 호수는 01~23호에서 선택해 주세요.");
  }
  return number;
};
export const cardWeek = (value: unknown): CardWeek => {
  const number = Number(value);
  if (![1, 2, 3, 4].includes(number)) throw new HistoryCardError("1~4주차만 등록할 수 있습니다.");
  return number as CardWeek;
};
export const cardMode = (value: unknown): CardMode => {
  const number = Number(value);
  if (number !== 2 && number !== 4) throw new HistoryCardError("2주차 또는 4주차를 선택해 주세요.");
  return number as CardMode;
};
export const cardWords = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length > 40) throw new HistoryCardError("주차별 키워드는 최대 40개입니다.");
  const words: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !item.trim() || item.trim().length > 50) {
      throw new HistoryCardError("키워드는 한 줄에 1개, 50자 이하로 입력해 주세요.");
    }
    const word = item.trim();
    if (!words.includes(word)) words.push(word);
  }
  return words;
};
export const normalizeCardWeeks = (value: unknown): CardWeeks => {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    "1": Array.isArray(record["1"]) ? cardWords(record["1"]) : [],
    "2": Array.isArray(record["2"]) ? cardWords(record["2"]) : [],
    "3": Array.isArray(record["3"]) ? cardWords(record["3"]) : [],
    "4": Array.isArray(record["4"]) ? cardWords(record["4"]) : [],
  };
};
export const wordsForMode = (weeks: CardWeeks, mode: CardMode): string[] =>
  Array.from(new Set(
    Array.from({ length: mode }, (_, index) => weeks[String(index + 1) as keyof CardWeeks]).flat()
  ));

export async function authorizeHistoryCards(request: Request) {
  const user = await verifyTeacherRequest(request);
  if (user.firebase?.sign_in_provider !== "password" || user.role === "student" || user.student === true) {
    throw new HistoryCardError("교사 관리자 로그인이 필요합니다.", 401);
  }
  return user;
}
export function cardSchool(value: unknown) {
  const school = getAfterSchoolSchool(String(value || ""));
  if (!school) throw new HistoryCardError("학교를 다시 선택해 주세요.");
  return school;
}
export function cardClass(value: unknown): "A반" | "B반" {
  if (value !== "A반" && value !== "B반") throw new HistoryCardError("A반 또는 B반을 선택해 주세요.");
  return value;
}
export function isCardStudent(data: Record<string, unknown>, schoolSlug: string, className: "A반" | "B반") {
  const school = cardSchool(schoolSlug);
  return matchesAfterSchoolSchool(data.school, school) &&
    getAfterSchoolClass(data) === className &&
    getEnrollmentStatus(data) === "active";
}
export function cardDeckId(uid: string, bookNumber: number) {
  return uid + "_book_" + String(bookNumber).padStart(2, "0");
}
export async function loadCardWeeks(uid: string, bookNumber: number): Promise<CardWeeks> {
  const { db } = getFirebaseAdmin();
  const document = await db.collection(CARD_COLLECTION).doc(cardDeckId(uid, bookNumber)).get();
  return normalizeCardWeeks(document.data()?.weeks);
}
export function cardFailure(error: unknown) {
  if (error instanceof HistoryCardError) {
    return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  }
  const message = error instanceof Error ? error.message : "";
  if (message === "teacher_auth_required" || message.startsWith("auth/")) {
    return Response.json({ error: "교사 로그인이 필요합니다." }, { status: 401 });
  }
  console.error("history-card request failed", message || "unknown");
  return Response.json({ error: "카드 게임 연결을 확인해 주세요." }, { status: 503 });
}
export function cardJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}
export async function cardBody(request: Request): Promise<Record<string, unknown>> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new HistoryCardError("허용되지 않은 요청입니다.", 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new HistoryCardError("요청 형식을 확인해 주세요.");
  }
  const text = await request.text();
  if (text.length > 20000) throw new HistoryCardError("입력 데이터가 너무 큽니다.");
  try {
    const value: unknown = JSON.parse(text);
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new HistoryCardError("입력 내용을 확인해 주세요.");
  }
}
export { FieldValue };
