import {
  DEFAULT_STUDENT_PROGRAM,
  StudentProgram,
} from "@/lib/programs";

export type StageItem = {
  id: string;
  bookNumber: number;
  book: number;
  label: string;
  program: StudentProgram;
  title: string;
  era: string;
  description: string;
  short: string;
  emoji: string;
};

export const TOTAL_BOOK_STAGES = 23;

export const DEFAULT_STAGE_ID = "book_1";

export const STAGE_DATA: StageItem[] = [
  {
    id: "book_1",
    bookNumber: 1,
    book: 1,
    label: "1권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "처음으로 세운 나라 고조선1",
    era: "고조선1",
    description:
      "구석기·신석기 시대 사람들이 어떻게 살았는지 알아보고, 청동기 시대의 도구와 고조선의 시작을 배웁니다. 고인돌, 반구대 바위그림, 단군 이야기 등 우리 역사 첫 나라의 모습을 탐험합니다.",
    short: "별꼼역사 1권",
    emoji: "🌾",
  },
  {
    id: "book_2",
    bookNumber: 2,
    book: 2,
    label: "2권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "고조선의 뒤를 이은 나라들 고조선2",
    era: "고조선2",
    description:
      "고조선의 무너짐과 여러 나라의 등장을 알아봅니다. 부여, 옥저, 동예, 삼한의 생활 모습과 풍습을 비교하며 고조선 이후의 역사를 배웁니다.",
    short: "별꼼역사 2권",
    emoji: "🏹",
  },
  {
    id: "book_3",
    bookNumber: 3,
    book: 3,
    label: "3권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "광활한 영토에 우뚝 선 고구려1",
    era: "고구려1",
    description:
      "고구려가 세워지고 성장한 과정을 살펴봅니다. 광개토 대왕과 장수왕의 활약, 넓어진 영토와 씩씩한 고구려 사람들의 생활을 알아봅니다.",
    short: "별꼼역사 3권",
    emoji: "🐴",
  },
  {
    id: "book_4",
    bookNumber: 4,
    book: 4,
    label: "4권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "700년 역사의 끝 고구려2",
    era: "고구려2",
    description:
      "수와 당의 침입에 맞선 고구려의 전쟁과 백성들의 힘을 배웁니다. 을지문덕, 안시성 싸움, 연개소문, 고구려 멸망까지 700년 역사의 마지막을 살펴봅니다.",
    short: "별꼼역사 4권",
    emoji: "⚔️",
  },
  {
    id: "book_5",
    bookNumber: 5,
    book: 5,
    label: "5권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "찬란한 문화를 꽃 피운 백제1",
    era: "백제1",
    description:
      "한강 유역에서 성장한 백제의 시작과 발전을 알아봅니다. 근초고왕의 활약, 백제의 문화와 일본에 전해진 기술, 아름다운 유물들을 함께 살펴봅니다.",
    short: "별꼼역사 5권",
    emoji: "🏯",
  },
  {
    id: "book_6",
    bookNumber: 6,
    book: 6,
    label: "6권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "꺼져가는 불꽃 백제2",
    era: "백제2",
    description:
      "웅진과 사비로 도읍을 옮긴 백제의 변화와 다시 일어서려는 노력을 배웁니다. 무령왕릉, 성왕, 백제의 멸망과 부흥 운동까지 백제의 마지막 불꽃을 따라갑니다.",
    short: "별꼼역사 6권",
    emoji: "🔥",
  },
  {
    id: "book_7",
    bookNumber: 7,
    book: 7,
    label: "7권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "황금의 나라 신라",
    era: "신라",
    description:
      "신라가 작은 나라에서 삼국 통일의 주역으로 성장한 과정을 알아봅니다. 화랑, 불교, 금관과 고분 문화, 김유신과 신라 사람들의 이야기를 배웁니다.",
    short: "별꼼역사 7권",
    emoji: "👑",
  },
  {
    id: "book_8",
    bookNumber: 8,
    book: 8,
    label: "8권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "통일 신라와 발해가 여는 남북국 시대1",
    era: "남북국 시대1",
    description:
      "삼국 통일 뒤 통일 신라가 나라를 다스린 모습과 불국사, 석굴암 같은 찬란한 문화를 알아봅니다. 북쪽에서 고구려를 이은 발해가 세워지는 과정도 함께 배웁니다.",
    short: "별꼼역사 8권",
    emoji: "🌏",
  },
  {
    id: "book_9",
    bookNumber: 9,
    book: 9,
    label: "9권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "무너진 신라와 새로운 나라 발해 남북국 시대2",
    era: "남북국 시대2",
    description:
      "통일 신라가 흔들리고 후삼국이 등장하는 과정을 살펴봅니다. 발해의 넓은 영토와 문화, 신라 말 사회 변화, 새로운 나라를 향한 움직임을 배웁니다.",
    short: "별꼼역사 9권",
    emoji: "🏛️",
  },
  {
    id: "book_10",
    bookNumber: 10,
    book: 10,
    label: "10권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "고구려의 뒤를 이은 고려1",
    era: "고려1",
    description:
      "후삼국을 통일한 왕건과 고려의 건국 이야기를 배웁니다. 고려가 나라의 틀을 세우고 여러 세력을 하나로 모아 새로운 시대를 열어 간 과정을 알아봅니다.",
    short: "별꼼역사 10권",
    emoji: "🐲",
  },
  {
    id: "book_11",
    bookNumber: 11,
    book: 11,
    label: "11권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "전쟁을 이겨낸 백성들 고려2",
    era: "고려2",
    description:
      "거란과 여진의 침입에 맞선 고려 사람들의 지혜와 용기를 알아봅니다. 서희의 외교 담판, 강감찬의 귀주 대첩, 별무반 등 전쟁을 이겨낸 이야기를 배웁니다.",
    short: "별꼼역사 11권",
    emoji: "🛡️",
  },
  {
    id: "book_12",
    bookNumber: 12,
    book: 12,
    label: "12권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "흔들리는 고려3",
    era: "고려3",
    description:
      "고려 사회가 흔들리며 권력을 둘러싼 갈등이 커진 과정을 살펴봅니다. 무신 정변, 농민과 천민의 봉기, 달라지는 백성들의 삶을 알아봅니다.",
    short: "별꼼역사 12권",
    emoji: "📜",
  },
  {
    id: "book_13",
    bookNumber: 13,
    book: 13,
    label: "13권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "외적과 맞서 싸운 고려4",
    era: "고려4",
    description:
      "몽골의 침입과 고려 사람들의 끈질긴 저항을 배웁니다. 강화도 천도, 팔만대장경, 삼별초의 항쟁을 통해 외적에 맞선 고려의 힘을 살펴봅니다.",
    short: "별꼼역사 13권",
    emoji: "🔥",
  },
  {
    id: "book_14",
    bookNumber: 14,
    book: 14,
    label: "14권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "선비의 나라 조선1",
    era: "조선1",
    description:
      "조선이 세워지고 한양을 중심으로 새 나라의 틀을 갖추는 과정을 알아봅니다. 태조 이성계, 정도전, 유교 정치와 선비 문화의 시작을 배웁니다.",
    short: "별꼼역사 14권",
    emoji: "📚",
  },
  {
    id: "book_15",
    bookNumber: 15,
    book: 15,
    label: "15권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "위대한 세종과 한글 조선2",
    era: "조선2",
    description:
      "세종 대왕이 백성을 위해 펼친 정치를 살펴봅니다. 한글 창제, 과학 기술, 음악과 농업 발전을 통해 조선 문화가 꽃핀 모습을 배웁니다.",
    short: "별꼼역사 15권",
    emoji: "🔤",
  },
  {
    id: "book_16",
    bookNumber: 16,
    book: 16,
    label: "16권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "새로운 정치를 꿈꾸는 조선3",
    era: "조선3",
    description:
      "조선의 정치가 변화하고 여러 생각이 부딪힌 과정을 알아봅니다. 사림의 성장, 사화와 붕당, 새로운 정치를 꿈꾼 사람들의 이야기를 배웁니다.",
    short: "별꼼역사 16권",
    emoji: "🏛️",
  },
  {
    id: "book_17",
    bookNumber: 17,
    book: 17,
    label: "17권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "전쟁이 휩쓸어진 조선4",
    era: "조선4",
    description:
      "임진왜란과 병자호란으로 조선이 큰 위기를 겪은 과정을 배웁니다. 이순신, 의병, 백성들의 노력과 전쟁이 남긴 상처를 함께 살펴봅니다.",
    short: "별꼼역사 17권",
    emoji: "⚓",
  },
  {
    id: "book_18",
    bookNumber: 18,
    book: 18,
    label: "18권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "전쟁의 상처를 딛고 내일을 향해 조선5",
    era: "조선5",
    description:
      "전쟁 뒤 조선이 다시 일어서려 노력한 모습을 알아봅니다. 대동법, 영조와 정조의 개혁, 수원 화성, 실학자들의 생각을 통해 더 나은 나라를 꿈꾼 역사를 배웁니다.",
    short: "별꼼역사 18권",
    emoji: "🏯",
  },
  {
    id: "book_19",
    bookNumber: 19,
    book: 19,
    label: "19권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "백성을 위한 풍요로운 세상 조선6",
    era: "조선6",
    description:
      "조선 후기 백성들의 생활과 사회 변화, 새로운 문화의 성장을 알아봅니다. 장시와 상업, 서민 문화, 농업과 기술의 발달을 통해 풍요로운 세상을 향한 움직임을 배웁니다.",
    short: "별꼼역사 19권",
    emoji: "🌱",
  },
  {
    id: "book_20",
    bookNumber: 20,
    book: 20,
    label: "20권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "질흙 같은 어둠의 시대 대한제국1",
    era: "대한제국1",
    description:
      "서양 세력이 다가오고 조선이 개항하며 큰 변화를 맞은 과정을 살펴봅니다. 강화도 조약, 개화와 갈등, 대한제국의 선포와 나라를 지키려는 노력을 배웁니다.",
    short: "별꼼역사 20권",
    emoji: "🚢",
  },
  {
    id: "book_21",
    bookNumber: 21,
    book: 21,
    label: "21권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "대한 독립 만세 대한제국2",
    era: "대한제국2",
    description:
      "일제에 나라를 빼앗긴 뒤 독립을 되찾으려는 사람들의 노력을 배웁니다. 3·1 운동, 대한민국 임시 정부, 독립군과 여러 독립운동가들의 이야기를 살펴봅니다.",
    short: "별꼼역사 21권",
    emoji: "✊",
  },
  {
    id: "book_22",
    bookNumber: 22,
    book: 22,
    label: "22권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "세계 속에 떠오르는 대한민국1",
    era: "대한민국1",
    description:
      "광복 이후 대한민국 정부가 세워지고 새로운 나라를 만들어 간 과정을 알아봅니다. 분단과 6·25 전쟁, 전쟁 뒤 다시 일어선 사람들의 이야기를 배웁니다.",
    short: "별꼼역사 22권",
    emoji: "🇰🇷",
  },
  {
    id: "book_23",
    bookNumber: 23,
    book: 23,
    label: "23권",
    program: DEFAULT_STUDENT_PROGRAM,
    title: "민주주의와 경제 발전 대한민국2",
    era: "대한민국2",
    description:
      "대한민국의 민주주의가 자라고 경제가 발전해 온 과정을 살펴봅니다. 시민들의 노력, 산업화와 생활 변화, 세계 속 대한민국의 모습을 배웁니다.",
    short: "별꼼역사 23권",
    emoji: "🚄",
  },
];

