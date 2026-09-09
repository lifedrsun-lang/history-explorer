import { GAEBONG_SCHOOL_NAME } from "@/lib/gaebongClassroom";

export { GAEBONG_SCHOOL_NAME };

export type ClassroomLink = {
  id: string;
  label: string;
  href: string;
  kind?: "activity" | "review";
  defaultUnlocked?: boolean;
};

export type ClassroomLesson = {
  lesson: number;
  date?: string;
  title: string;
  message: string;
  links: ClassroomLink[];
  expandLocked?: boolean;
};

export type ClassroomMonster = {
  id: string;
  name: string;
  imageSrc: string;
  className: string;
};

export type SchoolClassroom = {
  schoolName: string;
  schoolDisplayName?: string;
  grade: number;
  classNumber: number;
  label: string;
  monsterId: string;
  directToken: string;
  lessons: ClassroomLesson[];
};

export type GaebongClassroom = SchoolClassroom;
export type WonjongClassroom = SchoolClassroom;

export const GAEBONG_SCHOOL_DISPLAY_NAME = "서울 개봉초";
export const GAEBONG_SCHOOL_CODE = "GB";
export const WONJONG_SCHOOL_NAME = "부천 원종초등학교";
export const WONJONG_SCHOOL_DISPLAY_NAME = "부천 원종초";
export const GWANGIL_SCHOOL_NAME = "광명 광일초등학교";
export const GWANGIL_SCHOOL_DISPLAY_NAME = "광명 광일초";
export const WOLMUN_SCHOOL_NAME = "화성 월문초등학교";
export const WOLMUN_SCHOOL_DISPLAY_NAME = "화성 월문초";

export const CLASSROOM_MONSTERS: ClassroomMonster[] = [
  {
    id: "slime",
    name: "슬라임",
    imageSrc: "/images/classroom/gaebong/slime.jpg",
    className: "from-lime-100 to-emerald-50 border-lime-200",
  },
  {
    id: "orange-mushroom",
    name: "주황버섯",
    imageSrc: "/images/classroom/gaebong/orange-mushroom.jpg",
    className: "from-orange-100 to-amber-50 border-orange-200",
  },
  {
    id: "choco-mushroom",
    name: "초코버섯",
    imageSrc: "/images/classroom/gaebong/choco-mushroom.jpg",
    className: "from-amber-100 to-orange-50 border-amber-200",
  },
  {
    id: "guardian-angel-slime",
    name: "가디언 엔젤 슬라임",
    imageSrc: "/images/classroom/gaebong/guardian-angel-slime.png",
    className: "from-lime-100 to-yellow-50 border-lime-200",
  },
  {
    id: "blue-mushroom",
    name: "파란버섯",
    imageSrc: "/images/classroom/gaebong/blue-mushroom.jpg",
    className: "from-sky-100 to-blue-50 border-sky-200",
  },
  {
    id: "forest-mushroom",
    name: "초록숲버섯",
    imageSrc: "/images/classroom/gaebong/forest-mushroom.jpg",
    className: "from-emerald-100 to-lime-50 border-emerald-200",
  },
];

const HELLO_MAPLE_URL = "https://www.hellomaple.org/ko";
const BUG_BUSTERS_URL =
  "https://www.hellomaple.org/ko/play/477e50c9650f4ee8aa7d8b9b8a4f8814";
const MAPLE_SPORTS_DAY_URL =
  "https://www.hellomaple.org/ko/play/771be352167b4ffeb0b37eebd3ff64b1";
const TYPING_HERO_URL =
  "https://www.hellomaple.org/ko/play/74fe74f966d441e7bbaa073e5cb893f9";

const GAEBONG_PADLET_LINKS: Record<number, string> = {
  1: "https://padlet.com/lifedrsun/6-1-9hp3499dhfo532jh",
  2: "https://padlet.com/lifedrsun/6-2-st1hnz3nkw2ivn3p",
  3: "https://padlet.com/lifedrsun/6-3-5b85a63p18423xdz",
  4: "https://padlet.com/lifedrsun/6-4-71tuuqumq609dasm",
  5: "https://padlet.com/lifedrsun/6-5-y3vgaanlq2wa0ayv",
  6: "https://padlet.com/lifedrsun/6-6-296jds17pi7t9x4i",
};

