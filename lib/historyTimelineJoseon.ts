import type { HistoryTimelineEvent } from "./historyTimeline";
import type { TimelineStudyNotesIndex } from "./historyTimelineStudyTypes";

/**
 * 별꼼역사 14호 《선비의 나라 조선》과 15호 《위대한 세종과 한글》을 대조.
 * 두 교재에 반복되는 1418년 세종 즉위·1420년 집현전·1443년 훈민정음 등은
 * 하나의 사건 ID에 호수별 학습 요점을 함께 연결한다.
 * 1392년 조선 건국은 고려 멸망과 관련되어 있지만 별도 왕조 사건으로 유지한다.
 */
export const HISTORY_TIMELINE_JOSEON_EVENTS: HistoryTimelineEvent[] = [
  {
    "id": "joseon-jeong-mongju-1392",
    "sortYear": 1392,
    "dateLabel": "1392년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "정몽주가 죽임을 당함",
    "summary": "새 왕조를 세우려는 세력과 고려를 지키려는 세력이 맞섰고 정몽주가 살해되었어요.",
    "life": "정몽주는 고려를 지키려 했던 신하로 기억돼요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "정몽주가 죽임을 당함"
    },
    "textbookPages": [
      "14호 4~7쪽"
    ],
    "sourceIssueNumbers": [
      14
    ]
  },
  {
    "id": "joseon-founded-1392",
    "sortYear": 1392,
    "dateLabel": "1392년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "이성계가 조선을 세움",
    "summary": "이성계가 1392년 왕위에 올라 새 왕조 조선을 세웠어요.",
    "life": "고려가 끝나고 조선이 시작되었으며, 유교의 가르침을 정치의 중심에 두려 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "이성계가 조선을 세움"
    },
    "textbookPages": [
      "14호 4~9쪽"
    ],
    "sourceIssueNumbers": [
      14,
      15
    ]
  },
  {
    "id": "joseon-hanyang-capital-1394",
    "sortYear": 1394,
    "dateLabel": "1394년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "조선이 한양으로 수도를 옮김",
    "summary": "조선이 새 수도를 한양(오늘날 서울)으로 정했어요.",
    "life": "한양의 지리적 위치를 이용해 새 궁궐과 도성, 도로 등을 마련했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "조선이 한양으로 수도를 옮김"
    },
    "textbookPages": [
      "14호 4~5, 10~17쪽"
    ],
    "sourceIssueNumbers": [
      14
    ]
  },
  {
    "id": "joseon-hanyang-walls-1396",
    "sortYear": 1396,
    "dateLabel": "1396년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "한양의 도성을 완성함",
    "summary": "조선이 한양을 둘러싼 도성의 성곽을 건설했어요.",
    "life": "도성의 문과 성곽은 수도를 보호하고 공간을 구분하는 역할을 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "한양의 도성을 완성함"
    },
    "textbookPages": [
      "14호 4~5, 14~17쪽"
    ],
    "sourceIssueNumbers": [
      14
    ]
  },
  {
    "id": "joseon-jeong-dojeon-falls-1398",
    "sortYear": 1398,
    "dateLabel": "1398년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "정도전이 죽임을 당함",
    "summary": "왕위 계승과 정치 권력을 둘러싼 갈등 속에서 정도전이 죽임을 당했어요.",
    "life": "이방원이 중심이 된 세력이 권력을 잡는 중요한 계기가 되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "정도전이 죽임을 당함"
    },
    "textbookPages": [
      "14호 4~5, 18~23쪽"
    ],
    "sourceIssueNumbers": [
      14
    ]
  },
  {
    "id": "joseon-taejong-1400",
    "sortYear": 1400,
    "dateLabel": "1400년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "태종이 왕위에 오름",
    "summary": "이방원이 태종으로 왕위에 올라 왕권 강화 정책을 추진했어요.",
    "life": "태종은 왕 중심의 통치 제도를 정비하려 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "태종이 왕위에 오름"
    },
    "textbookPages": [
      "14호 4~5, 20~25쪽"
    ],
    "sourceIssueNumbers": [
      14
    ]
  },
  {
    "id": "joseon-eight-provinces-1413",
    "sortYear": 1413,
    "dateLabel": "1413년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "조선이 8도 지방 행정 조직을 완성함",
    "summary": "조선의 지방을 8도로 구분해 중앙에서 지방을 다스릴 체계를 정비했어요.",
    "life": "각 도에 관찰사를 파견하고 지역에는 수령을 두었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🗺️",
      "alt": "조선이 8도 지방 행정 조직을 완성함"
    },
    "textbookPages": [
      "14호 4~5, 24~27쪽"
    ],
    "sourceIssueNumbers": [
      14
    ]
  },
  {
    "id": "joseon-sejong-1418",
    "sortYear": 1418,
    "dateLabel": "1418년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "세종이 왕위에 오름",
    "summary": "태종의 뒤를 이어 세종이 왕위에 올랐어요.",
    "life": "세종은 학문과 과학 기술을 장려하고 백성을 위한 정책을 추진했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "세종이 왕위에 오름"
    },
    "textbookPages": [
      "14호 4~5쪽 · 15호 4~7쪽"
    ],
    "sourceIssueNumbers": [
      14,
      15
    ]
  },
  {
    "id": "joseon-jiphyeonjeon-1420",
    "sortYear": 1420,
    "dateLabel": "1420년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "세종이 집현전을 설치함",
    "summary": "세종이 학문을 연구하고 나라의 정책을 논의하기 위해 집현전을 설치했어요.",
    "life": "집현전의 학자들은 여러 책을 연구하고 세종의 정책을 도왔어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📚",
      "alt": "세종이 집현전을 설치함"
    },
    "textbookPages": [
      "14호 4~5쪽 · 15호 4~11쪽"
    ],
    "sourceIssueNumbers": [
      14,
      15
    ]
  },
  {
    "id": "joseon-nongsajikseol-1429",
    "sortYear": 1429,
    "dateLabel": "1429년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "정초와 변효문이 『농사직설』을 편찬함",
    "summary": "정초·변효문 등이 우리나라의 농사 경험을 모아 『농사직설』을 편찬했어요.",
    "life": "지역에 맞는 농사법을 정리해 농민에게 도움이 되도록 하려 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🌾",
      "alt": "정초와 변효문이 『농사직설』을 편찬함"
    },
    "textbookPages": [
      "14호 4~5쪽 · 15호 24~29쪽"
    ],
    "sourceIssueNumbers": [
      14,
      15
    ]
  },
  {
    "id": "joseon-hunminjeongeum-1443",
    "sortYear": 1443,
    "dateLabel": "1443년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "세종이 훈민정음을 창제함",
    "summary": "세종이 백성이 쉽게 배우고 쓸 수 있는 새로운 문자 훈민정음을 만들었어요.",
    "life": "우리말의 소리를 적을 수 있도록 자음과 모음을 체계적으로 만들었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "✍️",
      "alt": "세종이 훈민정음을 창제함"
    },
    "textbookPages": [
      "14호 4~5쪽 · 15호 4~5, 10~13쪽"
    ],
    "sourceIssueNumbers": [
      14,
      15
    ]
  }
];

