// 교재 사진의 '어휘 확인' 표제어를 기준으로 정리한 학습 데이터입니다.
// 뜻풀이 문장은 교재의 원문이 아닌 별도로 작성한 설명입니다.
// 다른 시리즈를 추가할 때는 교재 ID별 데이터 모듈로 확장합니다.

export type DailyVocabularyCard = {
  id: string;
  day: number;
  answer: string;
  clue: string;
};
type VocabularyEntry = readonly [answer: string, clue: string];

const FOLKTALES: Record<number, VocabularyEntry[]> = {
  1: [
    ["선비", "옛날에 글을 배우고 학문과 예절을 중요하게 여겼던 사람."],
    ["감투", "옛날에 남자들이 머리에 쓰던 모자의 한 종류."],
    ["소동", "여러 사람이 시끄럽게 떠들거나 움직여 어수선해지는 일."],
    ["아궁이", "불을 피워 솥이나 방을 데우는 곳."],
  ],
  2: [
    ["외딴집", "다른 집들과 멀리 떨어져 홀로 있는 집."],
    ["푼", "옛날에 돈을 셀 때 사용하던 작은 단위."],
    ["살림", "한집안의 생활을 꾸리고 살아가는 일."],
  ],
  3: [
    ["거름", "식물이 잘 자라도록 땅에 주는 영양분이 있는 물질."],
    ["풍년", "농작물이 잘 자라 평소보다 많은 곡식을 거두는 해."],
  ],
  4: [
    ["오두막", "사람이 겨우 지낼 수 있을 만큼 작고 초라한 집."],
    ["묵다", "어떤 장소에서 하룻밤 이상 머물며 지내다."],
    ["목청껏", "낼 수 있는 만큼 목소리를 크게 내어."],
  ],
  5: [
    ["초가집", "지붕을 짚이나 마른 풀로 덮어 만든 옛날 집."],
    ["절구통", "곡식을 넣고 찧어서 가루를 내거나 잘게 부수는 데 쓰는 통."],
  ],
  6: [
    ["차지하다", "물건이나 장소 등을 자기 것으로 가지거나 사용하다."],
    ["빈손", "돈이나 물건 등 가진 것이 아무것도 없는 상태."],
    ["틈새", "두 물건이나 부분 사이에 조금 벌어진 공간."],
  ],
  7: [
    ["떼", "억지를 부리며 원하는 것을 해 달라고 계속 조르는 행동."],
    ["동이", "물을 길어 담거나 옮길 때 사용하던 둥근 그릇."],
    ["타다", "물과 같은 액체에 가루 등을 넣고 섞다."],
    ["한달음", "중간에 쉬거나 멈추지 않고 한 번에 달려가는 것."],
  ],
  8: [
    ["시아버지", "남편의 아버지를 부르는 말."],
    ["친정", "결혼한 여자가 태어나거나 자란 부모님의 집."],
    ["탐스럽다", "크고 알차거나 보기 좋아 마음에 들 만하다."],
  ],
  9: [
    ["사내", "남자를 가리키는 말."],
    ["조기", "바다에 사는 물고기의 한 종류로, 음식 재료로 많이 쓰인다."],
    ["사정", "어떤 일이 생긴 까닭이나 그 일이 이루어진 형편."],
    ["냥", "옛날에 돈이나 무게를 셀 때 사용하던 단위."],
    ["헐값", "물건의 원래 값보다 훨씬 낮은 가격."],
  ],
  10: [
    ["고갯마루", "산길의 고개에서 가장 높은 부분."],
    ["대장장이", "쇠를 뜨겁게 달구고 두드려 연장이나 도구를 만드는 사람."],
  ],
  11: [
    ["애원하다", "원하는 일을 들어 달라고 간절하게 부탁하다."],
    ["능청스럽다", "속마음을 감추고 아무렇지 않은 듯 자연스럽게 행동하다."],
    ["살살대다", "다른 사람의 마음에 들려고 웃으며 비위를 맞추다."],
  ],
  12: [
    ["글썽이다", "눈물이 눈에 가득 고여 곧 흘러내릴 듯하다."],
    ["담그다", "물이나 다른 액체 안에 물건을 넣어 잠기게 하다."],
  ],
  13: [
    ["오누이", "남자 형제와 여자 형제를 함께 이르는 말."],
    ["문고리", "문을 열거나 닫을 때 손으로 잡는 부분."],
    ["화롯불", "화로라는 그릇에 담아 놓은 숯불."],
    ["방아", "곡식을 찧거나 빻는 데 사용하는 기구."],
  ],
  14: [
    ["홀어머니", "남편을 잃고 자녀를 혼자 키우며 살아가는 어머니."],
    ["태연하다", "놀라거나 두려운 상황에서도 평소처럼 차분하다."],
    ["효성", "부모님을 사랑하고 정성껏 모시려는 마음."],
    ["감복", "다른 사람의 행동이나 마음에 깊이 감동하여 존경하거나 따르게 됨."],
  ],
  15: [
    ["은혜", "다른 사람에게 도움이나 배려를 받아 고맙게 여기는 일."],
    ["재판", "어떤 일의 옳고 그름을 법이나 기준에 따라 판단하는 일."],
  ],
};

export const FOLKTALES_ACTIVE_DAYS = Object.keys(FOLKTALES).map(Number).sort((a, b) => a - b);

export const FOLKTALES_CARDS: DailyVocabularyCard[] = FOLKTALES_ACTIVE_DAYS.flatMap(day =>
  FOLKTALES[day].map(([answer, clue], index) => ({
    id: "ft-" + String(day).padStart(2, "0") + "-" + String(index + 1).padStart(2, "0"),
    day, answer, clue,
  }))
);
export const FOLKTALES_BY_ID = new Map(FOLKTALES_CARDS.map(card => [card.id, card]));

export function vocabularyCardsForDay(day: number): DailyVocabularyCard[] {
  return FOLKTALES_CARDS.filter(card => card.day === day);
}

export const FIVE_DAY_REVIEW_ENDS = [5, 10, 15, 20, 25] as const;
export function vocabularyCardsForFiveDayReview(endingDay: number): DailyVocabularyCard[] {
  if (!FIVE_DAY_REVIEW_ENDS.some(day => day === endingDay)) return [];
  return FOLKTALES_CARDS.filter(card => card.day >= endingDay - 4 && card.day <= endingDay);
}
export function formatKoreanLearningDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return fields.year + "-" + fields.month + "-" + fields.day;
}
export function nextKoreanLearningDate(yyyyMmDd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd);
  if (!match) throw new Error("invalid_learning_date");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return date.toISOString().slice(0, 10);
}
export const normalizeDailyVocabularyAnswer = (input: string) =>
  input.normalize("NFC").replace(/\s+/g, "").trim();
