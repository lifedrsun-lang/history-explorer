// 교재 추가는 여기에서만 진행합니다. 최초 화면은 우리나라 2권만 노출합니다.
// 실제 지문/문항/정답 및 학습 데이터는 아직 등록하지 않습니다.
export const DAILY_READING_DAY_COUNT = 29;

export type DailyReadingBook = {
  id: string;
  title: string;
  icon: string;
};

export type DailyReadingSeries = {
  id: string;
  title: string;
  books: DailyReadingBook[];
};

export const DAILY_READING_SERIES: DailyReadingSeries[] = [
  {
    id: "our-country",
    title: "우리나라",
    books: [
      { id: "treasure", title: "보물", icon: "💎" },
      { id: "folktales", title: "전래동화", icon: "📖" },
    ],
  },
];