const makeLessons = (padletUrl: string): ClassroomLesson[] => [
  {
    lesson: 1,
    date: "2026-09-01",
    title: "1차시 수업 안내",
    message: "첫 수업 안내와 활동 링크가 이곳에 올라옵니다.",
    links: [
      {
        id: "hello-maple",
        label: "🍁 헬로메이플 시작하기",
        href: HELLO_MAPLE_URL,
        kind: "activity",
        defaultUnlocked: true,
      },
      {
        id: "avatar-share",
        label: "🖼️ 우리 반 아바타 공유하기",
        href: padletUrl,
        kind: "activity",
        defaultUnlocked: false,
      },
      {
        id: "bug-busters",
        label: "버그버스터즈: 킹버그의 습격",
        href: BUG_BUSTERS_URL,
        kind: "activity",
        defaultUnlocked: false,
      },
      {
        id: "maple-sports-day",
        label: "OX 메이플운동회",
        href: MAPLE_SPORTS_DAY_URL,
        kind: "activity",
        defaultUnlocked: false,
      },
      {
        id: "typing-hero",
        label: "도전! 타자히어로",
        href: TYPING_HERO_URL,
        kind: "activity",
        defaultUnlocked: false,
      },
    ],
  },
  {
    lesson: 2,
    title: "2차시 수업 안내",
    message: "다음 수업 안내는 수업 전에 업데이트됩니다.",
    links: [],
  },
];

const makeSchoolLessons = (count: number): ClassroomLesson[] =>
  Array.from({ length: count }, (_, index) => index + 1).map((lesson) => ({
    lesson,
    title: `${lesson}차시 수업 안내`,
    message:
      lesson === 1
        ? "헬로메이플 수업 활동을 시작해요. 추가 안내는 수업 전에 업데이트됩니다."
        : "수업 안내는 수업 전에 업데이트됩니다.",
    links:
      lesson === 1
        ? [
            {
              id: "hello-maple",
              label: "🍁 헬로메이플 시작하기",
              href: HELLO_MAPLE_URL,
              kind: "activity" as const,
              defaultUnlocked: true,
            },
          ]
        : [],
  }));

const makeWonjongLessons = (): ClassroomLesson[] =>
  makeSchoolLessons(4).map((lesson) => ({
    ...lesson,
    expandLocked: lesson.lesson === 3 || lesson.lesson === 4,
    links:
      lesson.lesson === 2
        ? [
            {
              id: "stacking-block-chef",
              label: "차곡차곡 블록 요리사",
              href: "https://www.hellomaple.org/ko/web-play?play=153a1fd2e11848c888a0738d0897bcb9",
              kind: "activity" as const,
              defaultUnlocked: false,
            },
          ]
        : lesson.lesson === 3
          ? [
              {
                id: "shuriken-dodge",
                label: "표창 피하기",
                href: "https://www.hellomaple.org/ko/web-play?play=e6f6dfc0433b470e9136ba4e351bd910",
                kind: "activity" as const,
                defaultUnlocked: false,
              },
              {
                id: "snail-hell",
                label: "달팽이 지옥",
                href: "https://www.hellomaple.org/ko/web-play?play=53c968ec07724c0190bc36428bbdedf3",
                kind: "activity" as const,
                defaultUnlocked: false,
              },
              {
                id: "falling-food-collector",
                label: "하늘에서 떨어지는 음식 모으기",
                href: "https://www.hellomaple.org/ko/web-play?play=b2d314a58c4b4d748389676b4d146ef2",
                kind: "activity" as const,
                defaultUnlocked: false,
              },
              {
                id: "mbti-quiz",
                label: "MBTI 알아보기",
                href: "https://www.hellomaple.org/ko/web-play?play=e0d41d23bd134a77850a91e76bc236d5",
                kind: "activity" as const,
                defaultUnlocked: false,
              },
              {
                id: "hello-maple-post-office",
                label: "헬로메이플 우체국",
                href: "https://www.hellomaple.org/ko/web-play?play=8306608fc2294874b5a3b7e2cc137c94",
                kind: "activity" as const,
                defaultUnlocked: false,
              },
            ]
          : lesson.links,
  }));

