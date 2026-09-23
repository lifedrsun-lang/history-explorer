import {
  normalizeCardDisplayName,
  normalizeCardKey,
  type PresentationCategory,
} from "@/lib/presentations/catalog";

export const PRESENTATION_CARDS_COLLECTION = "presentations";
export const PRESENTATION_CARD_METADATA_DOCUMENT_TYPE = "cardMetadata";

export type BoardgameCategory = "teaching_boardgame" | "boardgame";

export type BoardgameCardMetadata = {
  category: BoardgameCategory;
  cardKey: string;
  cardName: string;
  brandName: string;
  coverImageDataUrl: string;
};

export function isBoardgameCategory(
  category: PresentationCategory
): category is BoardgameCategory {
  return category === "teaching_boardgame" || category === "boardgame";
}

export function normalizeBrandName(value: unknown) {
  return String(value ?? "").trim();
}

export function getPresentationCardIdentityKey(cardName: unknown, brandName: unknown) {
  const nameKey = normalizeCardKey(cardName);
  const brandKey = normalizeCardKey(brandName);
  return brandKey ? `${nameKey}::brand:${brandKey}` : nameKey;
}

export function getPresentationCardMetadataId(
  category: BoardgameCategory,
  cardKey: string
) {
  return `__card_metadata__--${category}--${encodeURIComponent(cardKey)}`;
}

export function getBoardgameCardMetadata(
  value: Record<string, unknown>
): BoardgameCardMetadata | null {
  if (value.documentType !== PRESENTATION_CARD_METADATA_DOCUMENT_TYPE) return null;

  const category = value.category;
  const cardKey = String(value.cardKey ?? "").trim();
  if (
    (category !== "teaching_boardgame" && category !== "boardgame") ||
    !cardKey
  ) {
    return null;
  }

  const coverImageDataUrl = String(value.coverImageDataUrl ?? "").trim();

  return {
    category,
    cardKey,
    cardName: normalizeCardDisplayName(value.cardName),
    brandName: normalizeBrandName(value.brandName),
    coverImageDataUrl: coverImageDataUrl.startsWith("data:image/")
      ? coverImageDataUrl
      : "",
  };
}

export function getBoardgameCardMetadataMapKey(
  category: BoardgameCategory,
  cardKey: string
) {
  return `${category}:${cardKey}`;
}
