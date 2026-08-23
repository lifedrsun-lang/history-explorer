export type PresentationCategory = "history" | "coding";

export type BookCatalogEntry = {
  number: number;
  shortTitle: string;
  title: string;
  coverUrl?: string;
};

export const HISTORY_BOOKS: BookCatalogEntry[] = [
  { number: 1, shortTitle: "고조선1", title: "처음으로 세운 나라", coverUrl: "/covers/01.jpg" },
  { number: 2, shortTitle: "고조선2", title: "고조선의 뒤를 이은 나라들", coverUrl: "/covers/02.jpg" },
  { number: 3, shortTitle: "고구려1", title: "광활한 영토에 우뚝 선", coverUrl: "/covers/03.jpg" },
  { number: 4, shortTitle: "고구려2", title: "700년 역사의 끝", coverUrl: "/covers/04.jpg" },
  { number: 5, shortTitle: "백제1", title: "찬란한 문화를 꽃 피운", coverUrl: "/covers/05.jpg" },
  { number: 6, shortTitle: "백제2", title: "꺼져가는 불꽃", coverUrl: "/covers/06.jpg" },
  { number: 7, shortTitle: "신라", title: "황금의 나라", coverUrl: "/covers/07.jpg" },
  { number: 8, shortTitle: "남북국시대1", title: "통일 신라와 발해가 여는", coverUrl: "/covers/08.jpg" },
  { number: 9, shortTitle: "남북국시대2", title: "무너진 신라와 새로운 나라 발해", coverUrl: "/covers/09.jpg" },
  { number: 10, shortTitle: "고려1", title: "고구려의 뒤를 이은", coverUrl: "/covers/10.jpg" },
  { number: 11, shortTitle: "고려2", title: "전쟁을 이겨낸 백성들", coverUrl: "/covers/11.jpg" },
  { number: 12, shortTitle: "고려3", title: "흔들리는 고려", coverUrl: "/covers/12.jpg" },
  { number: 13, shortTitle: "고려4", title: "외적과 맞서 싸운", coverUrl: "/covers/13.jpg" },
  { number: 14, shortTitle: "조선1", title: "선비의 나라", coverUrl: "/covers/14.jpg" },
  { number: 15, shortTitle: "조선2", title: "위대한 세종과 한글", coverUrl: "/covers/15.jpg" },
  { number: 16, shortTitle: "조선3", title: "새로운 정치를 꿈꾸는", coverUrl: "/covers/16.png" },
  { number: 17, shortTitle: "조선4", title: "전쟁이 휘몰아친", coverUrl: "/covers/17.png" },
  { number: 18, shortTitle: "조선5", title: "전쟁의 상처를 딛고 내일을 향해", coverUrl: "/covers/18.png" },
  { number: 19, shortTitle: "조선6", title: "백성을 위한 풍요로운 세상", coverUrl: "/covers/19.png" },
];

const HISTORY_BOOK_MAP = new Map(HISTORY_BOOKS.map((book) => [book.number, book]));

export function getNumber(value: unknown) {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

export function getLessonNumber(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "");
    const match = text.match(/(?:^|\D)([1-4])\s*차시(?:\D|$)/);
    if (match) return Number(match[1]);
  }
  return null;
}

export function getHistoryBook(bookNumber: unknown) {
  return HISTORY_BOOK_MAP.get(getNumber(bookNumber));
}

export function normalizeBookKey(category: PresentationCategory, bookNumber: unknown) {
  const number = getNumber(bookNumber);
  if (number !== Number.MAX_SAFE_INTEGER) return `${category}:${number}`;
  return `${category}:${String(bookNumber ?? "").trim().toLocaleLowerCase("ko")}`;
}

