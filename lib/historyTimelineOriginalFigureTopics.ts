import type { HistoryTimelineStudyTopic } from "./historyTimelineGoryeoTopics";

/**
 * 별꼼역사 원본 인쇄 쪽수에서 직접 확인한 인물 학습 주제.
 * 서로 다른 사건의 연도를 임의로 만들지 않고, 해당 교재 호수 권한만 적용한다.
 * 7호 건국 관련 이야기는 전승으로 표시하며 역사적으로 확정된 사실과 구별한다.
 */
export const HISTORY_TIMELINE_ORIGINAL_FIGURE_TOPICS: HistoryTimelineStudyTopic[] = [
  {
    id: "topic-05-baekje-early-and-culture",
    issue: 5, period: "three", nation: "백제",
    title: "책계왕과 백제 문화 교류 인물",
    pages: "5호 교재 13, 23~24, 27쪽",
    points: [
      "책계왕은 고이왕의 아들로 교재의 백제 왕 계보에 등장해요.",
      "왕인은 백제의 학문을 왜에 전한 인물로 소개돼요.",
      "마라난타는 침류왕 때 백제에 불교를 전한 승려예요.",
    ],
  },
  {
    id: "topic-07-silla-founding-tales",
    issue: 7, period: "three", nation: "신라",
    title: "신라 왕실의 건국 전승에 등장하는 인물",
    pages: "7호 교재 7~10, 15쪽",
    points: [
      "알영 부인은 박혁거세와 함께 신라의 건국 이야기 속에 등장해요.",
      "남해왕은 박혁거세의 뒤를 이은 신라 왕으로 소개돼요.",
      "석탈해는 신라 초기 왕위에 오른 인물로 전해져요.",
      "김알지는 신라 김씨 왕실의 기원과 관련된 이야기 속 인물이에요.",
      "건국 전승을 역사적으로 확정된 날짜나 사건으로 단정하지 않아요.",
    ],
  },
  {
    id: "topic-07-silla-buddhism",
    issue: 7, period: "three", nation: "신라",
    title: "불교와 화랑을 통해 신라에 영향을 준 인물",
    pages: "7호 교재 20~22쪽",
    points: [
      "이차돈의 이야기는 법흥왕 때 신라가 불교를 받아들이는 과정과 관련돼요.",
      "원광은 화랑에게 지켜야 할 가르침을 전한 승려로 소개돼요.",
    ],
  },
  {
    id: "topic-07-silla-expansion",
    issue: 7, period: "three", nation: "신라",
    title: "신라 영토 확대와 왕실의 인물",
    pages: "7호 교재 26~27, 32쪽",
    points: [
      "이사부는 진흥왕 때 우산국 등과 관련한 신라의 장군으로 소개돼요.",
      "사다함은 화랑 출신으로 대가야 공격에 참여한 인물이에요.",
      "김용춘은 선덕여왕 때 왕실과 정치를 도운 인물로 교재에 등장해요.",
    ],
  },
  {
    id: "topic-10-goryeo-foundation-allies",
    issue: 10, period: "goryeo",
    title: "왕건을 도운 장수와 호족",
    pages: "10호 교재 8~10, 14~15쪽",
    points: [
      "홍유와 신숭겸은 왕건을 도운 장수로 교재에서 소개돼요.",
      "김선평·권행·장길은 고창 전투 때 왕건을 도운 호족들이에요.",
    ],
  },
  {
    id: "topic-10-later-baekje-succession",
    issue: 10, period: "goryeo",
    title: "후백제의 왕위 다툼",
    pages: "10호 교재 12~13쪽",
    points: [
      "견훤의 아들 신검과 금강은 후백제의 왕위 다툼과 관련된 인물이에요.",
      "후백제의 내부 갈등은 고려의 후삼국 통일 과정과 이어져요.",
    ],
  },
  {
    id: "topic-10-balhae-refugees",
    issue: 10, period: "goryeo",
    title: "고려로 들어온 발해의 왕자",
    pages: "10호 교재 18~19쪽",
    points: [
      "대광현은 발해의 왕자로, 발해 멸망 뒤 고려로 와서 왕건의 환대를 받았다고 교재에 소개돼요.",
    ],
  },
  {
    id: "topic-10-goryeo-kings-and-reforms",
    issue: 10, period: "goryeo",
    title: "고려 초기의 왕위 다툼과 제도",
    pages: "10호 교재 22~23, 29쪽",
    points: [
      "왕규는 고려 초기의 왕위 다툼인 왕규의 난과 관련된 인물이에요.",
      "정종은 고려의 왕으로 왕위를 둘러싼 갈등을 겪었어요.",
      "왕식렴은 정종을 도와 왕규의 세력을 제압한 인물로 소개돼요.",
      "쌍기는 광종에게 과거제 시행을 건의한 인물이에요.",
    ],
  },
  {
    id: "topic-12-goryeo-aristocratic-struggles",
    issue: 12, period: "goryeo",
    title: "이자겸·묘청 관련 고려 인물",
    pages: "12호 교재 10~11, 19쪽",
    points: [
      "척준경은 이자겸과 관련한 정치적 갈등에서 활약한 장수예요.",
      "최사전은 이자겸의 난을 진압하는 과정에 관여한 인물로 소개돼요.",
      "정지상은 묘청과 관련된 서경 천도 운동의 배경에 등장하는 문인이에요.",
    ],
  },
  {
    id: "topic-12-goryeo-military-rule-figures",
    issue: 12, period: "goryeo",
    title: "무신 정권의 시작과 권력 다툼",
    pages: "12호 교재 16~17, 22~23, 26, 30~31쪽",
    points: [
      "의종은 고려에서 무신 정변이 일어날 당시의 왕이에요.",
      "이소응은 무신 정변 전후의 무신 차별을 보여 주는 교재 이야기 속 장수예요.",
      "이고와 이의방은 무신 정변에 참여한 장수들이에요.",
      "박진재는 최충헌과 관련된 권력 다툼에 등장하는 인물이에요.",
      "이의민은 무신 집권기 권력을 잡은 인물이에요.",
    ],
  },
];
