import type { HistoryTimelineEvent } from "./historyTimeline";

/**
 * 별꼼역사 7~9호 본문과 각 호 6~7쪽의 연표를 대조한 사건.
 * 불확실한 시기·건국 전승은 화면의 날짜 표시에 명시한다.
 * 신라는 통일 이후에도 동일한 국가 열(stateOrEra: "신라")을 사용한다.
 * 후삼국의 세 나라 중 신라와 새 후백제·후고구려는 서로 다른 열로 표시한다.
 */
export const HISTORY_TIMELINE_SILLA_BALHAE_EVENTS: HistoryTimelineEvent[] = [
  {
    "id": "silla-founded",
    "sortYear": -57,
    "dateLabel": "기원전 57년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "박혁거세, 신라를 세움",
    "summary": "박혁거세가 신라의 첫 왕으로 세워졌다고 전해져요.",
    "life": "처음에는 사로국으로 시작해 주변 세력과 함께 성장했어요.",
    "artifact": "경주 오릉과 건국 전승",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "박혁거세, 신라를 세움"
    },
    "textbookPages": [
      "7호 6~9쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-yuri-king",
    "sortYear": 24,
    "dateLabel": "24년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "유리왕, 왕위에 오름",
    "summary": "유리왕이 신라의 왕위에 올랐어요.",
    "life": "신라는 박씨·석씨·김씨가 왕위를 이어 가며 성장했어요.",
    "artifact": "신라 초기 왕실 기록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "유리왕, 왕위에 오름"
    },
    "textbookPages": [
      "7호 6~11쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "gaya-suro-founded",
    "sortYear": 42,
    "dateLabel": "42년(건국 전승)",
    "stateOrEra": "가야",
    "eraFilter": "가야",
    "title": "수로왕, 금관가야를 세움",
    "summary": "수로왕이 금관가야를 세웠다고 전해져요.",
    "life": "가야의 여러 나라가 낙동강 주변을 중심으로 성장했어요.",
    "artifact": "김해 수로왕릉·구지봉",
    "image": {
      "kind": "emoji",
      "value": "🏺",
      "alt": "수로왕, 금관가야를 세움"
    },
    "textbookPages": [
      "7호 6~7쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "gaya-suro-dies",
    "sortYear": 199,
    "dateLabel": "199년(전승)",
    "stateOrEra": "가야",
    "eraFilter": "가야",
    "title": "수로왕이 세상을 떠남",
    "summary": "금관가야 건국 이야기에서 수로왕이 세상을 떠난 시기로 전해져요.",
    "life": "가야는 철을 만들고 교역하며 성장했어요.",
    "artifact": "수로왕 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "수로왕이 세상을 떠남"
    },
    "textbookPages": [
      "7호 6~7쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-naemul-king",
    "sortYear": 356,
    "dateLabel": "356년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "내물왕, 왕위에 오름",
    "summary": "내물왕 때 김씨가 왕위를 이어 가는 체제가 굳어졌어요.",
    "life": "고구려의 도움을 받아 외적의 침입을 막기도 했어요.",
    "artifact": "신라 왕실과 경주 고분군",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "내물왕, 왕위에 오름"
    },
    "textbookPages": [
      "7호 6~15쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-goguryeo-support",
    "sortYear": 400,
    "dateLabel": "400년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "신라, 고구려의 도움을 받음",
    "summary": "고구려 광개토 대왕이 신라를 돕기 위해 군대를 보냈어요.",
    "life": "신라는 가야와 왜의 공격에 맞섰고 고구려의 영향을 받았어요.",
    "artifact": "광개토 대왕릉비에 남은 기록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "신라, 고구려의 도움을 받음"
    },
    "textbookPages": [
      "7호 6~15쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-jijeung-reform",
    "sortYear": 503,
    "dateLabel": "503년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "지증왕, 나라 이름을 신라로 정함",
    "summary": "지증왕이 나라 이름을 신라로 정하고 왕의 칭호를 사용했어요.",
    "life": "나라를 다스리는 제도가 정비되었어요.",
    "artifact": "지증왕 관련 역사 기록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "지증왕, 나라 이름을 신라로 정함"
    },
    "textbookPages": [
      "7호 18~21쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-beopheung-laws",
    "sortYear": 520,
    "dateLabel": "520년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "법흥왕, 율령을 반포함",
    "summary": "법흥왕이 나라의 법과 제도를 정비했어요.",
    "life": "관리와 백성이 따라야 할 규칙이 마련되었어요.",
    "artifact": "율령과 신라 관등제 기록",
    "image": {
      "kind": "emoji",
      "value": "⚖️",
      "alt": "법흥왕, 율령을 반포함"
    },
    "textbookPages": [
      "7호 18~23쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-daegaya-alliance",
    "sortYear": 522,
    "dateLabel": "522년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "신라와 대가야, 혼인 동맹을 맺음",
    "summary": "신라와 대가야가 혼인을 통해 관계를 맺으려 했어요.",
    "life": "신라와 가야의 관계가 계속 변화했어요.",
    "artifact": "신라·대가야 관계 기록",
    "image": {
      "kind": "emoji",
      "value": "🤝",
      "alt": "신라와 대가야, 혼인 동맹을 맺음"
    },
    "textbookPages": [
      "7호 6~7쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-buddhism",
    "sortYear": 527,
    "dateLabel": "527년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "법흥왕, 불교를 공식적으로 받아들임",
    "summary": "이차돈의 순교를 계기로 불교가 공인되었다고 전해져요.",
    "life": "불교는 신라 왕권과 문화의 발전에 영향을 주었어요.",
    "artifact": "이차돈 순교 관련 기록·신라 불상",
    "image": {
      "kind": "emoji",
      "value": "🪷",
      "alt": "법흥왕, 불교를 공식적으로 받아들임"
    },
    "textbookPages": [
      "7호 18~25쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-jinheung-king",
    "sortYear": 540,
    "dateLabel": "540년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "진흥왕, 왕위에 오름",
    "summary": "진흥왕이 왕위에 올라 신라의 영토를 넓혔어요.",
    "life": "한강 유역 등으로 세력을 확장했어요.",
    "artifact": "진흥왕 순수비",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "진흥왕, 왕위에 오름"
    },
    "textbookPages": [
      "7호 18~29쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "gaya-daegaya-falls",
    "sortYear": 562,
    "dateLabel": "562년",
    "stateOrEra": "가야",
    "eraFilter": "가야",
    "title": "대가야 멸망",
    "summary": "대가야가 신라에 정복되면서 가야의 여러 나라가 사라졌어요.",
    "life": "가야의 철기 문화와 여러 전통은 이후에도 영향을 남겼어요.",
    "artifact": "고령 지산동 고분군",
    "image": {
      "kind": "emoji",
      "value": "🏛️",
      "alt": "대가야 멸망"
    },
    "textbookPages": [
      "7호 6~7쪽·26~29쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-seondeok-queen",
    "sortYear": 632,
    "dateLabel": "632년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "선덕여왕, 왕위에 오름",
    "summary": "선덕여왕이 신라의 왕위에 올랐어요.",
    "life": "선덕여왕 때 신라의 불교문화와 국가 사업이 발전했어요.",
    "artifact": "첨성대·황룡사 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "선덕여왕, 왕위에 오름"
    },
    "textbookPages": [
      "7호 30~35쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-astronomy",
    "sortYear": 635,
    "dateLabel": "선덕여왕 재위기(632~647년)",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "첨성대 등 신라의 과학·문화 발전",
    "summary": "선덕여왕 때 천문 관측과 불교문화 관련 사업이 이루어졌어요.",
    "life": "첨성대는 신라의 과학 문화를 살펴볼 수 있는 유적이에요.",
    "artifact": "경주 첨성대",
    "image": {
      "kind": "emoji",
      "value": "🔭",
      "alt": "첨성대 등 신라의 과학·문화 발전"
    },
    "textbookPages": [
      "7호 30~35쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-hwangnyongsa",
    "sortYear": 645,
    "dateLabel": "645년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "황룡사 구층 목탑을 세움",
    "summary": "선덕여왕 때 황룡사에 커다란 목탑을 완성했어요.",
    "life": "나라의 안녕과 삼국 통일을 바라는 뜻을 담았어요.",
    "artifact": "황룡사 구층 목탑 터",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "황룡사 구층 목탑을 세움"
    },
    "textbookPages": [
      "7호 30~37쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-kimchunchu-tang",
    "sortYear": 648,
    "dateLabel": "648년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "김춘추, 당나라에 도움을 요청함",
    "summary": "김춘추가 당나라에 가서 신라와 당나라의 협력을 추진했어요.",
    "life": "신라는 백제·고구려와의 전쟁을 앞두고 외교 관계를 바꾸었어요.",
    "artifact": "김춘추의 대당 외교 기록",
    "image": {
      "kind": "emoji",
      "value": "🤝",
      "alt": "김춘추, 당나라에 도움을 요청함"
    },
    "textbookPages": [
      "7호 30~41쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-natang-campaign",
    "sortYear": 660,
    "dateLabel": "660년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "신라와 당나라, 백제를 공격함",
    "summary": "신라와 당나라가 연합해 백제를 공격했어요.",
    "life": "같은 해 백제는 멸망했으며 이후 고구려를 둘러싼 전쟁이 이어졌어요.",
    "artifact": "백제 멸망 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "신라와 당나라, 백제를 공격함"
    },
    "textbookPages": [
      "7호 38~41쪽"
    ],
    "sourceIssueNumbers": [
      7
    ]
  },
  {
    "id": "silla-unification",
    "sortYear": 676,
    "dateLabel": "676년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "신라, 삼국 통일을 완성함",
    "summary": "신라가 당나라의 세력을 물리치고 삼국 통일을 완성했어요.",
    "life": "신라의 역사는 끊기지 않고 통일 이후의 신라로 이어졌어요.",
    "artifact": "나당 전쟁과 삼국 통일 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🌟",
      "alt": "신라, 삼국 통일을 완성함"
    },
    "textbookPages": [
      "7호 6~7쪽·40~43쪽 / 8·9호 6~7쪽"
    ],
    "sourceIssueNumbers": [
      7,
      8,
      9
    ]
  },
  {
    "id": "silla-nine-provinces",
    "sortYear": 685,
    "dateLabel": "685년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "신문왕, 9주 5소경을 정비함",
    "summary": "신문왕이 전국을 9주 5소경으로 나누어 통치 체제를 정비했어요.",
    "life": "통일 이후 넓어진 영역을 관리하기 위한 제도였어요.",
    "artifact": "9주 5소경 지도",
    "image": {
      "kind": "emoji",
      "value": "🗺️",
      "alt": "신문왕, 9주 5소경을 정비함"
    },
    "textbookPages": [
      "8·9호 6~7쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "silla-wonhyo-dies",
    "sortYear": 686,
    "dateLabel": "686년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "원효가 세상을 떠남",
    "summary": "불교 사상을 널리 알린 원효가 세상을 떠났어요.",
    "life": "원효는 사람들이 불교를 쉽게 이해하도록 힘썼어요.",
    "artifact": "원효 관련 역사 기록",
    "image": {
      "kind": "emoji",
      "value": "🪷",
      "alt": "원효가 세상을 떠남"
    },
    "textbookPages": [
      "8·9호 6~7쪽·8호 14~19쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "silla-sinmun-reform",
    "sortYear": 689,
    "dateLabel": "689년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "신문왕, 녹읍을 폐지함",
    "summary": "신문왕이 관리에게 주던 녹읍을 폐지해 왕권을 강화하려 했어요.",
    "life": "귀족의 경제적 기반을 약화시키려는 정책이었어요.",
    "artifact": "신문왕 통치 제도 기록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "신문왕, 녹읍을 폐지함"
    },
    "textbookPages": [
      "8·9호 6~7쪽·8호 20~25쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "silla-uisang-dies",
    "sortYear": 702,
    "dateLabel": "702년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "의상이 세상을 떠남",
    "summary": "화엄 사상을 전한 의상이 세상을 떠났어요.",
    "life": "의상은 부석사 등 불교문화 발전에 영향을 주었어요.",
    "artifact": "의상·부석사 관련 유적",
    "image": {
      "kind": "emoji",
      "value": "🪷",
      "alt": "의상이 세상을 떠남"
    },
    "textbookPages": [
      "8·9호 6~7쪽·8호 14~17쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "balhae-deungju-attack",
    "sortYear": 732,
    "dateLabel": "732년",
    "stateOrEra": "발해",
    "eraFilter": "발해",
    "title": "발해, 당나라 등주를 공격함",
    "summary": "발해 무왕 때 장문휴가 수군을 이끌고 당나라 등주를 공격했어요.",
    "life": "발해는 당나라와 긴장 관계를 겪기도 했어요.",
    "artifact": "발해와 당나라 관계 기록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "발해, 당나라 등주를 공격함"
    },
    "textbookPages": [
      "8·9호 6~7쪽·9호 24~27쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "silla-bulguksa",
    "sortYear": 751,
    "dateLabel": "751년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "불국사 건축이 시작됨",
    "summary": "통일 신라 때 불국사 건축이 시작되었어요.",
    "life": "석가탑·다보탑 등 뛰어난 불교문화가 발전했어요.",
    "artifact": "경주 불국사·다보탑·석가탑",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "불국사 건축이 시작됨"
    },
    "textbookPages": [
      "8·9호 6~7쪽·8호 12~17쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "balhae-sanggyeong",
    "sortYear": 756,
    "dateLabel": "756년",
    "stateOrEra": "발해",
    "eraFilter": "발해",
    "title": "발해, 상경으로 수도를 옮김",
    "summary": "발해 문왕 때 상경으로 수도를 옮겼어요.",
    "life": "발해는 여러 민족이 함께 살며 중국·일본 등과 교류했어요.",
    "artifact": "상경 용천부 유적",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "발해, 상경으로 수도를 옮김"
    },
    "textbookPages": [
      "8·9호 6~7쪽·9호 24~29쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "silla-seondeok-king",
    "sortYear": 780,
    "dateLabel": "780년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "선덕왕, 왕위에 오름",
    "summary": "혜공왕이 죽은 뒤 선덕왕이 왕위에 올랐어요.",
    "life": "통일 신라 후기에는 왕위 다툼이 잦아졌어요.",
    "artifact": "신라 하대 왕위 계승 기록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "선덕왕, 왕위에 오름"
    },
    "textbookPages": [
      "8·9호 6~7쪽·9호 8~11쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "silla-jangbogo-cheonghaejin",
    "sortYear": 828,
    "dateLabel": "828년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "장보고, 청해진을 설치함",
    "summary": "장보고가 완도에 청해진을 설치하고 바닷길을 지켰어요.",
    "life": "신라와 중국·일본을 오가는 해상 무역이 활발해졌어요.",
    "artifact": "완도 청해진 유적",
    "image": {
      "kind": "emoji",
      "value": "⛵",
      "alt": "장보고, 청해진을 설치함"
    },
    "textbookPages": [
      "8·9호 6~7쪽·8호 26~31쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "silla-sinmu-king",
    "sortYear": 839,
    "dateLabel": "839년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "신무왕, 왕위에 오름",
    "summary": "장보고의 도움을 받은 김우징이 신무왕으로 즉위했어요.",
    "life": "신라 후기 왕위 다툼과 해상 세력의 영향력이 드러나요.",
    "artifact": "장보고·김우징 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "신무왕, 왕위에 오름"
    },
    "textbookPages": [
      "8·9호 6~7쪽·8호 22~25쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "silla-jinseong-queen",
    "sortYear": 887,
    "dateLabel": "887년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "진성여왕, 왕위에 오름",
    "summary": "진성여왕 시기에는 왕권이 약해지고 지방 세력이 성장했어요.",
    "life": "세금 부담과 정치적 혼란으로 백성의 어려움이 커졌어요.",
    "artifact": "신라 하대 정치 상황 기록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "진성여왕, 왕위에 오름"
    },
    "textbookPages": [
      "9호 8~13쪽"
    ],
    "sourceIssueNumbers": [
      9
    ]
  },
  {
    "id": "silla-late-disorder",
    "sortYear": 890,
    "dateLabel": "9세기 말(정확한 연도 미상)",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "신라 말, 호족과 농민의 움직임이 커짐",
    "summary": "왕권이 약해지면서 지방의 호족들이 힘을 키웠어요.",
    "life": "각지에서 백성이 반발하고 새로운 세력이 나타났어요.",
    "artifact": "호족과 농민 봉기 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🌾",
      "alt": "신라 말, 호족과 농민의 움직임이 커짐"
    },
    "textbookPages": [
      "9호 8~13쪽"
    ],
    "sourceIssueNumbers": [
      9
    ]
  },
  {
    "id": "later-baekje-founded",
    "sortYear": 900,
    "dateLabel": "900년",
    "stateOrEra": "후백제",
    "eraFilter": "후삼국",
    "title": "견훤, 후백제를 세움",
    "summary": "견훤이 완산주를 중심으로 후백제를 세웠어요.",
    "life": "신라가 약해진 틈에 새로운 나라가 등장했어요.",
    "artifact": "후백제 건국 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "견훤, 후백제를 세움"
    },
    "textbookPages": [
      "8·9호 6~7쪽·9호 10~13쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "later-goguryeo-founded",
    "sortYear": 901,
    "dateLabel": "901년",
    "stateOrEra": "후고구려",
    "eraFilter": "후삼국",
    "title": "궁예, 후고구려를 세움",
    "summary": "궁예가 후고구려를 세웠어요.",
    "life": "기존 신라·새로운 후백제와 함께 후삼국의 구도가 이루어졌어요.",
    "artifact": "궁예와 후고구려 건국 기록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "궁예, 후고구려를 세움"
    },
    "textbookPages": [
      "8·9호 6~7쪽·9호 12~17쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "balhae-falls",
    "sortYear": 926,
    "dateLabel": "926년",
    "stateOrEra": "발해",
    "eraFilter": "발해",
    "title": "발해 멸망",
    "summary": "발해가 거란의 공격으로 멸망했어요.",
    "life": "고구려를 이은 발해의 역사는 이때 막을 내렸어요.",
    "artifact": "발해 멸망 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🏛️",
      "alt": "발해 멸망"
    },
    "textbookPages": [
      "8·9호 6~7쪽·9호 26~29쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  },
  {
    "id": "silla-falls",
    "sortYear": 935,
    "dateLabel": "935년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "신라 멸망",
    "summary": "경순왕이 고려에 항복하며 신라가 멸망했어요.",
    "life": "신라의 역사는 고려로 이어지는 흐름 속에서 막을 내렸어요.",
    "artifact": "경순왕과 신라 멸망 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🏛️",
      "alt": "신라 멸망"
    },
    "textbookPages": [
      "8·9호 6~7쪽·9호 16~17쪽"
    ],
    "sourceIssueNumbers": [
      8,
      9
    ]
  }
];
