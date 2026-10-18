import { createHash, timingSafeEqual } from "node:crypto";
import type { StudentCollection } from "./assignments";
import { getStudentProgramValue } from "./programs";

export const STUDENT_COLLECTIONS = ["students", "student", "Students", "Student"] as const;
export const text = (value: unknown) => String(value ?? "").trim();
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const equalSecret = (a: string, b: string) => timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
export function studentIdentity(id: string, collectionName: string, data: Record<string, unknown>) {
  return {
    id, collectionName: collectionName as StudentCollection, studentKey: `${collectionName}:${id}`,
    name: text(data.name || data.studentName || data.student_name || data.이름),
    school: text(data.school || data.schoolName || data.school_name || data.학교),
    grade: text(data.grade || data.studentGrade || data.student_grade || data.학년),
    class: text(data.class || data.studentClass || data.student_class || data.className || data.반 || data.group || data.team),
    studentNumber: text(data.studentNumber || data.number || data.studentNo || data.no || data.번호 || 0),
    program: getStudentProgramValue(data.program), isActive: data.isActive !== false,
  };
}
export const legacyPassword = (data: Record<string, unknown>) => text(data.password || data.studentPassword || data.pw || data.비밀번호);
export const credentialVersion = (data: Record<string, unknown>) => digest(JSON.stringify([
  legacyPassword(data), studentIdentity("", "", data).studentNumber,
  studentIdentity("", "", data).school, text(data.studentSessionVersion),
]));
// An allowlist is intentional: new fields on teacher records never become public automatically.
export function studentProfile(id: string, collection: string, data: Record<string, unknown>) {
  return {
    ...studentIdentity(id, collection, data),
    bronze: Number(data.bronze || data.bronzeCoin || data.동엽전 || 0),
    silver: Number(data.silver || data.silverCoin || data.은엽전 || 0),
    // Existing progress includes book_9, 9-2 and legacy numeric lesson stages.
    // Coercing book IDs to Number produces NaN/null and incorrectly shows book 1.
    stage: typeof data.stage === "string" || (typeof data.stage === "number" && Number.isFinite(data.stage)) ? data.stage : 1,
    character: text(data.character),
    coinHistory: Array.isArray(data.coinHistory) ? data.coinHistory.map((raw: Record<string, unknown>) => {
      const fields = ["id", "date", "type", "source", "currency", "amount", "fromCurrency", "fromAmount", "toCurrency", "toAmount", "text"];
      const row: Record<string, unknown> = {};
      for (const key of fields) if (["string", "number"].includes(typeof raw[key])) row[key] = raw[key];
      const timestamp = raw.createdAt as { seconds?: number } | undefined;
      if (typeof timestamp?.seconds === "number") row.createdAt = { seconds: timestamp.seconds };
      return row;
    }) : [],
  };
}
