import type { HistoryTimelineEvent } from "./historyTimeline";
import type { TimelineStudyNotesIndex } from "./historyTimelineStudyTypes";

/**
 * 별꼼역사 10~12호 PDF의 본문과 각 장 연표(책 안에 표시된 쪽수)를 대조한 고려 사건.
 * PDF 원본은 스캔본이므로 페이지 이미지로 내용을 확인했다.
 * 교재 연표에 없는 임의의 연도를 만들지 않고 문화·생활 주제는 별도 학습 주제로 둔다.
 * 기존 918년 고려 건국·936년 후삼국 통일은 동일 사건으로 중복하지 않고,
 * 10호 학습 내용과 출처를 기존 ID에 연결한다.
 */
export const HISTORY_TIMELINE_GORYEO_EVENTS: HistoryTimelineEvent[] = [
  {
    "id": "goryeo-songak-capital-919",
    "sortYear": 919,
    "dateLabel": "919년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "송악으로 수도를 옮김",
    "summary": "태조 왕건이 도읍을 송악(오늘날 개성)으로 옮겼어요.",
    "life": "송악은 왕건의 활동 기반이었던 곳이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "송악으로 수도를 옮김"
    },
    "textbookPages": [
      "10호 교재 4, 10~11쪽"
    ],
    "sourceIssueNumbers": [
      10
    ]
  },
  {
    "id": "goryeo-hyejong-943",
    "sortYear": 943,
    "dateLabel": "943년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "혜종이 왕위에 오름",
    "summary": "태조 왕건이 세상을 떠난 뒤 혜종이 왕위를 이었어요.",
    "life": "왕건이 사망한 뒤 왕위 계승을 둘러싼 왕실과 호족의 경쟁이 이어졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "혜종이 왕위에 오름"
    },
    "textbookPages": [
      "10호 교재 18~23쪽"
    ],
    "sourceIssueNumbers": [
      10
    ]
  },
  {
    "id": "goryeo-gwangjong-949",
    "sortYear": 949,
    "dateLabel": "949년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "광종이 왕위에 오름",
    "summary": "광종이 고려의 제4대 왕이 되었어요.",
    "life": "광종은 호족의 세력을 약화하고 왕권을 강화하는 정책을 추진했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "광종이 왕위에 오름"
    },
    "textbookPages": [
      "10호 교재 22~25쪽"
    ],
    "sourceIssueNumbers": [
      10
    ]
  },
  {
    "id": "goryeo-nobi-956",
    "sortYear": 956,
    "dateLabel": "956년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "광종, 노비안검법을 실시함",
    "summary": "광종이 억울하게 노비가 된 사람들의 신분을 조사해 바로잡으려 했어요.",
    "life": "호족에게 예속된 사람을 줄이고 왕권을 강화하는 데에도 영향을 주었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚖️",
      "alt": "광종, 노비안검법을 실시함"
    },
    "textbookPages": [
      "10호 교재 24~25쪽"
    ],
    "sourceIssueNumbers": [
      10
    ]
  },
  {
    "id": "goryeo-gwageo-958",
    "sortYear": 958,
    "dateLabel": "958년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "광종, 과거제를 시행함",
    "summary": "관리 후보를 시험으로 뽑는 과거제를 시행했어요.",
    "life": "기존 호족 중심의 인사 체제에서 벗어나 왕에게 필요한 관리를 기르려 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📝",
      "alt": "광종, 과거제를 시행함"
    },
    "textbookPages": [
      "10호 교재 25~27쪽"
    ],
    "sourceIssueNumbers": [
      10
    ]
  },
  {
    "id": "goryeo-seongjong-981",
    "sortYear": 981,
    "dateLabel": "981년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "성종이 왕위에 오름",
    "summary": "성종이 왕위에 올라 유교 정치 이념을 바탕으로 나라의 제도를 정비했어요.",
    "life": "중앙과 지방을 다스릴 조직을 갖추고 왕권을 안정시키려고 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "성종이 왕위에 오름"
    },
    "textbookPages": [
      "10호 교재 26~29쪽"
    ],
    "sourceIssueNumbers": [
      10
    ]
  },
  {
    "id": "goryeo-simu-982",
    "sortYear": 982,
    "dateLabel": "982년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "최승로가 시무 28조를 올림",
    "summary": "최승로가 성종에게 나라를 다스릴 방법을 담은 글을 올렸어요.",
    "life": "성종은 이 건의를 참고해 유교 중심의 정치와 지방 통치 제도를 정비했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "최승로가 시무 28조를 올림"
    },
    "textbookPages": [
      "10호 교재 26~29쪽"
    ],
    "sourceIssueNumbers": [
      10
    ]
  },
  {
    "id": "goryeo-khitan-first-993",
    "sortYear": 993,
    "dateLabel": "993년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "거란의 첫 침입과 서희의 담판",
    "summary": "거란이 고려를 공격했지만 서희의 외교 담판으로 전쟁을 해결할 실마리를 찾았어요.",
    "life": "고려는 강동 6주를 확보하고 북쪽 국경의 기반을 넓혔어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🤝",
      "alt": "거란의 첫 침입과 서희의 담판"
    },
    "textbookPages": [
      "11호 교재 6~9쪽"
    ],
    "sourceIssueNumbers": [
      11
    ]
  },
  {
    "id": "goryeo-geonwonjungbo-996",
    "sortYear": 996,
    "dateLabel": "996년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "성종, 건원중보를 처음 만듦",
    "summary": "고려가 건원중보라는 금속 화폐를 만들었어요.",
    "life": "시장에서 물건을 사고파는 생활과 화폐의 사용을 함께 살펴봐요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🪙",
      "alt": "성종, 건원중보를 처음 만듦"
    },
    "textbookPages": [
      "11호 교재 18~27쪽"
    ],
    "sourceIssueNumbers": [
      11
    ]
  },
  {
    "id": "goryeo-gangjo-coup-1009",
    "sortYear": 1009,
    "dateLabel": "1009년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "강조의 정변이 일어남",
    "summary": "강조가 정변을 일으켜 왕실의 정치가 크게 흔들렸어요.",
    "life": "거란은 이 정변을 고려 침입의 구실로 삼았어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "강조의 정변이 일어남"
    },
    "textbookPages": [
      "11호 교재 9~11쪽"
    ],
    "sourceIssueNumbers": [
      11
    ]
  },
  {
    "id": "goryeo-khitan-second-1010",
    "sortYear": 1010,
    "dateLabel": "1010년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "거란이 두 번째로 고려를 침입함",
    "summary": "거란군이 다시 공격하자 현종은 남쪽으로 피란했어요.",
    "life": "고려의 군사와 백성들은 거란의 침략에 맞섰어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "거란이 두 번째로 고려를 침입함"
    },
    "textbookPages": [
      "11호 교재 10~13쪽"
    ],
    "sourceIssueNumbers": [
      11
    ]
  },
  {
    "id": "goryeo-khitan-third-1018",
    "sortYear": 1018,
    "dateLabel": "1018년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "거란군이 다시 쳐들어옴",
    "summary": "거란의 소배압이 군대를 이끌고 고려를 공격했어요.",
    "life": "고려의 강감찬은 거란군을 상대할 방어 작전을 준비했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "거란군이 다시 쳐들어옴"
    },
    "textbookPages": [
      "11호 교재 12~15쪽"
    ],
    "sourceIssueNumbers": [
      11
    ]
  },
  {
    "id": "goryeo-gwiju-1019",
    "sortYear": 1019,
    "dateLabel": "1019년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "강감찬, 귀주 대첩에서 승리함",
    "summary": "강감찬이 귀주에서 거란군을 크게 물리쳤어요.",
    "life": "고려가 거란의 대규모 침략을 막아 낸 중요한 승리였어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏆",
      "alt": "강감찬, 귀주 대첩에서 승리함"
    },
    "textbookPages": [
      "11호 교재 12~15쪽"
    ],
    "sourceIssueNumbers": [
      11
    ]
  },
  {
    "id": "goryeo-arab-traders-1024",
    "sortYear": 1024,
    "dateLabel": "1024년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "아라비아 상인들이 고려와 교역함",
    "summary": "아라비아 상인들이 고려와 물건을 사고팔았다는 기록이 있어요.",
    "life": "고려의 항구와 시장은 주변 여러 지역을 잇는 교류의 장소였어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⛵",
      "alt": "아라비아 상인들이 고려와 교역함"
    },
    "textbookPages": [
      "11호 교재 18~29쪽"
    ],
    "sourceIssueNumbers": [
      11
    ]
  },
  {
    "id": "goryeo-yun-gwan-1107",
    "sortYear": 1107,
    "dateLabel": "1107년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "윤관, 여진을 물리치고 동북 9성을 쌓음",
    "summary": "윤관이 별무반을 이끌고 여진을 공격해 동북 9성을 쌓았어요.",
    "life": "새로 세운 성들은 뒤에 여진에 돌려주게 되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "윤관, 여진을 물리치고 동북 9성을 쌓음"
    },
    "textbookPages": [
      "11호 교재 14~17쪽"
    ],
    "sourceIssueNumbers": [
      11
    ]
  },
  {
    "id": "goryeo-ija-gyeom-influence-1122",
    "sortYear": 1122,
    "dateLabel": "1122년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "이자겸이 큰 권력을 차지함",
    "summary": "문벌 귀족 이자겸이 왕실과 혼인 관계를 맺고 큰 권력을 누렸어요.",
    "life": "왕실과 외척의 관계가 정치에 미치는 영향을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "이자겸이 큰 권력을 차지함"
    },
    "textbookPages": [
      "12호 교재 6~11쪽"
    ],
    "sourceIssueNumbers": [
      12
    ]
  },
  {
    "id": "goryeo-ija-gyeom-revolt-1126",
    "sortYear": 1126,
    "dateLabel": "1126년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "이자겸의 난이 일어남",
    "summary": "이자겸과 척준경 등이 왕권을 둘러싸고 충돌했어요.",
    "life": "개경의 궁궐이 불타는 등 큰 혼란이 일어났고, 이자겸은 결국 몰락했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🔥",
      "alt": "이자겸의 난이 일어남"
    },
    "textbookPages": [
      "12호 교재 8~13쪽"
    ],
    "sourceIssueNumbers": [
      12
    ]
  },
  {
    "id": "goryeo-seogyeong-palace-1128",
    "sortYear": 1128,
    "dateLabel": "1128년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "인종, 서경에 궁궐을 지음",
    "summary": "인종이 서경에 궁궐을 지었어요.",
    "life": "묘청 등은 서경으로 도읍을 옮기면 나라가 새롭게 강해질 것이라고 주장했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "인종, 서경에 궁궐을 지음"
    },
    "textbookPages": [
      "12호 교재 12~16쪽"
    ],
    "sourceIssueNumbers": [
      12
    ]
  },
  {
    "id": "goryeo-myo-cheong-revolt-1135",
    "sortYear": 1135,
    "dateLabel": "1135년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "묘청의 난이 일어남",
    "summary": "서경 천도가 받아들여지지 않자 묘청 세력이 반란을 일으켰어요.",
    "life": "김부식이 이끄는 관군에 의해 반란이 진압되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "묘청의 난이 일어남"
    },
    "textbookPages": [
      "12호 교재 12~17쪽"
    ],
    "sourceIssueNumbers": [
      12
    ]
  },
  {
    "id": "goryeo-military-coup-1170",
    "sortYear": 1170,
    "dateLabel": "1170년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "무신 정변이 일어남",
    "summary": "정중부 등 무신들이 정변을 일으켜 문신 중심 정치를 무너뜨렸어요.",
    "life": "왕보다 무신들이 더 큰 권력을 행사하는 무신 정권이 시작되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "무신 정변이 일어남"
    },
    "textbookPages": [
      "12호 교재 20~27쪽"
    ],
    "sourceIssueNumbers": [
      12
    ]
  },
  {
    "id": "goryeo-mangi-mangsoi-1176",
    "sortYear": 1176,
    "dateLabel": "1176년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "망이·망소이의 난이 일어남",
    "summary": "공주 명학소 사람들을 중심으로 차별과 수탈에 저항하는 봉기가 일어났어요.",
    "life": "당시 향·소·부곡 주민이 겪던 어려움을 보여 주는 사건이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "✊",
      "alt": "망이·망소이의 난이 일어남"
    },
    "textbookPages": [
      "12호 교재 27~31쪽"
    ],
    "sourceIssueNumbers": [
      12
    ]
  },
  {
    "id": "goryeo-kim-sami-hyosim-1193",
    "sortYear": 1193,
    "dateLabel": "1193년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "김사미와 효심의 난이 일어남",
    "summary": "김사미와 효심이 농민 세력을 이끌고 봉기했어요.",
    "life": "무신 정권 시기 농민들이 겪던 수탈과 어려움이 커졌음을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "✊",
      "alt": "김사미와 효심의 난이 일어남"
    },
    "textbookPages": [
      "12호 교재 28~31쪽"
    ],
    "sourceIssueNumbers": [
      12
    ]
  },
  {
    "id": "goryeo-choe-chungheon-1196",
    "sortYear": 1196,
    "dateLabel": "1196년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "최충헌이 권력을 잡음",
    "summary": "최충헌이 권력을 잡으면서 최씨 무신 정권이 이어지는 기반이 만들어졌어요.",
    "life": "최씨 집안의 권력이 왕권보다 강해지는 상황을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "최충헌이 권력을 잡음"
    },
    "textbookPages": [
      "12호 교재 26~29쪽"
    ],
    "sourceIssueNumbers": [
      12
    ]
  },
  {
    "id": "goryeo-manjeok-1198",
    "sortYear": 1198,
    "dateLabel": "1198년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "만적이 신분 해방을 꾀함",
    "summary": "노비 만적이 다른 노비들과 함께 신분의 차별을 바꾸려는 계획을 세웠어요.",
    "life": "계획은 실행 전에 발각되었지만 신분 질서에 대한 불만을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "✊",
      "alt": "만적이 신분 해방을 꾀함"
    },
    "textbookPages": [
      "12호 교재 32~35쪽"
    ],
    "sourceIssueNumbers": [
      12
    ]
  }
];

