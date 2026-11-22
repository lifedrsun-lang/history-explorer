// 1일 1독해 > 우리나라 > 보물편 1~15일차, 교재 '어휘 확인'의 표제어를 기준으로 정리.
// 뜻풀이는 저작권 있는 교재 설명의 전재가 아닌 아동 수준의 새 설명입니다.
// 어휘 카드 ID는 전래동화(ft-)와 겹치지 않도록 보물편(tr-) 별도로 유지합니다.
import type { DailyVocabularyCard } from "@/lib/dailyReadingVocabulary";
import { FIVE_DAY_REVIEW_ENDS } from "@/lib/dailyReadingVocabulary";

type Entry = readonly [answer: string, clue: string];
const TREASURE_WORDS: Record<number, Entry[]> = {
  1: [
    ["장식", "물건이나 장소를 더 아름답게 꾸미는 일."],
    ["멸망", "나라나 조직 등이 무너져 없어지는 것."],
  ],
  2: [
    ["사유", "어떤 일이나 문제를 깊이 생각하는 것."],
    ["점", "그림이나 옷 등의 수를 셀 때 사용하는 단위."],
    ["불상", "부처님의 모습을 본떠 만든 조각이나 그림."],
    ["유물", "옛날 사람들이 사용하거나 남긴 물건."],
  ],
  3: [
    ["일제 강점기", "1910년부터 1945년까지 우리나라가 일본의 지배를 받았던 시기."],
    ["골동품", "오래되었거나 드물어서 가치가 있는 옛날 물건."],
  ],
  4: [
    ["고분", "아주 오래전에 만들어진 옛날 무덤."],
    ["수도", "한 나라의 중앙 정부가 자리 잡고 있는 도시."],
    ["향로", "향을 피울 때 사용하는 작은 화로."],
  ],
  5: [
    ["도굴꾼", "옛날 무덤을 몰래 파헤쳐 물건을 훔치는 사람."],
    ["빼어나다", "다른 것들보다 훨씬 뛰어나다."],
  ],
  6: [
    ["제작", "재료를 사용해 물건이나 예술 작품을 만드는 일."],
    ["강수량", "일정한 기간에 비나 눈 등으로 내린 물의 양."],
  ],
  7: [
    ["짐작", "어떤 상황을 보고 대강 생각하거나 알아맞히는 것."],
    ["발명가", "이전에 없던 기술이나 물건을 새롭게 만들어 내는 사람."],
    ["보완하다", "부족하거나 모자란 부분을 채워 더 완전하게 만들다."],
    ["잣대", "길이를 재는 막대기. 어떤 일을 판단하는 기준이라는 뜻으로도 쓰임."],
  ],
  8: [
    ["소박하다", "지나치게 꾸미지 않고 수수하며 자연스럽다."],
    ["임진왜란", "1592년부터 1598년까지 일본이 조선을 침략하여 일어난 전쟁."],
    ["도공", "흙으로 도자기를 만드는 기술을 가진 사람."],
  ],
  9: [
    ["관측", "눈이나 기계를 이용해 날씨, 별, 자연현상 등을 살펴보는 일."],
    ["길흉", "어떤 일이 좋게 될지 나쁘게 될지를 나타내는 말."],
  ],
  10: [
    ["암자", "큰 절에 딸려 있거나 산속에 있는 작은 절."],
    ["뙈기", "일정하게 나뉜 논이나 밭을 세는 단위."],
    ["재상", "옛날 나라의 중요한 일을 맡아보던 높은 벼슬아치."],
    ["전생", "지금의 삶이 시작되기 이전의 삶."],
  ],
  11: [
    ["석공", "돌을 다듬어 물건이나 건축물을 만드는 기술자."],
  ],
  12: [
    ["경치", "산, 강, 바다, 들판 등 눈에 보이는 자연이나 주변의 모습."],
    ["처마", "지붕에서 벽 바깥쪽으로 길게 나온 부분."],
  ],
  13: [
    ["풍수지리", "땅의 모양과 방향 등을 살펴 좋은 자리를 찾으려는 전통적인 생각과 지식."],
    ["시련", "견디기 어렵고 힘든 일이나 고비."],
  ],
  14: [
    ["성곽", "옛날 적의 공격을 막기 위해 돌이나 흙으로 높이 쌓은 방어 시설."],
    ["국보", "나라에서 역사적·예술적·학술적 가치가 매우 크다고 인정해 지정한 귀중한 문화유산."],
    ["국가유산", "나라에서 보존하고 다음 세대에 물려줄 가치가 있는 문화유산과 자연유산 등의 자산."],
  ],
  15: [
    ["선비", "옛날에 학문과 예절을 중요하게 여기며 공부하던 사람."],
    ["숨결", "숨을 쉬는 기운. 비유적으로 어떤 대상에서 느껴지는 생생한 분위기나 정신."],
    ["기리다", "훌륭한 사람이나 업적을 칭찬하며 오래도록 기억하다."],
  ],
};

export const TREASURE_ACTIVE_DAYS = Object.keys(TREASURE_WORDS)
  .map(Number).sort((a, b) => a - b);
export const TREASURE_CARDS: DailyVocabularyCard[] = TREASURE_ACTIVE_DAYS.flatMap(day =>
  TREASURE_WORDS[day].map(([answer, clue], index) => ({
    id: "tr-" + String(day).padStart(2, "0") + "-" + String(index + 1).padStart(2, "0"),
    day, answer, clue,
  }))
);
export const TREASURE_BY_ID = new Map(TREASURE_CARDS.map(card => [card.id, card]));

export function treasureCardsForDay(day: number): DailyVocabularyCard[] {
  return TREASURE_CARDS.filter(card => card.day === day);
}
export function treasureCardsForFiveDayReview(end: number): DailyVocabularyCard[] {
  if (!FIVE_DAY_REVIEW_ENDS.some(day => day === end)) return [];
  return TREASURE_CARDS.filter(card => card.day >= end - 4 && card.day <= end);
}
