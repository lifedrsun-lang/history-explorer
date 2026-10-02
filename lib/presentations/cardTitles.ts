import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Display titles must never replace the keys or names used to group materials.
export const PRESENTATION_CARD_TITLE_DOCUMENT_TYPE = "cardTitle";

export function getPresentationCardTitleId(cardId: string) {
  return `__card_title__--${encodeURIComponent(cardId)}`;
}

export function readPresentationCardTitle(data: Record<string, unknown>) {
  if (data.documentType !== PRESENTATION_CARD_TITLE_DOCUMENT_TYPE) return null;
  const cardId = typeof data.cardId === "string" ? data.cardId : "";
  const title = typeof data.title === "string" ? data.title.trim() : "";
  return cardId && title ? { cardId, title } : null;
}

export async function savePresentationCardTitle(cardId: string, value: string) {
  const title = value.trim();
  if (!title) throw new Error("카드 이름을 입력해 주세요.");
  const reference = doc(db, "presentations", getPresentationCardTitleId(cardId));
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference);
    if (existing.exists()) transaction.update(reference, { title });
    else transaction.set(reference, {
      documentType: PRESENTATION_CARD_TITLE_DOCUMENT_TYPE,
      cardId, title, createdAt: serverTimestamp(),
    });
  });
  return title;
}