export const GAEBONG_CLASSROOMS: GaebongClassroom[] = [
  { schoolName: GAEBONG_SCHOOL_NAME, schoolDisplayName: GAEBONG_SCHOOL_DISPLAY_NAME, grade: 6, classNumber: 1, label: "6학년 1반", monsterId: "slime", directToken: "gb6c1-g7ac4o9a1n", lessons: makeLessons(GAEBONG_PADLET_LINKS[1]) },
  { schoolName: GAEBONG_SCHOOL_NAME, schoolDisplayName: GAEBONG_SCHOOL_DISPLAY_NAME, grade: 6, classNumber: 2, label: "6학년 2반", monsterId: "guardian-angel-slime", directToken: "gb6c2-je8xtrigeu", lessons: makeLessons(GAEBONG_PADLET_LINKS[2]) },
  { schoolName: GAEBONG_SCHOOL_NAME, schoolDisplayName: GAEBONG_SCHOOL_DISPLAY_NAME, grade: 6, classNumber: 3, label: "6학년 3반", monsterId: "forest-mushroom", directToken: "gb6c3-kilcoepxmg", lessons: makeLessons(GAEBONG_PADLET_LINKS[3]) },
  { schoolName: GAEBONG_SCHOOL_NAME, schoolDisplayName: GAEBONG_SCHOOL_DISPLAY_NAME, grade: 6, classNumber: 4, label: "6학년 4반", monsterId: "orange-mushroom", directToken: "gb6c4-xtjzvvpgjs", lessons: makeLessons(GAEBONG_PADLET_LINKS[4]) },
  { schoolName: GAEBONG_SCHOOL_NAME, schoolDisplayName: GAEBONG_SCHOOL_DISPLAY_NAME, grade: 6, classNumber: 5, label: "6학년 5반", monsterId: "blue-mushroom", directToken: "gb6c5-emg1vzxnsw", lessons: makeLessons(GAEBONG_PADLET_LINKS[5]) },
  { schoolName: GAEBONG_SCHOOL_NAME, schoolDisplayName: GAEBONG_SCHOOL_DISPLAY_NAME, grade: 6, classNumber: 6, label: "6학년 6반", monsterId: "choco-mushroom", directToken: "gb6c6-ms9vlecq99", lessons: makeLessons(GAEBONG_PADLET_LINKS[6]) },
];

export const WONJONG_CLASSROOMS: WonjongClassroom[] = [
  { schoolName: WONJONG_SCHOOL_NAME, schoolDisplayName: WONJONG_SCHOOL_DISPLAY_NAME, grade: 1, classNumber: 1, label: "1학년 1반", monsterId: "slime", directToken: "wj1c1-v9m2k4q7rx", lessons: makeWonjongLessons() },
  { schoolName: WONJONG_SCHOOL_NAME, schoolDisplayName: WONJONG_SCHOOL_DISPLAY_NAME, grade: 1, classNumber: 2, label: "1학년 2반", monsterId: "guardian-angel-slime", directToken: "wj1c2-t6p8n3z5ha", lessons: makeWonjongLessons() },
  { schoolName: WONJONG_SCHOOL_NAME, schoolDisplayName: WONJONG_SCHOOL_DISPLAY_NAME, grade: 1, classNumber: 3, label: "1학년 3반", monsterId: "forest-mushroom", directToken: "wj1c3-b4y7d2s9ke", lessons: makeWonjongLessons() },
  { schoolName: WONJONG_SCHOOL_NAME, schoolDisplayName: WONJONG_SCHOOL_DISPLAY_NAME, grade: 2, classNumber: 1, label: "2학년 1반", monsterId: "orange-mushroom", directToken: "wj2c1-r5x8j3m6vu", lessons: makeWonjongLessons() },
  { schoolName: WONJONG_SCHOOL_NAME, schoolDisplayName: WONJONG_SCHOOL_DISPLAY_NAME, grade: 2, classNumber: 2, label: "2학년 2반", monsterId: "blue-mushroom", directToken: "wj2c2-c7h4w9p2ns", lessons: makeWonjongLessons() },
  { schoolName: WONJONG_SCHOOL_NAME, schoolDisplayName: WONJONG_SCHOOL_DISPLAY_NAME, grade: 2, classNumber: 3, label: "2학년 3반", monsterId: "choco-mushroom", directToken: "wj2c3-k2f6a8q4zt", lessons: makeWonjongLessons() },
];

