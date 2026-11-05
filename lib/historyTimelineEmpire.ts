import type { HistoryTimelineEvent } from "./historyTimeline";
import type { TimelineStudyNotesIndex } from "./historyTimelineStudyTypes";

/** 별꼼역사 20~21호 원본 PDF 4~5쪽 연표와 본문(6~27쪽) 기반.
 * 21호는 20호 뒤에 이어지는 동일 연표 중 1896~1919년을 깊게 다루므로
 * 같은 사건을 중복 등록하지 않고 관련 호수를 함께 연결한다.
 */
export const HISTORY_TIMELINE_EMPIRE_EVENTS: HistoryTimelineEvent[] = [
  {
    "id": "joseon-gojong-1863",
    "sortYear": 1863,
    "dateLabel": "1863년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "고종이 왕위에 오름",
    "summary": "어린 고종이 왕위에 오르자 흥선 대원군이 정치를 이끌었어요.",
    "life": "흥선 대원군은 왕권을 강화하고 나라의 질서를 바로잡으려 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "고종이 왕위에 오름"
    },
    "textbookPages": [
      "20호 4~5쪽 연표 · 20호 6~9쪽 본문"
    ],
    "sourceIssueNumbers": [
      20
    ]
  },
  {
    "id": "joseon-byeonginyangyo-1866",
    "sortYear": 1866,
    "dateLabel": "1866년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "병인양요가 일어남",
    "summary": "프랑스 군대가 강화도를 침략해 병인양요가 일어났어요.",
    "life": "조선 군사들이 강화도에서 외국 군대의 공격에 맞서 싸웠어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "병인양요가 일어남"
    },
    "textbookPages": [
      "20호 4~5쪽 연표 · 20호 8~11쪽 본문"
    ],
    "sourceIssueNumbers": [
      20
    ]
  },
  {
    "id": "joseon-sinmiyangyo-1871",
    "sortYear": 1871,
    "dateLabel": "1871년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "신미양요가 일어남",
    "summary": "미국 군대가 강화도를 공격해 신미양요가 일어났어요.",
    "life": "광성보에서 어재연과 조선 군사들이 저항했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "신미양요가 일어남"
    },
    "textbookPages": [
      "20호 4~5쪽 연표 · 20호 8~11쪽 본문"
    ],
    "sourceIssueNumbers": [
      20
    ]
  },
  {
    "id": "joseon-unyo-1875",
    "sortYear": 1875,
    "dateLabel": "1875년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "운요호 사건이 일어남",
    "summary": "일본의 군함 운요호가 강화도 부근에서 무력 충돌을 일으켰어요.",
    "life": "일본은 이후 조선에 불평등한 조약을 맺도록 압박했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🚢",
      "alt": "운요호 사건이 일어남"
    },
    "textbookPages": [
      "20호 4~5쪽 연표 · 20호 10~13쪽 본문"
    ],
    "sourceIssueNumbers": [
      20
    ]
  },
  {
    "id": "joseon-ganghwa-1876",
    "sortYear": 1876,
    "dateLabel": "1876년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "강화도 조약을 맺음",
    "summary": "조선과 일본이 강화도 조약을 맺었어요.",
    "life": "일본의 무력 압박 속에서 맺은 불평등 조약으로, 조선이 문호를 여는 계기가 되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "강화도 조약을 맺음"
    },
    "textbookPages": [
      "20호 4~5쪽 연표 · 20호 10~13쪽 본문"
    ],
    "sourceIssueNumbers": [
      20
    ]
  },
  {
    "id": "joseon-imogunran-1882",
    "sortYear": 1882,
    "dateLabel": "1882년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "임오군란이 일어남",
    "summary": "구식 군인들이 차별 대우와 밀린 급료 등에 항의하며 봉기했어요.",
    "life": "새로운 제도를 둘러싼 갈등과 외세의 영향이 커졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "임오군란이 일어남"
    },
    "textbookPages": [
      "20호 4~5쪽 연표 · 20호 18~21쪽 본문"
    ],
    "sourceIssueNumbers": [
      20
    ]
  },
  {
    "id": "joseon-gapsinjeongbyeon-1884",
    "sortYear": 1884,
    "dateLabel": "1884년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "갑신정변이 일어남",
    "summary": "급진 개화파가 정변을 일으켜 개혁을 추진하려 했어요.",
    "life": "정변은 짧은 기간 안에 실패했지만 조선의 정치 개혁을 둘러싼 갈등을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚖️",
      "alt": "갑신정변이 일어남"
    },
    "textbookPages": [
      "20호 4~5쪽 연표 · 20호 18~21쪽 본문"
    ],
    "sourceIssueNumbers": [
      20
    ]
  },
  {
    "id": "joseon-gobu-petition-1893",
    "sortYear": 1893,
    "dateLabel": "1893년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "고부 사람들이 세금 감면을 요구함",
    "summary": "고부 지역의 사람들이 과도한 세금과 관리의 횡포에 항의했어요.",
    "life": "백성의 생활 문제는 뒤이은 동학 농민 운동의 중요한 배경이 되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "✊",
      "alt": "고부 사람들이 세금 감면을 요구함"
    },
    "textbookPages": [
      "20호 4~5쪽 연표 · 20호 20~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      20
    ]
  },
  {
    "id": "joseon-donghak-1894",
    "sortYear": 1894,
    "dateLabel": "1894년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "전봉준이 이끄는 동학 농민군이 봉기함",
    "summary": "전봉준 등이 관리의 부정과 외세에 맞서 동학 농민 운동을 이끌었어요.",
    "life": "농민들은 탐관오리의 횡포를 바로잡고 새로운 사회를 만들고자 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "✊",
      "alt": "전봉준이 이끄는 동학 농민군이 봉기함"
    },
    "textbookPages": [
      "20호 4~5쪽 연표 · 20호 20~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      20
    ]
  },
  {
    "id": "joseon-independence-club-1896",
    "sortYear": 1896,
    "dateLabel": "1896년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "서재필 등이 독립협회를 만듦",
    "summary": "서재필 등은 독립협회를 만들고 자주독립과 개혁을 주장했어요.",
    "life": "독립문 건립과 토론회 등을 통해 나라의 자주성을 강조했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "서재필 등이 독립협회를 만듦"
    },
    "textbookPages": [
      "20·21호 4~5쪽 연표 · 20호 24~27 · 21호 8~11쪽 본문"
    ],
    "sourceIssueNumbers": [
      20,
      21
    ]
  },
  {
    "id": "empire-proclaimed-1897",
    "sortYear": 1897,
    "dateLabel": "1897년",
    "stateOrEra": "대한제국",
    "eraFilter": "대한제국",
    "title": "대한제국이 선포됨",
    "summary": "고종이 황제에 올라 나라 이름을 대한제국으로 바꾸었어요.",
    "life": "나라의 자주독립을 밝히고 근대적인 국가를 만들려는 움직임이 이어졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "대한제국이 선포됨"
    },
    "textbookPages": [
      "20·21호 4~5쪽 연표 · 20호 24~27 · 21호 8~11쪽 본문"
    ],
    "sourceIssueNumbers": [
      20,
      21
    ]
  },
  {
    "id": "empire-eulsa-1905",
    "sortYear": 1905,
    "dateLabel": "1905년",
    "stateOrEra": "대한제국",
    "eraFilter": "대한제국",
    "title": "을사늑약이 강요됨",
    "summary": "일본이 대한제국의 외교권을 빼앗는 을사늑약을 강요했어요.",
    "life": "우리 민족은 조약의 부당함에 맞서 국권을 지키려는 활동을 이어 갔어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "을사늑약이 강요됨"
    },
    "textbookPages": [
      "20·21호 4~5쪽 연표 · 20호 24~27 · 21호 10~19쪽 본문"
    ],
    "sourceIssueNumbers": [
      20,
      21
    ]
  },
  {
    "id": "empire-gojong-abdication-1907",
    "sortYear": 1907,
    "dateLabel": "1907년",
    "stateOrEra": "대한제국",
    "eraFilter": "대한제국",
    "title": "고종이 강제로 퇴위함",
    "summary": "일본의 압박으로 고종이 황제 자리에서 물러나게 되었어요.",
    "life": "고종은 헤이그에 특사를 보내 일본의 침략을 세계에 알리려 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "고종이 강제로 퇴위함"
    },
    "textbookPages": [
      "20·21호 4~5쪽 연표 · 20호 24~27 · 21호 12~19쪽 본문"
    ],
    "sourceIssueNumbers": [
      20,
      21
    ]
  },
  {
    "id": "empire-ahn-junggeun-1909",
    "sortYear": 1909,
    "dateLabel": "1909년",
    "stateOrEra": "대한제국",
    "eraFilter": "대한제국",
    "title": "안중근이 이토 히로부미를 사살함",
    "summary": "안중근은 하얼빈에서 이토 히로부미를 사살했어요.",
    "life": "그는 일본의 침략에 저항하고 동양 평화를 주장했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "✊",
      "alt": "안중근이 이토 히로부미를 사살함"
    },
    "textbookPages": [
      "20·21호 4~5쪽 연표 · 20호 24~27 · 21호 14~19쪽 본문"
    ],
    "sourceIssueNumbers": [
      20,
      21
    ]
  },
  {
    "id": "colonial-annexation-1910",
    "sortYear": 1910,
    "dateLabel": "1910년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "일본에 국권을 빼앗김",
    "summary": "일본이 대한제국의 국권을 강탈하면서 식민지 지배가 시작되었어요.",
    "life": "우리 민족은 나라를 되찾기 위한 다양한 독립운동을 이어 갔어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏴",
      "alt": "일본에 국권을 빼앗김"
    },
    "textbookPages": [
      "20·21호 4~5쪽 연표 · 20호 24~27 · 21호 6~11쪽 본문"
    ],
    "sourceIssueNumbers": [
      20,
      21
    ]
  },
  {
    "id": "colonial-feb8-1919",
    "sortYear": 1919,
    "dateLabel": "1919년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "2·8 독립 선언이 발표됨",
    "summary": "일본 도쿄의 한국인 유학생들이 2·8 독립 선언을 발표했어요.",
    "life": "해외 유학생들의 선언은 독립에 대한 의지를 알리는 활동이었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "2·8 독립 선언이 발표됨"
    },
    "textbookPages": [
      "20·21호 4~5쪽 연표 · 20호 24~27 · 21호 20~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      20,
      21
    ]
  },
  {
    "id": "colonial-march1-1919",
    "sortYear": 1919,
    "dateLabel": "1919년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "3·1 운동이 일어남",
    "summary": "많은 사람이 태극기를 들고 독립 만세를 외쳤어요.",
    "life": "3·1 운동은 전국 각지로 퍼졌으며 해외에서도 이어졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🇰🇷",
      "alt": "3·1 운동이 일어남"
    },
    "textbookPages": [
      "20·21호 4~5쪽 연표 · 20호 24~27 · 21호 20~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      20,
      21
    ]
  },
  {
    "id": "colonial-provisionalgov-1919",
    "sortYear": 1919,
    "dateLabel": "1919년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "대한민국 임시정부가 세워짐",
    "summary": "독립운동가들이 중국 상하이에 대한민국 임시정부를 세웠어요.",
    "life": "임시정부는 독립운동을 조직하고 나라를 되찾기 위해 노력했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏛️",
      "alt": "대한민국 임시정부가 세워짐"
    },
    "textbookPages": [
      "20·21호 4~5쪽 연표 · 20호 24~27 · 21호 24~27쪽 본문"
    ],
    "sourceIssueNumbers": [
      20,
      21
    ]
  }
];

