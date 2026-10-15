import type { PresentationCategory } from "@/lib/presentations/catalog";

export const PRESENTATION_CARD_SCHOOL_DOCUMENT_TYPE = "cardSchool";

export function getPresentationSchoolCardId(
  category: PresentationCategory,
  cardKey: string
) {
  return `named:${category}:card:${cardKey}`;
}

export function getPresentationCardSchoolDocumentId(cardId: string) {
  return `__card_school__--${encodeURIComponent(cardId)}`;
}

export function readPresentationCardSchool(data: Record<string, unknown>) {
  if (data.documentType !== PRESENTATION_CARD_SCHOOL_DOCUMENT_TYPE) return null;
  const cardId = typeof data.cardId === "string" ? data.cardId.trim() : "";
  const schoolName = typeof data.schoolName === "string" ? data.schoolName.trim() : "";
  return cardId ? { cardId, schoolName } : null;
}