export const HISTORY_STUDY_JOSEON: TimelineStudyNotesIndex = {
  "joseon-jeong-mongju-1392": [
    [
      14,
      "고려를 지키려 한 정몽주",
      "고려 말에는 새 나라를 세우려는 사람들과 고려의 개혁을 주장하는 사람들이 대립했어요.",
      "정몽주의 죽음은 조선 건국 직전의 정치 갈등을 보여 줘요."
    ]
  ],
  "joseon-founded-1392": [
    [
      14,
      "이성계와 새로운 나라 조선",
      "이성계는 고려 말 개혁 세력과 함께 새 나라를 세웠어요.",
      "조선은 불교보다 유교의 정치 이념을 중요하게 생각했어요.",
      "나라가 바뀐 1392년은 고려의 끝과 조선의 시작을 함께 이해하는 해예요."
    ],
    [
      15,
      "조선의 시작과 세종의 시대",
      "1392년 이성계가 조선을 세웠다는 사실은 세종의 업적보다 앞선 역사적 배경이에요.",
      "1418년 세종 즉위부터 조선의 학문과 제도가 발전한 과정을 살펴봐요."
    ]
  ],
  "joseon-hanyang-capital-1394": [
    [
      14,
      "한양이 수도가 된 까닭",
      "조선은 고려의 수도 개경에서 한양으로 정치 중심지를 옮겼어요.",
      "한양에는 경복궁 등 궁궐과 도성을 갖추어 새 왕조의 수도를 정비했어요."
    ]
  ],
  "joseon-hanyang-walls-1396": [
    [
      14,
      "한양도성의 건설",
      "새 수도 한양의 방어와 도시 운영을 위해 성벽을 쌓았어요.",
      "숭례문과 흥인지문 등 성문을 통해 오늘날에도 도성의 흔적을 살펴볼 수 있어요."
    ]
  ],
  "joseon-jeong-dojeon-falls-1398": [
    [
      14,
      "정도전과 왕자들의 충돌",
      "정도전은 새 나라의 제도와 유교 정치의 기틀을 마련하는 데 큰 역할을 했어요.",
      "왕자 이방원과 정치의 주도권을 둘러싸고 대립했고, 1398년에 죽임을 당했어요.",
      "조선 초기 왕권과 신하의 권한에 관한 갈등을 보여 줘요."
    ]
  ],
  "joseon-taejong-1400": [
    [
      14,
      "태종이 왕권을 강화한 방법",
      "태종은 왕자들 사이의 권력 다툼을 거쳐 왕위에 올랐어요.",
      "왕의 권한을 키우기 위해 관청과 관리 제도를 정비했어요.",
      "호패법과 신문고 등 백성을 다스리기 위한 제도도 함께 살펴봐요."
    ]
  ],
  "joseon-eight-provinces-1413": [
    [
      14,
      "8도와 지방 관리",
      "조선은 전국을 8도로 나누고 관찰사가 지방을 살피도록 했어요.",
      "고을에는 수령을 파견해 행정과 재판 등의 일을 맡겼어요.",
      "지도 자료는 실물이 연결되기 전까지 자료 영역에서 보여 주지 않아요."
    ]
  ],
  "joseon-sejong-1418": [
    [
      14,
      "세종 즉위",
      "세종은 1418년 왕위에 올라 나라의 학문과 제도를 발전시키려 했어요.",
      "세종이 추진한 여러 정책은 왕과 신하들이 함께 연구하는 방식과 연결돼요."
    ],
    [
      15,
      "세종이 백성을 위해 한 일",
      "세종은 1418년 왕위에 올라 신하들의 의견을 듣고 학문을 장려했어요.",
      "백성의 생활을 편리하게 하는 기술·농사·문자를 발전시키려 했어요."
    ]
  ],
  "joseon-jiphyeonjeon-1420": [
    [
      14,
      "집현전과 세종의 학문 정책",
      "집현전은 학자들이 연구하고 책을 편찬하던 기관이에요.",
      "세종은 집현전의 학자들과 함께 여러 학문과 국가 정책을 발전시키려 했어요.",
      "한글 창제와 관련한 집현전 학자들의 활동도 살펴봐요."
    ],
    [
      15,
      "집현전 학자들과 세종",
      "세종은 집현전을 두어 학자들이 연구와 책 편찬을 하게 했어요.",
      "집현전 학자들이 학문 연구를 하며 새로운 문자 제작과 국가 정책에 힘을 보탰어요."
    ]
  ],
  "joseon-nongsajikseol-1429": [
    [
      14,
      "『농사직설』과 농사",
      "농민의 경험을 모아 우리나라 땅과 기후에 맞는 농사법을 정리했어요.",
      "세종 때 농사를 잘 짓도록 돕는 정책과 책이 중요하게 여겨졌어요.",
      "책을 만들었다고 농사 방법이 즉시 모두 바뀐 것은 아니에요."
    ],
    [
      15,
      "농사를 돕는 지혜",
      "조선은 농민들이 더 나은 농사법을 활용할 수 있게 경험과 기술을 정리했어요.",
      "농사법이 발전하면 백성의 먹을거리와 생활도 달라질 수 있어요."
    ]
  ],
  "joseon-hunminjeongeum-1443": [
    [
      14,
      "훈민정음이 만들어진 까닭",
      "당시 백성들은 배우기 어려운 한자를 써야 해서 자신의 생각을 글로 나타내기 힘들었어요.",
      "세종은 우리말 소리를 적을 수 있는 문자를 만들고 훈민정음이라는 이름을 붙였어요.",
      "1443년은 창제 연도이며, 널리 펴낸 시기와는 구별해야 해요."
    ],
    [
      15,
      "쉽게 읽고 쓰는 우리 글",
      "세종은 어려운 한자 대신 우리말을 적을 수 있는 새 문자를 만들었어요.",
      "훈민정음은 자음과 모음을 결합해 다양한 소리를 나타낼 수 있도록 고안했어요.",
      "교재에 실린 『훈민정음』 해례본을 통해 글자를 만든 원리를 살펴봐요."
    ]
  ]
};