export const GWANGIL_CLASSROOMS: SchoolClassroom[] = [
  { schoolName: GWANGIL_SCHOOL_NAME, schoolDisplayName: GWANGIL_SCHOOL_DISPLAY_NAME, grade: 5, classNumber: 1, label: "5학년 1반", monsterId: "slime", directToken: "gi5c1-m7q2v9ka4x", lessons: makeSchoolLessons(7) },
  { schoolName: GWANGIL_SCHOOL_NAME, schoolDisplayName: GWANGIL_SCHOOL_DISPLAY_NAME, grade: 5, classNumber: 2, label: "5학년 2반", monsterId: "guardian-angel-slime", directToken: "gi5c2-r4n8p2yd6w", lessons: makeSchoolLessons(7) },
  { schoolName: GWANGIL_SCHOOL_NAME, schoolDisplayName: GWANGIL_SCHOOL_DISPLAY_NAME, grade: 5, classNumber: 3, label: "5학년 3반", monsterId: "forest-mushroom", directToken: "gi5c3-b6t3h9qs2e", lessons: makeSchoolLessons(7) },
  { schoolName: GWANGIL_SCHOOL_NAME, schoolDisplayName: GWANGIL_SCHOOL_DISPLAY_NAME, grade: 5, classNumber: 4, label: "5학년 4반", monsterId: "orange-mushroom", directToken: "gi5c4-j8w5f2mk7c", lessons: makeSchoolLessons(7) },
  { schoolName: GWANGIL_SCHOOL_NAME, schoolDisplayName: GWANGIL_SCHOOL_DISPLAY_NAME, grade: 5, classNumber: 5, label: "5학년 5반", monsterId: "blue-mushroom", directToken: "gi5c5-z3p7n4rv8a", lessons: makeSchoolLessons(7) },
];

export const WOLMUN_CLASSROOMS: SchoolClassroom[] = [
  { schoolName: WOLMUN_SCHOOL_NAME, schoolDisplayName: WOLMUN_SCHOOL_DISPLAY_NAME, grade: 5, classNumber: 1, label: "5학년 1반", monsterId: "slime", directToken: "wm5c1-p4k8v2ns7q", lessons: makeSchoolLessons(4) },
  { schoolName: WOLMUN_SCHOOL_NAME, schoolDisplayName: WOLMUN_SCHOOL_DISPLAY_NAME, grade: 6, classNumber: 1, label: "6학년 1반", monsterId: "guardian-angel-slime", directToken: "wm6c1-y7m3q9tb5r", lessons: makeSchoolLessons(4) },
];

export const ALL_CLASSROOMS: SchoolClassroom[] = [
  ...GAEBONG_CLASSROOMS,
  ...WONJONG_CLASSROOMS,
  ...GWANGIL_CLASSROOMS,
  ...WOLMUN_CLASSROOMS,
];

export const getGaebongClassroom = (classNumber: number) =>
  GAEBONG_CLASSROOMS.find((classroom) => classroom.classNumber === classNumber);

export const getGaebongClassroomByToken = (token: string) =>
  GAEBONG_CLASSROOMS.find((classroom) => classroom.directToken === token);

export const getClassroomByToken = (token: string) =>
  ALL_CLASSROOMS.find((classroom) => classroom.directToken === token);

export const getMonsterById = (monsterId: string) =>
  CLASSROOM_MONSTERS.find((monster) => monster.id === monsterId);
