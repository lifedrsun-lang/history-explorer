export type PowerPointBookSource = {
  bookNumber: number;
  label: string;
  url: string;
};

export type PowerPointPresentationSource = {
  url: string;
  startPage: number;
};

const powerPointBookSources: PowerPointBookSource[] = [
  {
    bookNumber: 6,
    label: "6호 통합 PowerPoint",
    url: "https://1drv.ms/p/c/bcc43c5a7c759aaf/IQC5eyL-vOv5Q5GNUmtUwEB-ATUQZJw6pIhBea_ja2cx4jE?e=lQL6bH",
  },
];

export function listPowerPointBookSources() {
  return powerPointBookSources;
}

export function getPowerPointBookSource(bookNumber: string) {
  const match = bookNumber.match(/\d+/);
  const parsedBookNumber = match ? Number(match[0]) : null;

  if (parsedBookNumber === null) {
    return null;
  }

  return (
    powerPointBookSources.find(
      (source) => source.bookNumber === parsedBookNumber
    ) ?? null
  );
}

// Legacy lesson-level lookup is intentionally disabled.
// PowerPoint files are managed once per book, not once per lesson.
export function getPowerPointPresentationSource(
  _bookNumber: string,
  _lessonNumber: string
): PowerPointPresentationSource | null {
  return null;
}
