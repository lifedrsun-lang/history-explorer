import type { HistoryTimelineEvent } from "./historyTimeline";

/**
 * 별꼼역사 05호 《찬란한 문화를 꽃 피운 백제 1》과
 * 06호 《꺼져 가는 불꽃 백제 2》의 교재 연표(PDF 6~7쪽) 및 본문 대조.
 * 두 호에서 반복되는 연도는 하나의 ID에 호수 5·6을 함께 기록한다.
 * 여러 사건이 같은 연도에 일어난 경우(660년)는 서로 다른 사건으로 남긴다.
 * 연도가 확정되지 않은 부흥 운동은 '660년 이후'로 명시한다.
 */
export const HISTORY_TIMELINE_BAEKJE_EVENTS: HistoryTimelineEvent[] = [
  {
    "id": "baekje-onjo-founded",
    "sortYear": -18,
    "dateLabel": "기원전 18년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "온조, 백제를 세움",
    "summary": "온조가 한강 남쪽에 백제를 세웠다고 전해져요.",
    "life": "한강 유역을 중심으로 나라의 기틀을 마련했어요.",
    "artifact": "위례성·풍납토성·몽촌토성 유적",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "온조, 백제를 세움"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "5호 본문 6~7쪽(PDF 8~9쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-goi-king",
    "sortYear": 234,
    "dateLabel": "234년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "고이왕, 왕위에 오름",
    "summary": "고이왕 때 백제는 나라를 다스리는 제도를 정비했어요.",
    "life": "관리의 등급인 16관등과 6좌평 등 중앙 통치 체제를 정비해 왕권을 강화했어요.",
    "artifact": "백제의 6좌평·16관등 제도",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "고이왕, 왕위에 오름"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "5호 본문 10~11쪽(PDF 12~13쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-mokjiguk",
    "sortYear": 250,
    "dateLabel": "250년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "고이왕, 목지국을 점령함",
    "summary": "교재 연표에 따르면 고이왕이 목지국을 차지하며 백제의 세력을 넓혔어요.",
    "life": "마한의 여러 작은 나라를 아우르면서 백제가 성장했어요.",
    "artifact": "마한·백제의 영역 변화 지도",
    "image": {
      "kind": "emoji",
      "value": "🗺️",
      "alt": "고이왕, 목지국을 점령함"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "5호 본문 8~13쪽(PDF 10~15쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-geunchogo-king",
    "sortYear": 346,
    "dateLabel": "346년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "근초고왕, 왕위에 오름",
    "summary": "근초고왕 때 백제는 마한의 여러 나라를 아우르고 영토를 넓혔어요.",
    "life": "한강 유역을 기반으로 대외 교류를 활발히 하며 강한 나라로 성장했어요.",
    "artifact": "근초고왕 때 백제의 영역 지도",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "근초고왕, 왕위에 오름"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "5호 본문 18~21쪽(PDF 20~23쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-chiljido",
    "sortYear": 372,
    "dateLabel": "372년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "백제, 왜에 칠지도를 전함",
    "summary": "교재 연표에는 백제가 왜에 칠지도를 전한 일이 실려 있어요.",
    "life": "백제가 바닷길을 이용해 이웃 나라들과 교류했음을 보여줘요.",
    "artifact": "칠지도",
    "image": {
      "kind": "emoji",
      "value": "🗡️",
      "alt": "백제, 왜에 칠지도를 전함"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "5호 본문 20~21쪽(PDF 22~23쪽)",
      "6호 본문 16~17쪽(PDF 18~19쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-geunchogo-dies",
    "sortYear": 375,
    "dateLabel": "375년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "근초고왕이 세상을 떠남",
    "summary": "백제를 크게 성장시킨 근초고왕이 세상을 떠났어요.",
    "life": "백제는 이후에도 이웃 나라들과 경쟁하며 나라를 지켜 나갔어요.",
    "artifact": "근초고왕의 재위 연표",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "근초고왕이 세상을 떠남"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-buddhism",
    "sortYear": 384,
    "dateLabel": "384년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "침류왕, 불교를 받아들임",
    "summary": "침류왕 때 승려 마라난타가 백제에 와 불교를 전했어요.",
    "life": "불교가 백제 문화와 예술에 영향을 주었어요.",
    "artifact": "마라난타 관련 기록·백제 불교 유적",
    "image": {
      "kind": "emoji",
      "value": "🪷",
      "alt": "침류왕, 불교를 받아들임"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "5호 본문 24~25쪽(PDF 26~27쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-gwamisong-lost",
    "sortYear": 392,
    "dateLabel": "392년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "백제, 관미성을 빼앗김",
    "summary": "광개토 대왕이 이끄는 고구려군의 공격으로 백제는 관미성을 잃었어요.",
    "life": "고구려의 공격이 이어지면서 백제는 북쪽 영토를 지키기 어려워졌어요.",
    "artifact": "관미성 관련 역사 기록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "백제, 관미성을 빼앗김"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "6호 본문 6~7쪽(PDF 8~9쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-ungjin-capital",
    "sortYear": 475,
    "dateLabel": "475년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "백제, 웅진으로 수도를 옮김",
    "summary": "고구려에 한성이 함락된 뒤 백제는 수도를 웅진으로 옮겼어요.",
    "life": "지금의 공주를 중심으로 나라를 다시 안정시키려고 노력했어요.",
    "artifact": "공주 공산성·송산리 고분군",
    "image": {
      "kind": "emoji",
      "value": "🏰",
      "alt": "백제, 웅진으로 수도를 옮김"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "6호 본문 8~11쪽(PDF 10~13쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-muryeong-king",
    "sortYear": 501,
    "dateLabel": "501년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "무령왕, 왕위에 오름",
    "summary": "무령왕은 웅진 시기의 백제를 안정시키고 왕권을 강화했어요.",
    "life": "백제는 다른 나라들과 교류하며 힘을 되찾으려고 했어요.",
    "artifact": "공주 무령왕릉·지석·금제 관식",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "무령왕, 왕위에 오름"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "6호 본문 10~13쪽(PDF 12~15쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-sabi-capital",
    "sortYear": 538,
    "dateLabel": "538년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "성왕, 사비로 수도를 옮김",
    "summary": "성왕이 백제의 수도를 웅진에서 사비로 옮겼어요.",
    "life": "사비를 중심으로 나라의 제도를 정비하고 새로운 발전을 꾀했어요.",
    "artifact": "부여 부소산성·정림사지",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "성왕, 사비로 수도를 옮김"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "6호 본문 12~15쪽(PDF 14~17쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-gwansanseong",
    "sortYear": 554,
    "dateLabel": "554년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "관산성 싸움에서 성왕이 죽음",
    "summary": "성왕이 신라와 싸우다 관산성에서 목숨을 잃었어요.",
    "life": "신라와의 관계가 악화되면서 백제는 큰 어려움에 빠졌어요.",
    "artifact": "관산성 전투 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "관산성 싸움에서 성왕이 죽음"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "6호 본문 12~15쪽(PDF 14~17쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-mu-king",
    "sortYear": 600,
    "dateLabel": "600년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "무왕, 왕위에 오름",
    "summary": "무왕은 백제를 강하게 만들기 위해 노력했어요.",
    "life": "무왕 때 미륵사가 세워졌다고 전해져요.",
    "artifact": "익산 미륵사지·미륵사지 석탑",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "무왕, 왕위에 오름"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "6호 본문 20~21쪽(PDF 22~23쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-uija-king",
    "sortYear": 641,
    "dateLabel": "641년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "의자왕, 왕위에 오름",
    "summary": "의자왕은 백제의 왕위에 올라 신라와 맞섰어요.",
    "life": "백제와 신라의 충돌이 더욱 잦아졌어요.",
    "artifact": "의자왕 관련 역사 기록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "의자왕, 왕위에 오름"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "6호 본문 22~23쪽(PDF 24~25쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-daeyaseong",
    "sortYear": 642,
    "dateLabel": "642년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "백제, 신라의 대야성을 빼앗음",
    "summary": "백제군이 신라의 대야성을 공격해 차지했어요.",
    "life": "백제와 신라의 갈등이 깊어지고, 신라는 다른 나라에 도움을 구했어요.",
    "artifact": "대야성 전투 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🏰",
      "alt": "백제, 신라의 대야성을 빼앗음"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "6호 본문 22~25쪽(PDF 24~27쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-hwangsanbeol",
    "sortYear": 660,
    "dateLabel": "660년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "계백이 황산벌에서 싸움",
    "summary": "계백이 이끈 백제군이 신라군에 맞서 황산벌에서 싸웠어요.",
    "life": "백제는 나라를 지키려 했지만 나당 연합군의 공격을 막지 못했어요.",
    "artifact": "계백 장군·황산벌 전투 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "계백이 황산벌에서 싸움"
    },
    "textbookPages": [
      "6호 본문 24~27쪽(PDF 26~29쪽)"
    ],
    "sourceIssueNumbers": [
      6
    ]
  },
  {
    "id": "baekje-falls",
    "sortYear": 660,
    "dateLabel": "660년",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "백제 멸망",
    "summary": "백제는 신라와 당나라 연합군의 공격으로 멸망했어요.",
    "life": "백제의 마지막 수도였던 사비가 함락되었어요.",
    "artifact": "부여 사비성 관련 유적",
    "image": {
      "kind": "emoji",
      "value": "🏛️",
      "alt": "백제 멸망"
    },
    "textbookPages": [
      "5호 PDF 6~7쪽 연표",
      "6호 PDF 6~7쪽 연표",
      "6호 본문 24~27쪽(PDF 26~29쪽)"
    ],
    "sourceIssueNumbers": [
      5,
      6
    ]
  },
  {
    "id": "baekje-revival-movement",
    "sortYear": 661,
    "dateLabel": "660년 이후",
    "stateOrEra": "백제",
    "eraFilter": "백제",
    "title": "백제 부흥 운동이 일어남",
    "summary": "백제가 멸망한 뒤 복신과 도침 등은 나라를 다시 세우려 했어요.",
    "life": "주류성·임존성 등을 중심으로 백제 유민이 부흥 운동을 이어 갔어요.",
    "artifact": "주류성·임존성 유적",
    "image": {
      "kind": "emoji",
      "value": "🚩",
      "alt": "백제 부흥 운동이 일어남"
    },
    "textbookPages": [
      "6호 본문 28~29쪽(PDF 30~31쪽)"
    ],
    "sourceIssueNumbers": [
      6
    ]
  }
];
