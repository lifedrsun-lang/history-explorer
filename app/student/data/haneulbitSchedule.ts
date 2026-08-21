export type ClassProgressStatus = "upcoming" | "in-progress" | "completed";

export type HaneulbitClass = {
  week: number;
  date: string;
  book: number;
  lesson: number;
  title: string;
};

export const HANEULBIT_SCHEDULE: HaneulbitClass[] = [
  { week: 1, date: "2026-08-19", book: 7, lesson: 1, title: "서라벌의 나라, 신라" },
  { week: 2, date: "2026-08-26", book: 7, lesson: 2, title: "삼국을 둘러싼 싸움에서 이기다" },
  { week: 3, date: "2026-09-02", book: 7, lesson: 3, title: "신라가 세 나라를 하나로" },
  { week: 4, date: "2026-09-09", book: 7, lesson: 4, title: "신라 문화·인물탐방" },
  { week: 5, date: "2026-09-16", book: 8, lesson: 1, title: "삼국의 문화가 살아 숨 쉰, 통일신라" },
  { week: 6, date: "2026-09-23", book: 8, lesson: 2, title: "통일신라 문화·인물탐방 (1)" },
  { week: 7, date: "2026-09-30", book: 8, lesson: 3, title: "통일신라의 화려한 전성기" },
  { week: 8, date: "2026-10-07", book: 8, lesson: 4, title: "통일신라 문화·인물탐방 (2)" },
  { week: 9, date: "2026-10-14", book: 9, lesson: 1, title: "흔들리던 신라가 마침내 무너지다" },
  { week: 10, date: "2026-10-21", book: 9, lesson: 2, title: "남북국시대2 문화·인물탐방" },
  { week: 11, date: "2026-10-28", book: 9, lesson: 3, title: "바다 동쪽의 융성한 나라, 발해" },
  { week: 12, date: "2026-11-04", book: 9, lesson: 4, title: "남북국시대2 문화·인물탐방" },
];

const toSeoulDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value || "";

  return `${value("year")}-${value("month")}-${value("day")}`;
};

export const getClassProgressStatus = (
  classDate: string,
  today = new Date()
): ClassProgressStatus => {
  const todayKey = toSeoulDateKey(today);

  if (todayKey < classDate) return "upcoming";
  if (todayKey === classDate) return "in-progress";
  return "completed";
};

export const isClassInCurrentWeek = (classDate: string, today = new Date()) => {
  const todayKey = toSeoulDateKey(today);
  const current = new Date(`${todayKey}T12:00:00Z`);
  const target = new Date(`${classDate}T12:00:00Z`);
  const dayFromMonday = (current.getUTCDay() + 6) % 7;
  const weekStart = new Date(current);
  weekStart.setUTCDate(current.getUTCDate() - dayFromMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  return target >= weekStart && target < weekEnd;
};

export const getSchedulePreview = (today = new Date()) => {
  const completed = HANEULBIT_SCHEDULE.filter(
    (item) => getClassProgressStatus(item.date, today) === "completed"
  ).slice(-1);
  const current = HANEULBIT_SCHEDULE.filter(
    (item) => getClassProgressStatus(item.date, today) === "in-progress"
  );
  const next = HANEULBIT_SCHEDULE.filter(
    (item) => getClassProgressStatus(item.date, today) === "upcoming"
  ).slice(0, 1);

  return [...new Map([...completed, ...current, ...next].map((item) => [item.week, item])).values()];
};
