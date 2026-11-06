import "server-only";
import { HISTORY_TIMELINE_BYEOLBYEOL_MORE_NOTES } from "./historyTimelineByeolbyeolMoreNotes";
import { HISTORY_TIMELINE_AUDITED_NOTES } from "./historyTimelineAuditedNotes";
import { HISTORY_TIMELINE_PHASE_TWO_ADVANCED_NOTES } from "./historyTimelinePhaseTwoAdvancedNotes";
import { HISTORY_TIMELINE_PHASE_TWO_BATCH_THREE_NOTES } from "./historyTimelinePhaseTwoBatchThreeNotes";

/**
 * 별별한국사 참고서·시대별 기출 자료를 대조하여 기존 연표의 요점에서 빠진 사실만 정리한다.
 * 책 문장을 복제하지 않고 새로 서술한 설명이다.
 * reference는 교사 내부 검증용이며 API 응답에 절대 포함하지 않는다.
 */
export type ByeolbyeolLevel = "basic" | "advanced";
export type ByeolbyeolNote = {
  level: ByeolbyeolLevel;
  heading: string;
  points: string[];
};
type VerifiedNote = ByeolbyeolNote & { reference: { book: string; printedPage: number } };

export const HISTORY_TIMELINE_BYEOLBYEOL_NOTES: Readonly<Record<string, VerifiedNote[]>> = {
  "prehistoric-paleolithic-begins": [
    {
      level: "advanced",
      heading: "전곡리의 주먹도끼",
      points: ["경기도 연천 전곡리에서 발견된 주먹도끼는 한반도 구석기 연구에 중요한 유물이에요.", "유물이 발견된 장소도 역사 시대를 판단할 때 중요한 단서가 돼요."],
      reference: { book: "별별한국사 시대별 기출문제(심화) I 선사 시대~여러 나라의 성장", printedPage: 8 },
    },
  ],
  "prehistoric-neolithic-begins": [
    {
      level: "basic",
      heading: "옷과 생활 도구의 변화",
      points: ["신석기 사람들은 가락바퀴를 이용해 실을 잣고, 뼈바늘로 옷을 만드는 데 필요한 바느질을 했어요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 13 },
    },
  ],
  "prehistoric-bronze-culture-spreads": [
    {
      level: "basic",
      heading: "청동기 시대에도 돌 도구를 사용했어요",
      points: ["청동기가 나타났어도 모든 농기구를 청동으로 만든 것은 아니에요.", "반달 돌칼은 이삭을 자르는 데 사용한 도구로, 농경 생활의 모습을 알려 줘요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 15 },
    },
  ],
  "gojoseon-dangun-founding": [
    {
      level: "basic",
      heading: "고조선의 법과 사회",
      points: ["고조선의 8조법은 모두 남아 있지 않고 일부 조항만 전해져요.", "전해지는 조항을 통해 당시 사회가 생명과 재산을 중요하게 여기고 신분의 차이가 있었음을 살펴볼 수 있어요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 15 },
    },
  ],
  "gojoseon-wiman-becomes-king": [
    {
      level: "basic",
      heading: "중계 무역이란?",
      points: ["중계 무역은 서로 다른 지역 사이에서 물품이 오가도록 연결하며 이익을 얻는 활동이에요.", "위만 조선은 중국의 한나라와 남쪽 여러 지역 사이의 교역에 관여하며 성장했어요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 15 },
    },
  ],
  "buyeo-four-chiefs": [
    {
      level: "basic",
      heading: "부여의 독특한 풍습",
      points: ["부여에는 도둑질한 물건의 열두 배를 갚도록 하는 1책 12법이 있었다고 전해져요.", "형이 죽으면 동생이 형의 아내와 혼인하는 형사취수제도 알려져 있어요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 17 },
    },
  ],
  "goguryeo-seookje": [
    {
      level: "basic",
      heading: "동맹과 제가 회의",
      points: ["고구려에서는 10월에 동맹이라는 제천 행사를 열었어요.", "왕과 여러 귀족 세력이 함께 중요한 일을 논의하던 제가 회의도 있었어요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 17 },
    },
  ],
  "okjeo-marriage-custom": [
    {
      level: "basic",
      heading: "옥저의 가족 공동 무덤",
      points: ["옥저에서는 가족의 뼈를 한데 모아 큰 나무 곽에 안치하는 가족 공동 무덤 풍습이 있었어요.", "옥저는 왕보다 읍군·삼로와 같은 지역의 우두머리가 여러 집단을 다스렸어요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 17 },
    },
  ],
  "dongye-mucheon": [
    {
      level: "basic",
      heading: "같은 씨족끼리 혼인하지 않았어요",
      points: ["동예에서는 같은 씨족 안에서 결혼하지 않는 족외혼 풍습이 있었다고 전해져요.", "다른 집단의 영역을 함부로 침범하지 않도록 한 책화와 함께 기억해요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 17 },
    },
  ],
  "samhan-village-life": [
    {
      level: "basic",
      heading: "삼한의 계절 행사",
      points: ["삼한에서는 농사와 연결된 5월과 10월에 제사를 지내고 함께 즐기는 행사가 있었어요.", "정치 지도자인 신지·읍차와 제사를 담당하는 천군의 역할이 구분되기도 했어요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 17 },
    },
  ],
  "goguryeo-gwanggaeto-king": [
    {
      level: "basic",
      heading: "광개토 대왕의 연호",
      points: ["광개토 대왕은 영락이라는 독자적인 연호를 사용했어요.", "연호는 연도를 나타내는 이름으로, 왕이 나라의 권위를 드러내는 방법이기도 했어요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 23 },
    },
  ],
  "goguryeo-jangsu-king": [
    {
      level: "basic",
      heading: "장수왕이 남긴 두 비석",
      points: ["장수왕은 광개토 대왕의 업적을 기리는 광개토 대왕릉비를 세웠어요.", "충주 고구려비는 고구려가 한반도 중부 지역까지 영향력을 넓혔음을 보여 주는 유물이에요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 23 },
    },
  ],
  "baekje-geunchogo-king": [
    {
      level: "basic",
      heading: "근초고왕 때의 기록과 전쟁",
      points: ["근초고왕 때 백제는 고구려를 공격하여 고국원왕이 전사하는 일이 있었어요.", "박사 고흥이 백제의 역사서인 서기를 편찬했다고 전해지지만, 그 책은 현재 남아 있지 않아요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 25 },
    },
  ],
  "baekje-muryeong-king": [
    {
      level: "basic",
      heading: "22담로에 왕족을 보내다",
      points: ["무령왕은 지방 통제를 강화하기 위해 22담로에 왕족을 파견했어요.", "왕족을 지방에 보내는 일은 중앙의 왕권이 지방에 미치도록 하려는 정책이었어요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 25 },
    },
  ],
  "silla-jinheung-king": [
    {
      level: "basic",
      heading: "진흥왕이 남긴 비석",
      points: ["진흥왕의 순수비는 왕이 새로 넓힌 지역을 돌아보고 세운 비석이에요.", "단양 적성비도 신라가 한강 유역 쪽으로 진출하는 과정을 살펴볼 때 중요한 자료예요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 27 },
    },
  ],
  "balhae-sanggyeong": [
    {
      level: "basic",
      heading: "발해의 중앙·지방 통치",
      points: ["발해는 중앙에 3성 6부를 두고, 지방에 5경 15부 62주를 마련해 넓은 영토를 다스렸어요.", "당나라의 제도를 참고했지만 발해의 실정에 맞게 운영했어요."],
      reference: { book: "별별 한국사 능력검정시험 기본", printedPage: 39 },
    },
  ],
};

/** 공개 화면에는 검증용 서지 정보나 업로드 원본을 내보내지 않는다. */
export function getByeolbyeolPublicNotes(eventIds: Iterable<string>): Record<string, ByeolbyeolNote[]> {
  const result: Record<string, ByeolbyeolNote[]> = {};
  for (const id of eventIds) {
    const notes = [
      ...(HISTORY_TIMELINE_BYEOLBYEOL_NOTES[id] ?? []),
      ...(HISTORY_TIMELINE_BYEOLBYEOL_MORE_NOTES[id] ?? []),
      ...(HISTORY_TIMELINE_AUDITED_NOTES[id] ?? []),
      ...(HISTORY_TIMELINE_PHASE_TWO_ADVANCED_NOTES[id] ?? []),
      ...(HISTORY_TIMELINE_PHASE_TWO_BATCH_THREE_NOTES[id] ?? []),
    ];
    if (!notes?.length) continue;
    result[id] = notes.map(({ level, heading, points }) => ({
      level,
      heading,
      points: [...points],
    }));
  }
  return result;
}
