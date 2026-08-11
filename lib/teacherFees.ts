export type TeachingClass = "A반" | "B반";
export type FeeClassFilter = "전체반" | TeachingClass;

export type TeacherFeeContract = {
  schoolName: string;
  teachingClass: TeachingClass;
  classLabel: string;
  ratePerStudent: number;
};

type TeacherFeeSchoolConfig = {
  schoolName: string;
  aliases: string[];
  classes: Record<
    TeachingClass,
    {
      classLabel: string;
      ratePerStudent: number;
    }
  >;
};

export const FEE_CLASS_FILTER_OPTIONS: FeeClassFilter[] = [
  "전체반",
  "A반",
  "B반",
];

const TEACHER_FEE_SCHOOLS: TeacherFeeSchoolConfig[] = [
  {
    schoolName: "김포 하늘빛초",
    aliases: ["김포 하늘빛초", "하늘빛초", "하늘빛초등학교"],
    classes: {
      A반: {
        classLabel: "역사탐험A",
        ratePerStudent: 18000,
      },
      B반: {
        classLabel: "역사탐험B",
        ratePerStudent: 22411,
      },
    },
  },
  {
    schoolName: "화성 새솔초",
    aliases: ["화성 새솔초", "새솔초", "새솔초등학교"],
    classes: {
      A반: {
        classLabel: "역사탐구/역사논술",
        ratePerStudent: 21520,
      },
      B반: {
        classLabel: "역사탐구/역사논술",
        ratePerStudent: 21520,
      },
    },
  },
  {
    schoolName: "김포 사우초",
    aliases: ["김포 사우초", "사우초", "사우초등학교"],
    classes: {
      A반: {
        classLabel: "독서역사논술",
        ratePerStudent: 22000,
      },
      B반: {
        classLabel: "독서역사논술",
        ratePerStudent: 22000,
      },
    },
  },
];

const normalizeSchoolName = (value: unknown) => {
  return String(value || "")
    .replace(/\s/g, "")
    .replace(/초등학교/g, "초")
    .replace(/초등/g, "초")
    .replace(/[()]/g, "")
    .trim();
};

export const getTeacherFeeContract = (
  school: unknown,
  teachingClass: string
): TeacherFeeContract | null => {
  if (teachingClass !== "A반" && teachingClass !== "B반") {
    return null;
  }

  const schoolKey = normalizeSchoolName(school);
  const schoolConfig = TEACHER_FEE_SCHOOLS.find((item) =>
    item.aliases.some(
      (alias) => normalizeSchoolName(alias) === schoolKey
    )
  );

  if (!schoolConfig) {
    return null;
  }

  const classConfig = schoolConfig.classes[teachingClass];

  return {
    schoolName: schoolConfig.schoolName,
    teachingClass,
    classLabel: classConfig.classLabel,
    ratePerStudent: classConfig.ratePerStudent,
  };
};

export const formatWon = (amount: number) => {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
};