/** 연표 사건에 붙여 펼쳐 볼 교재의 상세 학습 요점 (원문을 그대로 전재하지 않은 요약). */
export const HISTORY_STUDY_GORYEO: TimelineStudyNotesIndex = {
  "goryeo-songak-capital-919": [
    [
      10,
      "송악에서 시작한 새 왕조",
      "왕건은 자신의 세력이 기반을 둔 송악을 수도로 삼았어요.",
      "후삼국 통일 이전부터 나라의 정치 중심지를 정비했어요.",
      "송악은 오늘날 북한의 개성 지역을 가리켜요."
    ]
  ],
  "goryeo-hyejong-943": [
    [
      10,
      "태조 이후의 왕위 다툼",
      "태조 왕건은 여러 호족과 혼인 관계를 맺었기 때문에 왕실의 인척 집안이 많았어요.",
      "왕위를 둘러싼 다툼은 왕의 권력이 안정되지 않았음을 보여 줘요.",
      "태조의 훈요 10조는 뒤를 이을 왕들에게 남긴 가르침으로 소개돼요."
    ]
  ],
  "goryeo-gwangjong-949": [
    [
      10,
      "광종이 풀고자 한 문제",
      "고려 건국을 도운 호족은 넓은 토지와 많은 사병·노비를 거느렸어요.",
      "광종은 왕이 나라를 직접 다스리는 힘을 키우려 했어요.",
      "노비안검법과 과거제는 광종의 대표 정책이에요."
    ]
  ],
  "goryeo-nobi-956": [
    [
      10,
      "노비안검법의 뜻",
      "호족들이 불법으로 노비로 삼은 사람들을 조사해 양인의 신분을 회복시키려는 제도예요.",
      "광종은 호족의 세력을 견제하면서 나라의 통치 기반을 넓히려 했어요.",
      "모든 노비가 한꺼번에 자유를 얻었다는 뜻은 아니에요."
    ]
  ],
  "goryeo-gwageo-958": [
    [
      10,
      "과거제로 사람을 뽑다",
      "광종 때 처음 도입한 과거제는 글과 학문을 시험해 관리를 선발하는 제도예요.",
      "시험을 통해 관리가 되는 새로운 길이 열리면서 왕권을 뒷받침할 인재를 얻을 수 있었어요."
    ]
  ],
  "goryeo-seongjong-981": [
    [
      10,
      "성종이 추진한 나라 정비",
      "성종은 관리들의 의견을 듣고 고려의 제도를 고치려 했어요.",
      "불교 행사에 치우친 정치에서 유교에 근거한 통치를 강화해 나갔어요.",
      "지방에 관리를 파견하는 일도 중요한 변화였어요."
    ]
  ],
  "goryeo-simu-982": [
    [
      10,
      "시무 28조와 유교 정치",
      "최승로는 왕에게 고려의 문제를 고치기 위한 의견 28가지를 적어 올렸어요.",
      "불교 자체를 없애자고 주장한 것이 아니라, 나라를 다스리는 원리는 유교에 두자고 제안했어요.",
      "왕과 관리가 어떻게 나라를 운영해야 할지 고민한 사례예요."
    ]
  ],
  "goryeo-khitan-first-993": [
    [
      11,
      "서희가 거란을 설득하다",
      "거란은 고려가 송나라와 가까이 지내는 점 등을 문제 삼았어요.",
      "서희는 고려가 고구려의 옛 땅을 계승한 나라임을 강조하고 협상했어요.",
      "전쟁에만 의존하지 않고 대화로 문제를 풀어 낸 외교 사례예요.",
      "강동 6주는 이후 고려 북방 방어에 중요한 지역이 되었어요."
    ]
  ],
  "goryeo-geonwonjungbo-996": [
    [
      11,
      "건원중보와 시장",
      "교재의 연표는 996년에 건원중보를 처음 만들었다고 소개해요.",
      "고려에서는 물품 교환·시장 거래와 함께 화폐 사용도 추진했어요.",
      "동전이 만들어졌다고 모든 백성이 즉시 동전으로만 거래한 것은 아니에요."
    ]
  ],
  "goryeo-gangjo-coup-1009": [
    [
      11,
      "강조의 정변과 거란",
      "강조가 목종을 폐위시키고 현종을 왕으로 세웠어요.",
      "거란은 이 일을 구실로 다시 고려를 공격했어요.",
      "왕실 내부의 정치 문제와 국제 관계가 연결되는 사례예요."
    ]
  ],
  "goryeo-khitan-second-1010": [
    [
      11,
      "거란의 두 번째 침입",
      "강조의 정변을 구실 삼아 거란군이 고려를 다시 공격했어요.",
      "개경이 위협받자 현종이 피란할 만큼 어려운 상황이 벌어졌어요.",
      "고려는 이후 북방 방어를 더욱 중요하게 여기게 되었어요."
    ]
  ],
  "goryeo-khitan-third-1018": [
    [
      11,
      "강감찬의 방어 준비",
      "거란군의 또 다른 침입에 맞서 강감찬이 고려군을 지휘했어요.",
      "흥화진 등 북쪽 지역에서 전투가 벌어졌으며 거란군이 돌아가는 길에도 싸움이 이어졌어요.",
      "1018년의 침입과 1019년 귀주 대첩을 구분해서 살펴봐요."
    ]
  ],
  "goryeo-gwiju-1019": [
    [
      11,
      "귀주 대첩의 결과",
      "거란군은 고려군의 저항을 받으며 돌아가다가 귀주에서 크게 패했어요.",
      "강감찬이 이끄는 고려군이 거둔 승리는 북방 국방과 평화에 큰 영향을 주었어요.",
      "전쟁의 과정을 살필 때 1018년 침입과 1019년 승리를 나누어 기억해요."
    ]
  ],
  "goryeo-arab-traders-1024": [
    [
      11,
      "벽란도와 먼 나라의 상인",
      "교재는 중국뿐 아니라 아라비아 상인도 고려를 방문했다고 소개해요.",
      "벽란도는 국제 교역에 중요한 항구로, 개경의 시장과 연결되었어요.",
      "고려의 물건과 이름이 먼 곳에도 알려진 배경을 살펴봐요."
    ]
  ],
  "goryeo-yun-gwan-1107": [
    [
      11,
      "윤관과 별무반",
      "윤관은 여진의 기병에 맞서 싸우기 위해 별무반이라는 특별 부대를 조직했어요.",
      "별무반에는 기병인 신기군, 보병인 신보군, 승려로 이루어진 항마군이 있었어요.",
      "여진을 물리친 뒤 동북 9성을 쌓았지만 그 땅을 계속 지키지는 못했어요."
    ]
  ],
  "goryeo-ija-gyeom-influence-1122": [
    [
      12,
      "문벌 귀족과 이자겸",
      "고려의 문벌 귀족은 높은 관직과 혼인 관계를 통해 권력을 이어 갔어요.",
      "이자겸의 집안은 왕실과 혼인하며 더욱 강한 세력이 되었어요.",
      "문벌 귀족의 힘이 지나치게 커지자 왕과 갈등이 생겼어요."
    ]
  ],
  "goryeo-ija-gyeom-revolt-1126": [
    [
      12,
      "이자겸의 난과 그 결과",
      "인종은 왕의 권력을 위협하는 이자겸을 견제하려고 했어요.",
      "이자겸과 척준경의 세력이 반발하면서 정치적 충돌이 일어났어요.",
      "사건 이후에도 문벌 귀족의 문제는 고려 정치의 중요한 과제로 남았어요."
    ]
  ],
  "goryeo-seogyeong-palace-1128": [
    [
      12,
      "서경 천도 주장의 배경",
      "묘청은 개경 대신 서경으로 수도를 옮기자고 주장했어요.",
      "서경은 오늘날 평양 지역이에요.",
      "풍수지리와 대외 정책에 관한 생각 차이가 천도 논쟁으로 이어졌어요."
    ]
  ],
  "goryeo-myo-cheong-revolt-1135": [
    [
      12,
      "묘청의 서경 천도 운동과 반란",
      "묘청은 서경으로 수도를 옮기고 새로운 정치 체제를 세우자고 주장했어요.",
      "천도론이 받아들여지지 않자 서경에서 반란을 일으켰어요.",
      "김부식 등 개경 중심 세력과의 갈등을 통해 당시의 정치적 대립을 살펴봐요."
    ]
  ],
  "goryeo-military-coup-1170": [
    [
      12,
      "문신과 무신의 갈등",
      "무신은 전쟁에서 중요한 역할을 했지만 문신보다 차별받는다고 느꼈어요.",
      "1170년 무신들이 정변을 일으켜 고려의 권력 구조가 크게 달라졌어요.",
      "무신이 권력을 잡은 뒤에도 백성의 생활이 저절로 나아진 것은 아니에요."
    ]
  ],
  "goryeo-mangi-mangsoi-1176": [
    [
      12,
      "망이와 망소이가 봉기한 이유",
      "특수 행정 구역인 소의 주민들은 차별과 무거운 부담을 겪었어요.",
      "망이와 망소이의 봉기는 이런 차별에 맞선 저항으로 설명돼요.",
      "당시 백성들의 삶을 함께 살펴봐야 사건의 원인을 알 수 있어요."
    ]
  ],
  "goryeo-kim-sami-hyosim-1193": [
    [
      12,
      "농민들이 들고일어난 까닭",
      "무신 집권기에 권력자들의 횡포와 무거운 부담에 시달린 농민이 많았어요.",
      "김사미와 효심의 봉기는 지방에서 일어난 대표적인 농민 저항이에요.",
      "같은 무신 정권 아래에서도 지역마다 다른 방식으로 저항이 나타났어요."
    ]
  ],
  "goryeo-choe-chungheon-1196": [
    [
      12,
      "최씨 무신 정권",
      "최충헌은 무신 집권자들을 물리치고 권력을 장악했어요.",
      "뒤에는 아들 최우 등 최씨 일가가 권력을 이어받았어요.",
      "왕이 있었어도 무신 집안이 정치를 주도하는 상황이 계속되었어요."
    ]
  ],
  "goryeo-manjeok-1198": [
    [
      12,
      "만적의 난 모의와 신분 문제",
      "만적은 최충헌 집안의 노비였으며 다른 노비들과 함께 거사를 모의했어요.",
      "노비도 자신의 삶을 바꾸고 싶어 한다는 바람이 드러난 사건이에요.",
      "계획이 실행되지는 못했다는 점을 농민 봉기와 구별해 살펴봐요."
    ]
  ],
  "goryeo-founded-918": [
    [
      10,
      "태조 왕건과 고려의 출발",
      "왕건은 궁예를 몰아낸 뒤 918년 새 고려 왕조를 세웠어요.",
      "고구려를 계승한다는 뜻으로 나라 이름을 고려라고 정했어요.",
      "고려 건국과 936년 후삼국 통일은 서로 다른 사건이에요."
    ]
  ],
  "later-baekje-falls-936": [
    [
      10,
      "고려가 후삼국을 통일하다",
      "왕건은 옛 백제와 신라의 사람들을 포용하며 고려의 기반을 다졌어요.",
      "935년 신라가 고려에 귀부한 뒤, 936년 후백제를 무너뜨려 후삼국을 통일했어요.",
      "후삼국 통일은 여러 정치 세력과 백성을 하나의 나라로 묶는 과정이었어요."
    ]
  ]
};
