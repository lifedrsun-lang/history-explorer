import type { HistoryTimelineEvent } from "./historyTimeline";
/** 『용선생 교과서 한국사』 1·2권의 실제 인쇄 쪽수에 있는 시대 연표를 대조해
 * 기존 핵심 연표 및 별별한국사 전용 카드와 겹치지 않는 사건만 분리한 자료.
 * 일반 학생 연표/한능검 문제은행 데이터에는 합치지 않는다.
 * sourceIssueNumbers는 학생의 기존 수업 진도에 맞춘 열람 구분이며 용선생의 호수 표기가 아니다.
 */
export type YongSource = { volume: 1 | 2; printedPage: number };
export type YongTimelineEvent = HistoryTimelineEvent & {yongSource:YongSource;yongseonsaeng:true};
export const YONG_TIMELINE_EVENTS: YongTimelineEvent[] = [
  {
    "id": "yong-goryeo-gochang-930",
    "sortYear": 930,
    "dateLabel": "930년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "왕건이 고창 전투에서 후백제군을 물리침",
    "summary": "고려군은 고창(오늘날 안동 일대)에서 후백제군을 물리쳤어요.",
    "life": "후삼국의 경쟁에서 고려가 우세해지는 계기 가운데 하나였어요. 918년 건국과 936년 후삼국 통일 사이의 흐름을 연결해 봐요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "왕건이 고창 전투에서 후백제군을 물리침"
    },
    "sourceIssueNumbers": [
      10
    ],
    "textbookPages": [
      "용선생 교과서 한국사 1권 96쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 1,
      "printedPage": 96
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-joseon-tsushima-1419",
    "sortYear": 1419,
    "dateLabel": "1419년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "조선이 대마도를 정벌함",
    "summary": "세종 때 이종무가 이끄는 군대가 왜구 문제에 대응해 대마도를 공격했어요.",
    "life": "대마도 정벌은 조선 전기 해안 방어와 대외 관계를 이해하는 사건이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⛵",
      "alt": "조선이 대마도를 정벌함"
    },
    "sourceIssueNumbers": [
      14,
      15
    ],
    "textbookPages": [
      "용선생 교과서 한국사 1권 200쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 1,
      "printedPage": 200
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-joseon-northern-1434",
    "sortYear": 1434,
    "dateLabel": "1434년 무렵",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "세종 때 4군 6진을 개척함",
    "summary": "세종 때 북방 지역에 4군과 6진을 설치해 국경을 정비했어요.",
    "life": "압록강과 두만강 일대에 대한 조선의 지배를 강화하는 과정이었어요. 지역마다 설치 시기가 달라 '1434년 무렵'으로 표시해요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🗺️",
      "alt": "세종 때 4군 6진을 개척함"
    },
    "sourceIssueNumbers": [
      15
    ],
    "textbookPages": [
      "용선생 교과서 한국사 1권 200쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 1,
      "printedPage": 200
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-joseon-gyeyu-1453",
    "sortYear": 1453,
    "dateLabel": "1453년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "계유정난이 일어남",
    "summary": "수양대군이 계유정난을 일으켜 정치적 주도권을 장악했어요.",
    "life": "단종이 왕위에 있던 때 일어난 사건으로 1455년 수양대군이 세조로 즉위하는 과정과 연결돼요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "계유정난이 일어남"
    },
    "sourceIssueNumbers": [
      16
    ],
    "textbookPages": [
      "용선생 교과서 한국사 1권 218쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 1,
      "printedPage": 218
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-joseon-baegundong-1543",
    "sortYear": 1543,
    "dateLabel": "1543년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "주세붕이 백운동 서원을 세움",
    "summary": "주세붕은 풍기에 백운동 서원을 세워 유학 교육과 선현 제향에 힘썼어요.",
    "life": "뒤에 소수서원으로 이름이 바뀌었어요. 조선에서 서원이 발전하는 흐름을 살펴볼 수 있어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏫",
      "alt": "주세붕이 백운동 서원을 세움"
    },
    "sourceIssueNumbers": [
      16
    ],
    "textbookPages": [
      "용선생 교과서 한국사 1권 218쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 1,
      "printedPage": 218
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-joseon-tangpyeongbi-1742",
    "sortYear": 1742,
    "dateLabel": "1742년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "영조가 탕평비를 세움",
    "summary": "영조 때 성균관 앞에 탕평비를 세워 붕당을 넘어 인재를 쓰겠다는 뜻을 드러냈어요.",
    "life": "탕평 정치의 목표를 상징하는 유산으로, 1750년 균역법과 함께 영조의 정치를 살펴봐요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🪨",
      "alt": "영조가 탕평비를 세움"
    },
    "sourceIssueNumbers": [
      19
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 30쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 30
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-empire-hague-1907",
    "sortYear": 1907,
    "dateLabel": "1907년",
    "stateOrEra": "대한제국",
    "eraFilter": "대한제국",
    "title": "고종이 헤이그에 특사를 파견함",
    "summary": "고종은 국제회의가 열린 헤이그에 특사를 보내 일본의 침략과 을사늑약의 부당함을 알리려 했어요.",
    "life": "특사 파견 뒤 일본의 압박이 거세졌고 고종은 강제로 퇴위했어요. 기존 '고종 퇴위' 카드의 앞선 사건이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📨",
      "alt": "고종이 헤이그에 특사를 파견함"
    },
    "sourceIssueNumbers": [
      21
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 104쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 104
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-colonial-105-1911",
    "sortYear": 1911,
    "dateLabel": "1911년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "일제가 105인 사건을 일으킴",
    "summary": "일제는 독립운동 세력을 탄압하기 위해 많은 인물을 체포하고 재판에 넘겼어요.",
    "life": "데라우치 총독 암살 음모를 조작한 사건으로, 일제의 무단 통치와 민족 운동 탄압을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "일제가 105인 사건을 일으킴"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 114쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 114
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-colonial-land-1912",
    "sortYear": 1912,
    "dateLabel": "1912년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "일제가 토지 조사령을 공포함",
    "summary": "일제는 토지 조사 사업을 추진하면서 토지 소유권을 조사했어요.",
    "life": "조사 과정에서 토지 소유 관계와 세금 징수 체계가 재편되었고 많은 농민이 불안정한 처지에 놓였어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🌾",
      "alt": "일제가 토지 조사령을 공포함"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 114쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 114
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-colonial-manchuria-1931",
    "sortYear": 1931,
    "dateLabel": "1931년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "일본이 만주사변을 일으킴",
    "summary": "일본군은 만주사변을 일으켜 중국 동북 지역에 대한 침략을 확대했어요.",
    "life": "이후 일본의 대륙 침략이 확대되었고, 한반도에 대한 식민 통제도 더욱 강화되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "일본이 만주사변을 일으킴"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 154쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 154
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-colonial-china-1937",
    "sortYear": 1937,
    "dateLabel": "1937년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "중일 전쟁이 시작됨",
    "summary": "일본이 중국에 대한 전면적인 침략 전쟁을 확대했어요.",
    "life": "전쟁에 필요한 인력과 물자를 확보하려고 조선인에 대한 동원과 통제가 심해졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "중일 전쟁이 시작됨"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 154쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 154
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-colonial-mobilization-1938",
    "sortYear": 1938,
    "dateLabel": "1938년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "국가 총동원법이 제정됨",
    "summary": "일본은 전쟁 수행을 위해 인력과 자원을 통제할 수 있도록 국가 총동원법을 제정했어요.",
    "life": "전시 동원 체제가 확대되면서 조선인의 생활에도 큰 영향을 미쳤어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📋",
      "alt": "국가 총동원법이 제정됨"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 154쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 154
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-colonial-ally-1944",
    "sortYear": 1944,
    "dateLabel": "1944년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "여운형 등이 조선 건국 동맹을 조직함",
    "summary": "여운형 등은 광복 이후의 국가 건설을 준비하며 비밀 조직인 조선 건국 동맹을 만들었어요.",
    "life": "광복이 갑자기 시작된 것만은 아니며 국내에서도 해방 이후를 준비한 움직임이 있었음을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🤝",
      "alt": "여운형 등이 조선 건국 동맹을 조직함"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 154쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 154
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-liberation-joint-1946",
    "sortYear": 1946,
    "dateLabel": "1946년 3월",
    "stateOrEra": "한반도",
    "eraFilter": "대한민국",
    "title": "제1차 미소공동위원회가 열림",
    "summary": "광복 뒤 통일된 정부를 세우는 방안을 논의하기 위해 미국과 소련 대표들이 회의를 열었어요.",
    "life": "참여 단체를 둘러싼 견해 차이 등으로 성과를 내지 못했어요. 신탁 통치 논쟁과 정부 수립의 흐름 사이에 위치해요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏛️",
      "alt": "제1차 미소공동위원회가 열림"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 176쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 176
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-war-incheon-1950",
    "sortYear": 1950,
    "dateLabel": "1950년 9월 15일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "인천 상륙 작전이 이루어짐",
    "summary": "국군과 유엔군은 인천 상륙 작전을 통해 전쟁의 흐름을 바꾸는 전기를 마련했어요.",
    "life": "6월 25일 전쟁 발발 이후 낙동강 방어선, 인천 상륙 작전, 서울 수복으로 이어진 흐름을 살펴봐요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚓",
      "alt": "인천 상륙 작전이 이루어짐"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 196쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 196
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-war-chinese-1950",
    "sortYear": 1950,
    "dateLabel": "1950년 10월 이후",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "중국군이 6·25 전쟁에 개입함",
    "summary": "중국군의 개입으로 전선이 다시 남쪽으로 이동하면서 전쟁이 장기화되었어요.",
    "life": "인천 상륙 작전과 북한 지역 진격 뒤에 전쟁 양상이 어떻게 달라졌는지 비교해요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🗺️",
      "alt": "중국군이 6·25 전쟁에 개입함"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 196쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 196
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-modern-olympics-1988",
    "sortYear": 1988,
    "dateLabel": "1988년",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "서울 올림픽이 개최됨",
    "summary": "1988년 서울에서 하계 올림픽이 열렸어요.",
    "life": "국제 사회와의 교류가 확대되는 계기였어요. 1987년 민주화 이후의 사회 변화를 함께 살펴봐요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏅",
      "alt": "서울 올림픽이 개최됨"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 238쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 238
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-modern-local-1995",
    "sortYear": 1995,
    "dateLabel": "1995년",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "전국동시지방선거가 실시됨",
    "summary": "1995년 지방자치단체장과 지방의회 의원을 뽑는 전국동시지방선거가 실시되었어요.",
    "life": "주민들이 자신이 사는 지역의 대표를 직접 선택하며 지방자치가 본격적으로 확대되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🗳️",
      "alt": "전국동시지방선거가 실시됨"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 238쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 238
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-modern-crisis-1997",
    "sortYear": 1997,
    "dateLabel": "1997년",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "외환위기가 발생함",
    "summary": "1997년 대한민국은 심각한 외환위기를 겪고 국제통화기금(IMF)에 자금 지원을 요청했어요.",
    "life": "경제와 일자리, 가계의 생활에 큰 영향을 주었어요. 민주화 이후에도 여러 경제적 과제가 있었음을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "💹",
      "alt": "외환위기가 발생함"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 238쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 238
    },
    "yongseonsaeng": true
  },
  {
    "id": "yong-modern-panmunjom-2018",
    "sortYear": 2018,
    "dateLabel": "2018년 4월 27일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "남북 정상이 판문점 선언을 발표함",
    "summary": "2018년 남북 정상회담에서 한반도 평화와 관계 개선을 위한 판문점 선언이 발표되었어요.",
    "life": "남북 관계 개선을 위한 여러 시도 가운데 하나로, 2000년 6·15 공동 선언 등과 이어서 살펴볼 수 있어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🕊️",
      "alt": "남북 정상이 판문점 선언을 발표함"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "용선생 교과서 한국사 2권 238쪽(시대 연표)"
    ],
    "yongSource": {
      "volume": 2,
      "printedPage": 238
    },
    "yongseonsaeng": true
  }
];
