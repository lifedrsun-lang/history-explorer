import type { HistoryTimelineEvent } from "./historyTimeline";
import type { TimelineStudyNotesIndex } from "./historyTimelineStudyTypes";

/** 별꼼역사 22~23호 4~5쪽 연표 및 본문 근거. 앞선 독립 운동과 정부 수립을
 * 한 연표로 이어주되 22호·23호의 배운 내용 공개 권한은 구분한다.
 * 1945년 광복/신탁 통치 논쟁과 1948년 대한민국 정부 수립은 별도 사건.
 */
export const HISTORY_TIMELINE_MODERN_EVENTS: HistoryTimelineEvent[] = [
  {
    "id": "colonial-cheongsanri-1920",
    "sortYear": 1920,
    "dateLabel": "1920년 10월",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "김좌진 등이 청산리 전투에서 승리함",
    "summary": "김좌진 등이 이끄는 독립군이 청산리 일대에서 일본군과 싸워 승리를 거두었어요.",
    "life": "독립군은 여러 차례의 전투를 통해 일본군의 공격에 맞섰어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "김좌진 등이 청산리 전투에서 승리함"
    },
    "textbookPages": [
      "22호 4~5쪽 연표 · 22호 8~11쪽 본문"
    ],
    "sourceIssueNumbers": [
      22
    ],
    "sortOrder": 10
  },
  {
    "id": "colonial-bakeunshik-1920",
    "sortYear": 1920,
    "dateLabel": "1920년 12월",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "박은식이 『한국독립운동지혈사』를 펴냄",
    "summary": "박은식이 독립운동의 과정을 기록한 책을 펴냈어요.",
    "life": "우리 민족이 나라를 되찾으려 싸운 역사를 후대에 남기려 했어요.",
    "artifact": "『한국독립운동지혈사』",
    "image": {
      "kind": "emoji",
      "value": "📚",
      "alt": "박은식이 『한국독립운동지혈사』를 펴냄"
    },
    "textbookPages": [
      "22호 4~5쪽 연표 · 22호 18~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      22
    ],
    "sortOrder": 12
  },
  {
    "id": "colonial-june10-1926",
    "sortYear": 1926,
    "dateLabel": "1926년 6월 10일",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "6·10 만세 운동이 일어남",
    "summary": "학생과 시민 등이 일본의 식민지 지배에 맞서 독립 만세를 외쳤어요.",
    "life": "독립을 위한 움직임이 3·1 운동 뒤에도 계속되었음을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🇰🇷",
      "alt": "6·10 만세 운동이 일어남"
    },
    "textbookPages": [
      "22호 4~5쪽 연표 · 22호 10~13쪽 본문"
    ],
    "sourceIssueNumbers": [
      22
    ],
    "sortOrder": 6
  },
  {
    "id": "colonial-singanhae-1927",
    "sortYear": 1927,
    "dateLabel": "1927년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "신간회가 만들어짐",
    "summary": "여러 독립운동 세력이 힘을 합쳐 신간회를 만들었어요.",
    "life": "서로 생각이 달라도 민족의 독립을 위해 연대하려는 활동이었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🤝",
      "alt": "신간회가 만들어짐"
    },
    "textbookPages": [
      "22호 4~5쪽 연표 · 22호 12~15쪽 본문"
    ],
    "sourceIssueNumbers": [
      22
    ]
  },
  {
    "id": "colonial-gwangju-students-1929",
    "sortYear": 1929,
    "dateLabel": "1929년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "광주 학생 항일 운동이 일어남",
    "summary": "광주의 학생들이 일제의 차별과 억압에 맞서 항일 운동을 벌였어요.",
    "life": "운동은 다른 지역의 학생들에게도 퍼졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📣",
      "alt": "광주 학생 항일 운동이 일어남"
    },
    "textbookPages": [
      "22호 4~5쪽 연표 · 22호 10~15쪽 본문"
    ],
    "sourceIssueNumbers": [
      22
    ]
  },
  {
    "id": "colonial-yunbonggil-1932",
    "sortYear": 1932,
    "dateLabel": "1932년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "윤봉길이 상하이 홍커우 공원에서 의거함",
    "summary": "윤봉길이 상하이 홍커우 공원에서 일본군과 주요 인사들을 겨냥한 의거를 일으켰어요.",
    "life": "일제의 지배에 맞선 독립운동 활동 가운데 하나였어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "윤봉길이 상하이 홍커우 공원에서 의거함"
    },
    "textbookPages": [
      "22호 4~5쪽 연표 · 22호 20~23쪽 본문"
    ],
    "sourceIssueNumbers": [
      22
    ]
  },
  {
    "id": "colonial-namechange-1940",
    "sortYear": 1940,
    "dateLabel": "1940년 2월",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "일제가 창씨개명을 강요함",
    "summary": "일제는 조선인의 이름을 일본식으로 바꾸도록 압박했어요.",
    "life": "식민지 지배 과정에서 말과 이름, 문화까지 통제하려는 정책이었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "일제가 창씨개명을 강요함"
    },
    "textbookPages": [
      "22호 4~5쪽 연표 · 22호 6~9쪽 본문"
    ],
    "sourceIssueNumbers": [
      22
    ],
    "sortOrder": 2
  },
  {
    "id": "colonial-korean-liberation-army-1940",
    "sortYear": 1940,
    "dateLabel": "1940년 9월",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "한국광복군이 창설됨",
    "summary": "대한민국 임시정부가 중국 충칭에서 한국광복군을 창설했어요.",
    "life": "독립을 위해 군사 활동을 준비하고 연합국과 협력하려 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "한국광복군이 창설됨"
    },
    "textbookPages": [
      "22호 4~5쪽 연표 · 22호 20~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      22
    ],
    "sortOrder": 9
  },
  {
    "id": "liberation-1945",
    "sortYear": 1945,
    "dateLabel": "1945년 8월 15일",
    "stateOrEra": "한반도",
    "eraFilter": "대한민국",
    "title": "8·15 광복을 맞음",
    "summary": "1945년 8월 15일 일본의 식민지 지배에서 벗어나 광복을 맞았어요.",
    "life": "광복 뒤 우리나라는 새로운 정부를 세우는 과정에서 남과 북으로 갈라졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🇰🇷",
      "alt": "8·15 광복을 맞음"
    },
    "textbookPages": [
      "23호 4~5쪽 연표 · 23호 6~11쪽 본문"
    ],
    "sourceIssueNumbers": [
      23
    ],
    "sortOrder": 8
  },
  {
    "id": "liberation-trusteeship-1945",
    "sortYear": 1945,
    "dateLabel": "1945년 12월",
    "stateOrEra": "한반도",
    "eraFilter": "대한민국",
    "title": "신탁 통치에 반대하는 운동이 일어남",
    "summary": "광복 직후 신탁 통치 문제를 둘러싸고 여러 세력이 의견을 나누고 반대 운동을 벌였어요.",
    "life": "국가를 어떻게 세울지에 대한 의견 차이가 분단 문제와 연결되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📣",
      "alt": "신탁 통치에 반대하는 운동이 일어남"
    },
    "textbookPages": [
      "23호 4~5쪽 연표 · 23호 8~11쪽 본문"
    ],
    "sourceIssueNumbers": [
      23
    ],
    "sortOrder": 12
  },
  {
    "id": "republic-government-1948",
    "sortYear": 1948,
    "dateLabel": "1948년 8월 15일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "대한민국 정부가 수립됨",
    "summary": "1948년 8월 15일 남한에 대한민국 정부가 세워졌어요.",
    "life": "북한에도 별도의 정권이 들어서면서 분단이 굳어졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏛️",
      "alt": "대한민국 정부가 수립됨"
    },
    "textbookPages": [
      "23호 4~5쪽 연표 · 23호 10~13쪽 본문"
    ],
    "sourceIssueNumbers": [
      23
    ],
    "sortOrder": 8
  },
  {
    "id": "republic-koreanwar-1950",
    "sortYear": 1950,
    "dateLabel": "1950년 6월 25일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "6·25 전쟁이 일어남",
    "summary": "1950년 6월 25일 북한군의 남침으로 6·25 전쟁이 시작되었어요.",
    "life": "전쟁으로 많은 사람들이 어려움을 겪었고 분단의 상처가 깊어졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "6·25 전쟁이 일어남"
    },
    "textbookPages": [
      "23호 4~5쪽 연표 · 23호 12~19쪽 본문"
    ],
    "sourceIssueNumbers": [
      23
    ],
    "sortOrder": 6
  },
  {
    "id": "republic-april19-1960",
    "sortYear": 1960,
    "dateLabel": "1960년",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "4·19 혁명이 일어남",
    "summary": "부정 선거에 항의하는 학생과 시민의 시위가 전국으로 퍼졌어요.",
    "life": "시민들은 민주주의를 지키기 위해 힘을 모았어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🗳️",
      "alt": "4·19 혁명이 일어남"
    },
    "textbookPages": [
      "23호 4~5쪽 연표 · 23호 20~23쪽 본문"
    ],
    "sourceIssueNumbers": [
      23
    ]
  },
  {
    "id": "republic-may16-1961",
    "sortYear": 1961,
    "dateLabel": "1961년",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "5·16 군사 정변이 일어남",
    "summary": "군인들이 정변을 일으켜 정권을 장악했어요.",
    "life": "이 사건은 우리나라 민주주의의 역사에서 중요한 전환점이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏛️",
      "alt": "5·16 군사 정변이 일어남"
    },
    "textbookPages": [
      "23호 4~5쪽 연표 · 23호 20~23쪽 본문"
    ],
    "sourceIssueNumbers": [
      23
    ]
  },
  {
    "id": "republic-may18-1980",
    "sortYear": 1980,
    "dateLabel": "1980년",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "5·18 민주화 운동이 일어남",
    "summary": "광주 시민들이 군부의 권력 장악과 민주주의 억압에 맞서 저항했어요.",
    "life": "민주주의와 인권의 소중함을 배우는 중요한 사건이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🕯️",
      "alt": "5·18 민주화 운동이 일어남"
    },
    "textbookPages": [
      "23호 4~5쪽 연표 · 23호 22~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      23
    ]
  },
  {
    "id": "republic-june1987-1987",
    "sortYear": 1987,
    "dateLabel": "1987년",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "6월 민주 항쟁이 일어남",
    "summary": "전국의 시민들이 대통령 직선제 등 민주주의 확대를 요구하며 시위를 벌였어요.",
    "life": "시민들의 참여는 민주화 제도를 발전시키는 계기가 되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🗳️",
      "alt": "6월 민주 항쟁이 일어남"
    },
    "textbookPages": [
      "23호 4~5쪽 연표 · 23호 22~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      23
    ]
  }
];