const clampBookNumber = (bookNumber: number) => {
  return Math.min(
    TOTAL_BOOK_STAGES,
    Math.max(1, bookNumber)
  );
};

const normalizeExistingBookNumber = (
  bookNumber: number
) => {
  return Math.max(1, bookNumber);
};

export const getStageIdForBook = (
  bookNumber: number
) => {
  return `book_${clampBookNumber(bookNumber)}`;
};

export const getBookNumberFromStage = (
  stage: any
) => {
  if (!stage) {
    return 1;
  }

  if (typeof stage === "string") {
    const bookMatch = stage.match(/^book_(\d+)$/);

    if (bookMatch) {
      return normalizeExistingBookNumber(
        Number(bookMatch[1])
      );
    }

    const lessonMatch = stage.match(/^(\d+)-\d+$/);

    if (lessonMatch) {
      return normalizeExistingBookNumber(
        Number(lessonMatch[1])
      );
    }

    const plainNumber = Number(stage);

    if (Number.isFinite(plainNumber)) {
      return normalizeExistingBookNumber(
        Math.ceil(plainNumber / 4)
      );
    }
  }

  const numericStage = Number(stage);

  if (Number.isFinite(numericStage)) {
    return normalizeExistingBookNumber(
      Math.ceil(numericStage / 4)
    );
  }

  return 1;
};

export const getStageInfo = (stage: any) => {
  const bookNumber = getBookNumberFromStage(stage);
  const current =
    STAGE_DATA.find(
      (item) => item.bookNumber === bookNumber
    ) || {
      id: `book_${bookNumber}`,
      bookNumber,
      book: bookNumber,
      label: `${bookNumber}권`,
      program: DEFAULT_STUDENT_PROGRAM,
      title: "추후 입력",
      era: "추후 입력",
      description:
        "이번 권의 역사 이야기를 탐험하고 있어요.",
      short: `별꼼역사 ${bookNumber}권`,
      emoji: "📘",
    };

  return {
    title: current.title,
    current,
    stages: [current],
  };
};
