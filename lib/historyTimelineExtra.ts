import type { HistoryTimelineEvent } from "./historyTimeline";

/** 02·03호 교재의 두 연표와 본문을 대조한 누적 사건. */
export const HISTORY_TIMELINE_EXTRA_EVENTS: HistoryTimelineEvent[] = [
  {
    "id": "buyeo-four-chiefs",
    "sortYear": -99,
    "dateLabel": "여러 나라의 성장기 · 정확한 연도 미상",
    "stateOrEra": "부여",
    "eraFilter": "여러나라",
    "title": "부여의 네 부족장",
    "summary": "부여는 왕과 마가·우가·저가·구가가 나라의 여러 지역을 다스렸어요.",
    "life": "농사와 목축을 하며 살았고, 12월에는 영고라는 제천 행사를 열었어요.",
    "artifact": "부여의 법과 풍습 기록",
    "image": {
      "kind": "emoji",
      "value": "🐎",
      "alt": "부여의 네 부족장"
    },
    "textbookPages": [
      "PDF 20~21쪽 연표",
      "본문 20~25쪽"
    ],
    "sourceIssueNumbers": [
      2
    ]
  },
  {
    "id": "goguryeo-seookje",
    "sortYear": -99,
    "dateLabel": "여러 나라의 성장기 · 정확한 연도 미상",
    "stateOrEra": "고구려",
    "eraFilter": "여러나라",
    "title": "고구려의 서옥제",
    "summary": "고구려에는 혼인한 남편이 아내의 집에서 생활하는 서옥제 풍습이 있었어요.",
    "life": "가족의 혼인과 장례 등에는 각 지역의 특징적인 풍습이 있었어요.",
    "artifact": "서옥제에 관한 풍습 기록",
    "image": {
      "kind": "emoji",
      "value": "🏠",
      "alt": "고구려의 서옥제"
    },
    "textbookPages": [
      "PDF 20~21쪽 연표",
      "본문 23쪽"
    ],
    "sourceIssueNumbers": [
      2
    ]
  },
  {
    "id": "okjeo-marriage-custom",
    "sortYear": -99,
    "dateLabel": "여러 나라의 성장기 · 정확한 연도 미상",
    "stateOrEra": "옥저",
    "eraFilter": "여러나라",
    "title": "옥저의 민며느리제",
    "summary": "옥저에는 어린 여자가 장차 혼인할 집에서 생활하는 민며느리제 풍습이 있었어요.",
    "life": "바닷가에서 해산물과 소금을 얻었고 농사도 지었어요.",
    "artifact": "옥저의 생활 풍습 기록",
    "image": {
      "kind": "emoji",
      "value": "🌊",
      "alt": "옥저의 민며느리제"
    },
    "textbookPages": [
      "PDF 20~21쪽 연표",
      "본문 20~25쪽"
    ],
    "sourceIssueNumbers": [
      2
    ]
  },
  {
    "id": "dongye-mucheon",
    "sortYear": -99,
    "dateLabel": "여러 나라의 성장기 · 정확한 연도 미상",
    "stateOrEra": "동예",
    "eraFilter": "여러나라",
    "title": "동예의 무천과 책화",
    "summary": "동예 사람들은 10월에 무천이라는 제천 행사를 열었어요.",
    "life": "농사를 지었고, 다른 마을의 영역을 침범하면 보상하는 책화 풍습이 있었어요.",
    "artifact": "단궁 · 과하마 · 반어피",
    "image": {
      "kind": "emoji",
      "value": "🏹",
      "alt": "동예의 무천과 책화"
    },
    "textbookPages": [
      "PDF 20~21쪽 연표",
      "본문 20~25쪽"
    ],
    "sourceIssueNumbers": [
      2
    ]
  },
  {
    "id": "samhan-village-life",
    "sortYear": -99,
    "dateLabel": "여러 나라의 성장기 · 정확한 연도 미상",
    "stateOrEra": "삼한",
    "eraFilter": "여러나라",
    "title": "삼한의 마을과 소도",
    "summary": "삼한은 마한·진한·변한으로 이루어져 있었고, 제사를 맡은 천군이 있었어요.",
    "life": "벼농사가 발달했으며 소도처럼 제사를 위한 특별한 지역이 있었어요.",
    "artifact": "솟대 · 철기 도구",
    "image": {
      "kind": "emoji",
      "value": "🌾",
      "alt": "삼한의 마을과 소도"
    },
    "textbookPages": [
      "PDF 20~21쪽 연표",
      "본문 24~26쪽"
    ],
    "sourceIssueNumbers": [
      2
    ]
  },
  {
    "id": "goguryeo-jumong-founded",
    "sortYear": -37,
    "dateLabel": "기원전 37년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "주몽, 고구려를 세움",
    "summary": "주몽이 졸본 지역에 고구려를 세웠어요.",
    "life": "여러 부족이 함께 살며 나라의 기틀을 다졌어요.",
    "artifact": "졸본 지역의 고구려 유적",
    "image": {
      "kind": "emoji",
      "value": "🏹",
      "alt": "주몽, 고구려를 세움"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-domestic-capital",
    "sortYear": 3,
    "dateLabel": "3년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "국내성으로 수도를 옮김",
    "summary": "고구려가 수도를 국내성으로 옮겼어요.",
    "life": "산성과 도성을 이용해 나라를 지키고 다스렸어요.",
    "artifact": "국내성 · 환도산성 유적",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "국내성으로 수도를 옮김"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-jindae",
    "sortYear": 194,
    "dateLabel": "194년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "고국천왕, 진대법 실시",
    "summary": "고국천왕 때 어려운 백성을 돕는 진대법을 실시했어요.",
    "life": "봄에 곡식을 빌려주고 가을에 갚도록 하여 생활을 도왔어요.",
    "artifact": "진대법에 관한 역사 기록",
    "image": {
      "kind": "emoji",
      "value": "🌾",
      "alt": "고국천왕, 진대법 실시"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-buddhism",
    "sortYear": 372,
    "dateLabel": "372년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "소수림왕, 불교를 받아들임",
    "summary": "소수림왕 때 고구려가 불교를 공식적으로 받아들였어요.",
    "life": "불교를 통해 새로운 사상과 문화가 전해졌어요.",
    "artifact": "불상 · 절터 관련 자료",
    "image": {
      "kind": "emoji",
      "value": "🪷",
      "alt": "소수림왕, 불교를 받아들임"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-gwanggaeto-king",
    "sortYear": 391,
    "dateLabel": "391년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "광개토 대왕, 왕위에 오름",
    "summary": "광개토 대왕이 왕위에 올라 고구려의 영토를 넓혀 갔어요.",
    "life": "군사를 이끌고 주변 나라와 싸우며 나라의 힘을 키웠어요.",
    "artifact": "광개토 대왕릉비",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "광개토 대왕, 왕위에 오름"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-jangsu-king",
    "sortYear": 412,
    "dateLabel": "412년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "장수왕, 왕위에 오름",
    "summary": "장수왕이 왕위에 올라 고구려의 강성한 시기를 이어 갔어요.",
    "life": "넓은 영토를 다스리고 남쪽으로 세력을 뻗었어요.",
    "artifact": "광개토 대왕릉비(장수왕이 세움)",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "장수왕, 왕위에 오름"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-pyeongyang-move",
    "sortYear": 427,
    "dateLabel": "427년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "평양으로 수도를 옮김",
    "summary": "장수왕이 수도를 국내성에서 평양으로 옮겼어요.",
    "life": "남쪽으로 나아가기 유리한 평양을 중심으로 나라를 다스렸어요.",
    "artifact": "평양 일대 고구려 유적",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "평양으로 수도를 옮김"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-hanseong",
    "sortYear": 475,
    "dateLabel": "475년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "백제의 수도 한성을 빼앗음",
    "summary": "장수왕의 고구려 군대가 백제의 수도 한성을 공격해 차지했어요.",
    "life": "고구려의 남진으로 백제는 수도를 웅진으로 옮기게 되었어요.",
    "artifact": "고구려·백제의 영토 변화 지도",
    "image": {
      "kind": "emoji",
      "value": "🗺️",
      "alt": "백제의 수도 한성을 빼앗음"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-salsu",
    "sortYear": 612,
    "dateLabel": "612년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "살수 대첩",
    "summary": "을지문덕이 이끈 고구려 군대가 수나라 군대를 크게 물리쳤어요.",
    "life": "고구려 사람들은 수나라의 침략에 맞서 싸웠어요.",
    "artifact": "살수 대첩 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "살수 대첩"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-cheolli",
    "sortYear": 631,
    "dateLabel": "631년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "천리장성을 쌓음",
    "summary": "고구려가 외적의 침입에 대비하여 천리장성을 쌓기 시작했어요.",
    "life": "나라의 북쪽 경계를 지키기 위해 성을 쌓았어요.",
    "artifact": "천리장성 관련 유적·기록",
    "image": {
      "kind": "emoji",
      "value": "🧱",
      "alt": "천리장성을 쌓음"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-bojang",
    "sortYear": 642,
    "dateLabel": "642년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "보장왕, 왕위에 오름",
    "summary": "보장왕이 고구려의 왕위에 올랐어요.",
    "life": "이 무렵 연개소문이 정치의 실권을 쥐었어요.",
    "artifact": "보장왕과 연개소문 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "보장왕, 왕위에 오름"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-ansiseong",
    "sortYear": 645,
    "dateLabel": "645년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "안시성 싸움의 승리",
    "summary": "고구려가 당나라의 공격을 막아 내고 안시성 싸움에서 승리했어요.",
    "life": "성 안의 사람들과 군사들이 힘을 모아 성을 지켰어요.",
    "artifact": "안시성 전투 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "안시성 싸움의 승리"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-falls",
    "sortYear": 668,
    "dateLabel": "668년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "고구려 멸망",
    "summary": "고구려가 나당 연합군의 공격을 받아 멸망했어요.",
    "life": "나라가 멸망한 뒤에도 고구려를 다시 세우려는 움직임이 이어졌어요.",
    "artifact": "고구려 멸망 관련 역사 기록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "고구려 멸망"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "goguryeo-revival-fails",
    "sortYear": 673,
    "dateLabel": "673년",
    "stateOrEra": "고구려",
    "eraFilter": "고구려",
    "title": "고구려 부흥 운동 실패",
    "summary": "고구려를 다시 세우려는 움직임이 결국 실패했어요.",
    "life": "고구려 유민들의 일부는 다른 지역으로 옮겨 가기도 했어요.",
    "artifact": "고구려 부흥 운동 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "고구려 부흥 운동 실패"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  },
  {
    "id": "balhae-founded",
    "sortYear": 698,
    "dateLabel": "698년",
    "stateOrEra": "발해",
    "eraFilter": "여러나라",
    "title": "대조영, 발해를 세움",
    "summary": "대조영이 발해를 세웠어요.",
    "life": "고구려의 뒤를 잇는 나라를 세우려는 움직임이 이어졌어요.",
    "artifact": "발해 유적·기록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "대조영, 발해를 세움"
    },
    "textbookPages": [
      "PDF 6~7쪽 연표",
      "PDF 22~23쪽 연표"
    ],
    "sourceIssueNumbers": [
      3
    ]
  }
];
