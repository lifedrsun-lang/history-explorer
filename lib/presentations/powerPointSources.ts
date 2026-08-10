export type PowerPointPresentationSource = {
  url: string;
  startPage: number;
};

const BOOK_6_POWERPOINT_URL =
  "https://1drv.ms/p/c/bcc43c5a7c759aaf/IQC5eyL-vOv5Q5GNUmtUwEB-ATUQZJw6pIhBea_ja2cx4jE?e=lQL6bH";

const BOOK_6_START_PAGES: Record<number, number> = {
  1: 1,
  2: 56,
  3: 111,
  4: 201,
};

function firstNumber(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function getPowerPointPresentationSource(
  bookNumber: string,
  lessonNumber: string
): PowerPointPresentationSource | null {
  const book = firstNumber(bookNumber);
  const lesson = firstNumber(lessonNumber);

  if (book !== 6 || lesson === null) {
    return null;
  }

  const startPage = BOOK_6_START_PAGES[lesson];

  if (!startPage) {
    return null;
  }

  return {
    url: BOOK_6_POWERPOINT_URL,
    startPage,
  };
}
