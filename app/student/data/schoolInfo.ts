export type SchoolClassTime = {
  label: "A반" | "B반";
  semester: string;
  vacation: string;
};

export type SchoolNoticeInfo = {
  title: string;
  location: string;
  period?: string;
  breakNotice?: string;
  noBreakNotice?: string;
  classTimes: SchoolClassTime[];
};

export type SchoolInfo = {
  name: string;
  displayName: string;
  aliases?: string[];
  password?: string;
  loginCard: {
    title: string;
    location: string;
  };
  notice?: SchoolNoticeInfo;
  hideRanking?: boolean;
};

export const CULTURE_CENTER_LABEL = "문화센터";

export const CULTURE_CENTER_SCHOOLS = [
  "홈플러스 문화센터",
  "이마트 문화센터",
];

export const STUDENT_SCHOOL_INFOS: SchoolInfo[] = [
  {
    name: "김포 하늘빛초",
    displayName: "김포 하늘빛초",
    password: "0527",
    loginCard: {
      title: "김포 하늘빛초",
      location: "2F 컴퓨터실",
    },
    notice: {
      title: "2분기 수업 안내",
      location: "2F 컴퓨터실",
      period: "5/26~8/14",
      noBreakNotice: "방학 기간 내 휴강 없음",
      classTimes: [
        {
          label: "A반",
          semester: "13:50~14:50",
          vacation: "09:30~10:30",
        },
        {
          label: "B반",
          semester: "15:00~16:20",
          vacation: "10:40~12:00",
        },
      ],
    },
  },
  {
    name: "화성 새솔초",
    displayName: "화성 새솔초",
    password: "0602",
    loginCard: {
      title: "화성 새솔초",
      location: "5F 음악실",
    },
    notice: {
      title: "2분기 수업 안내",
      location: "5F 음악실",
      period: "6/1~8/28",
      breakNotice: "7/27~7/31 휴강",
      classTimes: [
        {
          label: "A반",
          semester: "13:50~15:00",
          vacation: "09:20~11:30",
        },
        {
          label: "B반",
          semester: "15:10~16:20",
          vacation: "10:40~11:50",
        },
      ],
    },
  },
  {
    name: "김포 사우초",
    displayName: "김포 사우초",
    password: "0605",
    loginCard: {
      title: "김포 사우초",
      location: "4F 특기적성2실",
    },
    notice: {
      title: "2분기 수업 안내",
      location: "4F 특기적성2실",
      period: "6/1~8/28",
      breakNotice: "7/27~7/31 휴강",
      classTimes: [
        {
          label: "A반",
          semester: "13:50~15:10",
          vacation: "09:30~10:50",
        },
        {
          label: "B반",
          semester: "15:20~16:40",
          vacation: "11:00~12:20",
        },
      ],
    },
  },
  {
    name: CULTURE_CENTER_LABEL,
    displayName: CULTURE_CENTER_LABEL,
    aliases: CULTURE_CENTER_SCHOOLS,
    password: "0607",
    loginCard: {
      title: CULTURE_CENTER_LABEL,
      location: "문화센터 강의실",
    },
    notice: {
      title: "수업 안내",
      location: "문화센터 강의실",
      classTimes: [],
    },
    hideRanking: true,
  },
];

export const normalizeSchoolText = (value: any) => {
  return String(value || "")
    .replace(/\s/g, "")
    .replace(/초등학교/g, "초")
    .replace(/초등/g, "초")
    .replace(/[()]/g, "")
    .trim();
};

export const isCultureCenterSchool = (school: string) => {
  const target = normalizeSchoolText(school);

  if (target === normalizeSchoolText(CULTURE_CENTER_LABEL)) {
    return true;
  }

  return CULTURE_CENTER_SCHOOLS.some(
    (cultureSchool) =>
      normalizeSchoolText(cultureSchool) === target
  );
};

export const getSchoolInfo = (school: string) => {
  const target = normalizeSchoolText(school);

  return STUDENT_SCHOOL_INFOS.find((schoolInfo) => {
    if (
      normalizeSchoolText(schoolInfo.name) === target ||
      normalizeSchoolText(schoolInfo.displayName) === target
    ) {
      return true;
    }

    return schoolInfo.aliases?.some(
      (alias) => normalizeSchoolText(alias) === target
    );
  });
};

export const getSchoolDisplayName = (school: string) => {
  const schoolInfo = getSchoolInfo(school);

  return schoolInfo?.displayName || school;
};

export const getSchoolPassword = (school: string) => {
  return getSchoolInfo(school)?.password;
};

export const getSchoolLoginCard = (school: string) => {
  const schoolInfo = getSchoolInfo(school);

  return (
    schoolInfo?.loginCard || {
      title: school,
      location: "수업 장소",
    }
  );
};

export const getSchoolNotice = (school: string) => {
  return getSchoolInfo(school)?.notice || null;
};

export const shouldHideRankingForSchool = (school: string) => {
  return Boolean(getSchoolInfo(school)?.hideRanking);
};

export const getDefaultSchoolDisplayNames = () => {
  return STUDENT_SCHOOL_INFOS.map(
    (schoolInfo) => schoolInfo.displayName
  );
};
