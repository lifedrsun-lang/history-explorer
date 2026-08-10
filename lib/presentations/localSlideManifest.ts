export type LocalSlideManifestItem = {
  key: string;
  slides: string[];
};

export const localSlideManifest: Record<string, LocalSlideManifestItem> = {
  "6-3": {
    key: "6-3",
    slides: Array.from(
      { length: 100 },
      (_, index) => `/presentations/6-3/슬라이드${index + 111}.PNG`
    ),
  },
};

export function createPresentationFolderKey(
  bookNumber: string,
  lessonNumber: string
) {
  const bookMatch = bookNumber.match(/\d+/);
  const lessonMatch = lessonNumber.match(/\d+/);

  if (!bookMatch || !lessonMatch) {
    return "";
  }

  return `${Number(bookMatch[0])}-${Number(lessonMatch[0])}`;
}

export function getLocalSlidesForPresentation(
  bookNumber: string,
  lessonNumber: string
) {
  const key = createPresentationFolderKey(bookNumber, lessonNumber);

  return localSlideManifest[key]?.slides ?? [];
}
