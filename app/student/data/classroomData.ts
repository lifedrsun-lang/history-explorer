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
};

export type ClassroomMonster = {
  id: string;
  name: string;
  imageSrc: string;
  className: string;
};

export type GaebongClassroom = {
  grade: 6;
  classNumber: number;
  label: string;
  monsterId: string;
  directToken: string;
  lessons: ClassroomLesson[];
};

export const GAEBONG_SCHOOL_DISPLAY_NAME = "서울 개봉초";
export const GAEBONG_SCHOOL_CODE = "GB";

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

export const GAEBONG_CLASSROOMS: GaebongClassroom[] = [
  {
    grade: 6,
    classNumber: 1,
    label: "6학년 1반",
    monsterId: "slime",
    directToken: "gb6c1-g7ac4o9a1n",
    lessons: makeLessons(GAEBONG_PADLET_LINKS[1]),
  },
  {
    grade: 6,
    classNumber: 2,
    label: "6학년 2반",
    monsterId: "guardian-angel-slime",
    directToken: "gb6c2-je8xtrigeu",
    lessons: makeLessons(GAEBONG_PADLET_LINKS[2]),
  },
  {
    grade: 6,
    classNumber: 3,
    label: "6학년 3반",
    monsterId: "forest-mushroom",
    directToken: "gb6c3-kilcoepxmg",
    lessons: makeLessons(GAEBONG_PADLET_LINKS[3]),
  },
  {
    grade: 6,
    classNumber: 4,
    label: "6학년 4반",
    monsterId: "orange-mushroom",
    directToken: "gb6c4-xtjzvvpgjs",
    lessons: makeLessons(GAEBONG_PADLET_LINKS[4]),
  },
  {
    grade: 6,
    classNumber: 5,
    label: "6학년 5반",
    monsterId: "blue-mushroom",
    directToken: "gb6c5-emg1vzxnsw",
    lessons: makeLessons(GAEBONG_PADLET_LINKS[5]),
  },
  {
    grade: 6,
    classNumber: 6,
    label: "6학년 6반",
    monsterId: "choco-mushroom",
    directToken: "gb6c6-ms9vlecq99",
    lessons: makeLessons(GAEBONG_PADLET_LINKS[6]),
  },
];

export const getGaebongClassroom = (classNumber: number) => {
  return GAEBONG_CLASSROOMS.find(
    (classroom) => classroom.classNumber === classNumber
  );
};

export const getGaebongClassroomByToken = (token: string) => {
  return GAEBONG_CLASSROOMS.find(
    (classroom) => classroom.directToken === token
  );
};

export const getMonsterById = (monsterId: string) => {
  return CLASSROOM_MONSTERS.find((monster) => monster.id === monsterId);
};