export const HISTORY_STUDY_MODERN: TimelineStudyNotesIndex = {
  "colonial-cheongsanri-1920": [
    [
      22,
      "김좌진 등이 청산리 전투에서 승리함",
      "김좌진 등이 이끄는 독립군이 청산리 일대에서 일본군과 싸워 승리를 거두었어요.",
      "독립군은 여러 차례의 전투를 통해 일본군의 공격에 맞섰어요."
    ]
  ],
  "colonial-bakeunshik-1920": [
    [
      22,
      "박은식이 『한국독립운동지혈사』를 펴냄",
      "박은식이 독립운동의 과정을 기록한 책을 펴냈어요.",
      "우리 민족이 나라를 되찾으려 싸운 역사를 후대에 남기려 했어요."
    ]
  ],
  "colonial-june10-1926": [
    [
      22,
      "6·10 만세 운동이 일어남",
      "학생과 시민 등이 일본의 식민지 지배에 맞서 독립 만세를 외쳤어요.",
      "독립을 위한 움직임이 3·1 운동 뒤에도 계속되었음을 보여 줘요."
    ]
  ],
  "colonial-singanhae-1927": [
    [
      22,
      "신간회가 만들어짐",
      "여러 독립운동 세력이 힘을 합쳐 신간회를 만들었어요.",
      "서로 생각이 달라도 민족의 독립을 위해 연대하려는 활동이었어요."
    ]
  ],
  "colonial-gwangju-students-1929": [
    [
      22,
      "광주 학생 항일 운동이 일어남",
      "광주의 학생들이 일제의 차별과 억압에 맞서 항일 운동을 벌였어요.",
      "운동은 다른 지역의 학생들에게도 퍼졌어요."
    ]
  ],
  "colonial-yunbonggil-1932": [
    [
      22,
      "윤봉길이 상하이 홍커우 공원에서 의거함",
      "윤봉길이 상하이 홍커우 공원에서 일본군과 주요 인사들을 겨냥한 의거를 일으켰어요.",
      "일제의 지배에 맞선 독립운동 활동 가운데 하나였어요."
    ]
  ],
  "colonial-namechange-1940": [
    [
      22,
      "일제가 창씨개명을 강요함",
      "일제는 조선인의 이름을 일본식으로 바꾸도록 압박했어요.",
      "식민지 지배 과정에서 말과 이름, 문화까지 통제하려는 정책이었어요."
    ]
  ],
  "colonial-korean-liberation-army-1940": [
    [
      22,
      "한국광복군이 창설됨",
      "대한민국 임시정부가 중국 충칭에서 한국광복군을 창설했어요.",
      "독립을 위해 군사 활동을 준비하고 연합국과 협력하려 했어요."
    ]
  ],
  "liberation-1945": [
    [
      23,
      "8·15 광복을 맞음",
      "1945년 8월 15일 일본의 식민지 지배에서 벗어나 광복을 맞았어요.",
      "광복 뒤 우리나라는 새로운 정부를 세우는 과정에서 남과 북으로 갈라졌어요."
    ]
  ],
  "liberation-trusteeship-1945": [
    [
      23,
      "신탁 통치에 반대하는 운동이 일어남",
      "광복 직후 신탁 통치 문제를 둘러싸고 여러 세력이 의견을 나누고 반대 운동을 벌였어요.",
      "국가를 어떻게 세울지에 대한 의견 차이가 분단 문제와 연결되었어요."
    ]
  ],
  "republic-government-1948": [
    [
      23,
      "대한민국 정부가 수립됨",
      "1948년 8월 15일 남한에 대한민국 정부가 세워졌어요.",
      "북한에도 별도의 정권이 들어서면서 분단이 굳어졌어요."
    ]
  ],
  "republic-koreanwar-1950": [
    [
      23,
      "6·25 전쟁이 일어남",
      "1950년 6월 25일 북한군의 남침으로 6·25 전쟁이 시작되었어요.",
      "전쟁으로 많은 사람들이 어려움을 겪었고 분단의 상처가 깊어졌어요."
    ]
  ],
  "republic-april19-1960": [
    [
      23,
      "4·19 혁명이 일어남",
      "부정 선거에 항의하는 학생과 시민의 시위가 전국으로 퍼졌어요.",
      "시민들은 민주주의를 지키기 위해 힘을 모았어요."
    ]
  ],
  "republic-may16-1961": [
    [
      23,
      "5·16 군사 정변이 일어남",
      "군인들이 정변을 일으켜 정권을 장악했어요.",
      "이 사건은 우리나라 민주주의의 역사에서 중요한 전환점이에요."
    ]
  ],
  "republic-may18-1980": [
    [
      23,
      "5·18 민주화 운동이 일어남",
      "광주 시민들이 군부의 권력 장악과 민주주의 억압에 맞서 저항했어요.",
      "민주주의와 인권의 소중함을 배우는 중요한 사건이에요."
    ]
  ],
  "republic-june1987-1987": [
    [
      23,
      "6월 민주 항쟁이 일어남",
      "전국의 시민들이 대통령 직선제 등 민주주의 확대를 요구하며 시위를 벌였어요.",
      "시민들의 참여는 민주화 제도를 발전시키는 계기가 되었어요."
    ]
  ]
};
