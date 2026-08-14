export type CoinExchangeWindowStatus = {
  configured: boolean;
  isOpen: boolean;
  openDate: string | null;
  closeDate: string | null;
  termEndDate: string | null;
  message: string;
};

const SEOUL_TIME_ZONE = "Asia/Seoul";
const EXCHANGE_OPEN_DAYS_BEFORE_END = 14;

const SCHOOL_TERM_END_DATES: Record<string, string> = {
  화성새솔초: "2026-08-28",
  김포사우초: "2026-08-28",
};

const normalizeSchool = (value: unknown) =>
  String(value || "")
    .replace(/\s/g, "")
    .replace(/초등학교/g, "초")
    .replace(/초등/g, "초")
    .trim();

const formatSeoulDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const subtractDays = (dateText: string, days: number) => {
  const date = new Date(`${dateText}T00:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() - days);
  return formatSeoulDate(date);
};

export const getCoinExchangeWindowStatus = (
  school: unknown,
  now = new Date()
): CoinExchangeWindowStatus => {
  const normalizedSchool = normalizeSchool(school);
  const termEndDate = SCHOOL_TERM_END_DATES[normalizedSchool] || null;

  if (!termEndDate) {
    return {
      configured: false,
      isOpen: false,
      openDate: null,
      closeDate: null,
      termEndDate: null,
      message:
        "현재 은엽전 교환 신청 기간이 아닙니다. 교환 신청은 종강 2주 전부터 종강 전날까지 열립니다.",
    };
  }

  const openDate = subtractDays(termEndDate, EXCHANGE_OPEN_DAYS_BEFORE_END);
  const today = formatSeoulDate(now);
  const isOpen = today >= openDate && today < termEndDate;

  return {
    configured: true,
    isOpen,
    openDate,
    closeDate: termEndDate,
    termEndDate,
    message: isOpen
      ? `은엽전 교환 신청 기간입니다. ${openDate}부터 ${termEndDate} 전날까지 신청할 수 있어요.`
      : today < openDate
        ? `은엽전 교환은 ${openDate}부터 신청할 수 있어요.`
        : "이번 분기 은엽전 교환 신청이 마감되었습니다.",
  };
};
