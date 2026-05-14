export const STAGE_DATA = [

  // ===== 1권 =====
  {
    id: 1,
    title: "처음으로 세운 나라 고조선",
    short: "고조선1-1",
    chapter: "고조선1",
    lesson: 1,
    emoji: "🌾",
  },
  {
    id: 2,
    title: "처음으로 세운 나라 고조선",
    short: "고조선1-2",
    chapter: "고조선1",
    lesson: 2,
    emoji: "🏹",
  },
  {
    id: 3,
    title: "처음으로 세운 나라 고조선",
    short: "고조선1-3",
    chapter: "고조선1",
    lesson: 3,
    emoji: "🔥",
  },
  {
    id: 4,
    title: "처음으로 세운 나라 고조선",
    short: "고조선1-4",
    chapter: "고조선1",
    lesson: 4,
    emoji: "👑",
  },

  // ===== 2권 =====
  {
    id: 5,
    title: "고조선의 뒤를 이은 나라들",
    short: "고조선2-1",
    chapter: "고조선2",
    lesson: 1,
    emoji: "🌾",
  },
  {
    id: 6,
    title: "고조선의 뒤를 이은 나라들",
    short: "고조선2-2",
    chapter: "고조선2",
    lesson: 2,
    emoji: "🏹",
  },
  {
    id: 7,
    title: "고조선의 뒤를 이은 나라들",
    short: "고조선2-3",
    chapter: "고조선2",
    lesson: 3,
    emoji: "🔥",
  },
  {
    id: 8,
    title: "고조선의 뒤를 이은 나라들",
    short: "고조선2-4",
    chapter: "고조선2",
    lesson: 4,
    emoji: "👑",
  },

  // ===== 3권 =====
  {
    id: 9,
    title: "광활한 영토에 우뚝 선 고구려1",
    short: "고구려1-1",
    chapter: "고구려1",
    lesson: 1,
    emoji: "🐴",
  },
  {
    id: 10,
    title: "광활한 영토에 우뚝 선 고구려1",
    short: "고구려1-2",
    chapter: "고구려1",
    lesson: 2,
    emoji: "🏹",
  },
  {
    id: 11,
    title: "광활한 영토에 우뚝 선 고구려1",
    short: "고구려1-3",
    chapter: "고구려1",
    lesson: 3,
    emoji: "⚔️",
  },
  {
    id: 12,
    title: "광활한 영토에 우뚝 선 고구려1",
    short: "고구려1-4",
    chapter: "고구려1",
    lesson: 4,
    emoji: "👑",
  },

  // ===== 4권 =====
  {
    id: 13,
    title: "700년의 역사 속 고구려2",
    short: "고구려2-1",
    chapter: "고구려2",
    lesson: 1,
    emoji: "🐴",
  },
  {
    id: 14,
    title: "700년의 역사 속 고구려2",
    short: "고구려2-2",
    chapter: "고구려2",
    lesson: 2,
    emoji: "🏹",
  },
  {
    id: 15,
    title: "700년의 역사 속 고구려2",
    short: "고구려2-3",
    chapter: "고구려2",
    lesson: 3,
    emoji: "⚔️",
  },
  {
    id: 16,
    title: "700년의 역사 속 고구려2",
    short: "고구려2-4",
    chapter: "고구려2",
    lesson: 4,
    emoji: "👑",
  },

];

export const getStageInfo = (
  stage: number
) => {

  const current =
    STAGE_DATA.find(
      (s) => s.id === Number(stage)
    );

  // 기본값
  if (!current) {

    return {
      title: "탐험 시작",
      current: {
        short: "준비중",
        emoji: "❓",
      },
      stages: [],
    };

  }

  // 같은 챕터 묶기
  const stages = STAGE_DATA.filter(
    (s) => s.chapter === current.chapter
  );

  return {
    title: current.title,
    current,
    stages,
  };

};