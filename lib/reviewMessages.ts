import { HISTORY_BOOKS, WORLD_CULTURE_BOOKS } from "@/lib/presentations/catalog";

export const REVIEW_BOOKS = [
  ...HISTORY_BOOKS.map(book => ({ id: "history_" + book.number, subject: "별꼼역사", label: book.number + "호 · " + book.shortTitle })),
  ...WORLD_CULTURE_BOOKS.map(book => ({ id: "world_" + book.series + "_" + book.number, subject: "모나르떼", label: book.seriesLabel + " " + book.number + "호" })),
];
export const REVIEW_LESSONS = [1, 2, 3, 4] as const;
export const REVIEW_MAX_LENGTH = 3000;
export type ReviewMessage = { bookId: string; lesson: number; message: string; revision: number; updatedAt: string };
export function reviewKey(bookId: string, lesson: number) { return bookId + ":" + lesson; }
export function validReviewSlot(bookId: unknown, lesson: unknown) {
  return typeof bookId === "string" && REVIEW_BOOKS.some(book => book.id === bookId)
    && typeof lesson === "number" && Number.isInteger(lesson) && lesson >= 1 && lesson <= 4;
}