export const HISTORY_STUDY_EMPIRE: TimelineStudyNotesIndex = {
  "joseon-gojong-1863": [
    [
      20,
      "고종이 왕위에 오름",
      "어린 고종이 왕위에 오르자 흥선 대원군이 정치를 이끌었어요.",
      "흥선 대원군은 왕권을 강화하고 나라의 질서를 바로잡으려 했어요."
    ]
  ],
  "joseon-byeonginyangyo-1866": [
    [
      20,
      "병인양요가 일어남",
      "프랑스 군대가 강화도를 침략해 병인양요가 일어났어요.",
      "조선 군사들이 강화도에서 외국 군대의 공격에 맞서 싸웠어요."
    ]
  ],
  "joseon-sinmiyangyo-1871": [
    [
      20,
      "신미양요가 일어남",
      "미국 군대가 강화도를 공격해 신미양요가 일어났어요.",
      "광성보에서 어재연과 조선 군사들이 저항했어요."
    ]
  ],
  "joseon-unyo-1875": [
    [
      20,
      "운요호 사건이 일어남",
      "일본의 군함 운요호가 강화도 부근에서 무력 충돌을 일으켰어요.",
      "일본은 이후 조선에 불평등한 조약을 맺도록 압박했어요."
    ]
  ],
  "joseon-ganghwa-1876": [
    [
      20,
      "강화도 조약을 맺음",
      "조선과 일본이 강화도 조약을 맺었어요.",
      "일본의 무력 압박 속에서 맺은 불평등 조약으로, 조선이 문호를 여는 계기가 되었어요."
    ]
  ],
  "joseon-imogunran-1882": [
    [
      20,
      "임오군란이 일어남",
      "구식 군인들이 차별 대우와 밀린 급료 등에 항의하며 봉기했어요.",
      "새로운 제도를 둘러싼 갈등과 외세의 영향이 커졌어요."
    ]
  ],
  "joseon-gapsinjeongbyeon-1884": [
    [
      20,
      "갑신정변이 일어남",
      "급진 개화파가 정변을 일으켜 개혁을 추진하려 했어요.",
      "정변은 짧은 기간 안에 실패했지만 조선의 정치 개혁을 둘러싼 갈등을 보여 줘요."
    ]
  ],
  "joseon-gobu-petition-1893": [
    [
      20,
      "고부 사람들이 세금 감면을 요구함",
      "고부 지역의 사람들이 과도한 세금과 관리의 횡포에 항의했어요.",
      "백성의 생활 문제는 뒤이은 동학 농민 운동의 중요한 배경이 되었어요."
    ]
  ],
  "joseon-donghak-1894": [
    [
      20,
      "전봉준이 이끄는 동학 농민군이 봉기함",
      "전봉준 등이 관리의 부정과 외세에 맞서 동학 농민 운동을 이끌었어요.",
      "농민들은 탐관오리의 횡포를 바로잡고 새로운 사회를 만들고자 했어요."
    ]
  ],
  "joseon-independence-club-1896": [
    [
      20,
      "서재필 등이 독립협회를 만듦",
      "서재필 등은 독립협회를 만들고 자주독립과 개혁을 주장했어요.",
      "독립문 건립과 토론회 등을 통해 나라의 자주성을 강조했어요."
    ],
    [
      21,
      "서재필 등이 독립협회를 만듦",
      "서재필 등은 독립협회를 만들고 자주독립과 개혁을 주장했어요.",
      "독립문 건립과 토론회 등을 통해 나라의 자주성을 강조했어요."
    ]
  ],
  "empire-proclaimed-1897": [
    [
      20,
      "대한제국이 선포됨",
      "고종이 황제에 올라 나라 이름을 대한제국으로 바꾸었어요.",
      "나라의 자주독립을 밝히고 근대적인 국가를 만들려는 움직임이 이어졌어요."
    ],
    [
      21,
      "대한제국이 선포됨",
      "고종이 황제에 올라 나라 이름을 대한제국으로 바꾸었어요.",
      "나라의 자주독립을 밝히고 근대적인 국가를 만들려는 움직임이 이어졌어요."
    ]
  ],
  "empire-eulsa-1905": [
    [
      20,
      "을사늑약이 강요됨",
      "일본이 대한제국의 외교권을 빼앗는 을사늑약을 강요했어요.",
      "우리 민족은 조약의 부당함에 맞서 국권을 지키려는 활동을 이어 갔어요."
    ],
    [
      21,
      "을사늑약이 강요됨",
      "일본이 대한제국의 외교권을 빼앗는 을사늑약을 강요했어요.",
      "우리 민족은 조약의 부당함에 맞서 국권을 지키려는 활동을 이어 갔어요."
    ]
  ],
  "empire-gojong-abdication-1907": [
    [
      20,
      "고종이 강제로 퇴위함",
      "일본의 압박으로 고종이 황제 자리에서 물러나게 되었어요.",
      "고종은 헤이그에 특사를 보내 일본의 침략을 세계에 알리려 했어요."
    ],
    [
      21,
      "고종이 강제로 퇴위함",
      "일본의 압박으로 고종이 황제 자리에서 물러나게 되었어요.",
      "고종은 헤이그에 특사를 보내 일본의 침략을 세계에 알리려 했어요."
    ]
  ],
  "empire-ahn-junggeun-1909": [
    [
      20,
      "안중근이 이토 히로부미를 사살함",
      "안중근은 하얼빈에서 이토 히로부미를 사살했어요.",
      "그는 일본의 침략에 저항하고 동양 평화를 주장했어요."
    ],
    [
      21,
      "안중근이 이토 히로부미를 사살함",
      "안중근은 하얼빈에서 이토 히로부미를 사살했어요.",
      "그는 일본의 침략에 저항하고 동양 평화를 주장했어요."
    ]
  ],
  "colonial-annexation-1910": [
    [
      20,
      "일본에 국권을 빼앗김",
      "일본이 대한제국의 국권을 강탈하면서 식민지 지배가 시작되었어요.",
      "우리 민족은 나라를 되찾기 위한 다양한 독립운동을 이어 갔어요."
    ],
    [
      21,
      "일본에 국권을 빼앗김",
      "일본이 대한제국의 국권을 강탈하면서 식민지 지배가 시작되었어요.",
      "우리 민족은 나라를 되찾기 위한 다양한 독립운동을 이어 갔어요."
    ]
  ],
  "colonial-feb8-1919": [
    [
      20,
      "2·8 독립 선언이 발표됨",
      "일본 도쿄의 한국인 유학생들이 2·8 독립 선언을 발표했어요.",
      "해외 유학생들의 선언은 독립에 대한 의지를 알리는 활동이었어요."
    ],
    [
      21,
      "2·8 독립 선언이 발표됨",
      "일본 도쿄의 한국인 유학생들이 2·8 독립 선언을 발표했어요.",
      "해외 유학생들의 선언은 독립에 대한 의지를 알리는 활동이었어요."
    ]
  ],
  "colonial-march1-1919": [
    [
      20,
      "3·1 운동이 일어남",
      "많은 사람이 태극기를 들고 독립 만세를 외쳤어요.",
      "3·1 운동은 전국 각지로 퍼졌으며 해외에서도 이어졌어요."
    ],
    [
      21,
      "3·1 운동이 일어남",
      "많은 사람이 태극기를 들고 독립 만세를 외쳤어요.",
      "3·1 운동은 전국 각지로 퍼졌으며 해외에서도 이어졌어요."
    ]
  ],
  "colonial-provisionalgov-1919": [
    [
      20,
      "대한민국 임시정부가 세워짐",
      "독립운동가들이 중국 상하이에 대한민국 임시정부를 세웠어요.",
      "임시정부는 독립운동을 조직하고 나라를 되찾기 위해 노력했어요."
    ],
    [
      21,
      "대한민국 임시정부가 세워짐",
      "독립운동가들이 중국 상하이에 대한민국 임시정부를 세웠어요.",
      "임시정부는 독립운동을 조직하고 나라를 되찾기 위해 노력했어요."
    ]
  ]
};
