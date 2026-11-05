import type { HistoryTimelineEvent } from "./historyTimeline";

/**
 * 별꼼역사 교재·수업지도안 대조로 보완한 일반 연표 사건 13개.
 * 별별한국사·용선생 등 별도 참고문헌 카드가 아니므로 학생 화면에 보충 배지를 붙이지 않는다.
 * 기존 이벤트 ID를 보존해 기존 연표/연결 자료의 안정성을 유지한다.
 * 학생에게는 기존 기본 연표와 동일한 공개 및 수강 완료 호수 규칙으로 제공한다.
 * 아직 확인되지 않은 교재 원본 쪽수는 임의로 확정하지 않는다.
 */
export const HISTORY_TIMELINE_BYEOLKKUM_ADDITIONS: readonly HistoryTimelineEvent[] = [
  {
    "id": "supplement-flow-joseon-sherman-1866",
    "sortYear": 1866,
    "dateLabel": "1866년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "제너럴 셔먼호 사건이 일어남",
    "summary": "미국 상선 제너럴 셔먼호가 평양의 대동강을 거슬러 올라와 통상을 요구하다 조선 측과 충돌했어요.",
    "life": "선박이 불타는 사건으로 끝났고, 이후 조선과 미국 사이의 갈등을 이해하는 중요한 배경이 되었어요. 신미양요(1871년)와 연결해 살펴봐요.",
    "artifact": "제너럴 셔먼호 사건 관련 사료",
    "image": {
      "kind": "emoji",
      "value": "🚢",
      "alt": "제너럴 셔먼호 사건"
    },
    "sourceIssueNumbers": [
      20
    ],
    "textbookPages": [
      "별꼼역사 20호 2차시 교수·학습 지도안(문화 읽기) · 원본 교재 쪽수 미확인"
    ]
  },
  {
    "id": "supplement-flow-joseon-oppert-1868",
    "sortYear": 1868,
    "dateLabel": "1868년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "오페르트의 남연군 묘 도굴 미수 사건",
    "summary": "독일 상인 오페르트가 흥선 대원군의 아버지 남연군의 묘를 파헤치려다가 실패했어요.",
    "life": "외국 상인의 무리한 행동은 당시 조선에서 서양 세력에 대한 경계가 더욱 커지는 계기가 되었어요.",
    "artifact": "남연군 묘 관련 역사 자료",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "오페르트 도굴 미수 사건"
    },
    "sourceIssueNumbers": [
      20
    ],
    "textbookPages": [
      "별꼼역사 20호 2차시 교수·학습 지도안(문화 읽기) · 원본 교재 쪽수 미확인"
    ]
  },
  {
    "id": "supplement-flow-joseon-cheokhwabi-1871",
    "sortYear": 1871,
    "sortOrder": 7,
    "dateLabel": "1871년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "흥선 대원군이 척화비를 세움",
    "summary": "신미양요 이후 흥선 대원군은 서양과의 통상과 수교를 거부한다는 뜻을 담은 척화비를 여러 곳에 세웠어요.",
    "life": "비석에 새긴 문구를 통해 당시 조선 정부의 대외 정책을 알아볼 수 있어요. 이후 조선이 문호를 열게 된 변화와 비교해 보아요.",
    "artifact": "척화비",
    "image": {
      "kind": "emoji",
      "value": "🪨",
      "alt": "척화비 건립"
    },
    "sourceIssueNumbers": [
      20
    ],
    "textbookPages": [
      "별꼼역사 20호 1차시 교수·학습 지도안(차근차근 역사 알기) · 원본 교재 쪽수 미확인"
    ]
  },
  {
    "id": "supplement-flow-joseon-ugeumchi-1894",
    "sortYear": 1894,
    "sortOrder": 11,
    "dateLabel": "1894년 11월",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "우금치 전투가 일어남",
    "summary": "동학 농민군이 공주 우금치에서 일본군과 조선 관군에 맞서 싸웠으나 패했어요.",
    "life": "1894년 동학 농민 운동의 후반부를 이해하는 중요한 전투예요. 농민군의 개혁 요구와 외세의 침략에 맞선 움직임을 함께 살펴봐요.",
    "artifact": "공주 우금치 전적지",
    "image": {
      "kind": "emoji",
      "value": "🗺️",
      "alt": "우금치 전투"
    },
    "sourceIssueNumbers": [
      20
    ],
    "textbookPages": [
      "별꼼역사 20호 4차시 교수·학습 지도안(문화 읽기) · 원본 교재 쪽수 미확인"
    ]
  },
  {
    "id": "supplement-flow-joseon-dongnipsinmun-1896",
    "sortYear": 1896,
    "sortOrder": 4,
    "dateLabel": "1896년 4월 7일",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "서재필이 『독립신문』을 창간함",
    "summary": "서재필은 우리나라 최초의 근대적 민간신문인 『독립신문』의 창간을 주도했어요.",
    "life": "신문은 한글과 영어를 사용해 국내외 독자에게 새로운 소식과 개혁의 필요성을 알렸어요. 이후 독립협회 활동과 함께 자주독립과 국민 계몽의 흐름을 살펴봐요.",
    "artifact": "『독립신문』 창간호",
    "image": {
      "kind": "emoji",
      "value": "📰",
      "alt": "1896년 독립신문 창간"
    },
    "sourceIssueNumbers": [
      21
    ],
    "textbookPages": [
      "별꼼역사 21호 2차시 교수·학습 지도안(문화 읽기) · 원본 교재 쪽수 미확인"
    ]
  },
  {
    "id": "supplement-flow-colonial-gando-1920",
    "sortYear": 1920,
    "sortOrder": 11,
    "dateLabel": "1920년 10월 이후",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "일제가 간도 참변을 일으킴",
    "summary": "청산리 전투 이후 일본군이 간도 지역에 살던 한인들을 탄압하는 간도 참변이 일어났어요.",
    "life": "독립군의 항일 활동에 대한 일제의 보복 과정에서 벌어진 사건이에요. 봉오동 전투·청산리 전투 이후 독립운동이 겪은 어려움도 살펴봐요.",
    "artifact": "간도 참변 관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🗂️",
      "alt": "1920년 간도 참변"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "별꼼역사 22호 3차시 교수·학습 지도안(차근차근 역사 알기) · 원본 교재 쪽수 미확인"
    ]
  },
  {
    "id": "supplement-flow-colonial-svobodny-1921",
    "sortYear": 1921,
    "dateLabel": "1921년 6월",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "자유시 참변이 일어남",
    "summary": "러시아 자유시에 모인 한국 독립군 부대들이 지휘권과 통합 방식을 둘러싼 갈등 속에 큰 피해를 입었어요.",
    "life": "이 사건으로 독립군의 활동이 위축되었어요. 독립운동을 이어가기 위해 여러 단체가 다시 조직을 정비하는 과정을 함께 알아봐요.",
    "artifact": "자유시 참변 관련 역사 기록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "1921년 자유시 참변"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "별꼼역사 22호 3차시 교수·학습 지도안(차근차근 역사 알기) · 원본 교재 쪽수 미확인"
    ]
  },
  {
    "id": "supplement-flow-republic-oct26-1979",
    "sortYear": 1979,
    "sortOrder": 10,
    "dateLabel": "1979년 10월 26일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "10·26 사건이 발생함",
    "summary": "10·26 사건으로 박정희 대통령이 사망하면서 유신 체제가 끝나는 중요한 전환점이 만들어졌어요.",
    "life": "이후 정치적 혼란 속에서 민주주의 회복을 요구하는 움직임과 새로운 군부 세력의 움직임이 함께 나타났어요.",
    "artifact": "10·26 사건 관련 역사 기록",
    "image": {
      "kind": "emoji",
      "value": "📅",
      "alt": "1979년 10·26 사건"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "별꼼역사 23호 3차시 교수·학습 지도안(차근차근 역사 알기) · 원본 교재 쪽수 미확인"
    ]
  },
  {
    "id": "supplement-flow-republic-dec12-1979",
    "sortYear": 1979,
    "sortOrder": 12,
    "dateLabel": "1979년 12월 12일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "12·12 군사반란이 일어남",
    "summary": "전두환을 중심으로 한 신군부 세력이 군 지휘권을 장악하는 군사반란을 일으켰어요.",
    "life": "12·12 군사반란은 민주주의 회복을 어렵게 만들었고, 이후 1980년 5·18 민주화 운동에 이르는 역사적 배경 가운데 하나예요.",
    "artifact": "12·12 군사반란 관련 역사 기록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "1979년 12·12 군사반란"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "별꼼역사 23호 3차시 교수·학습 지도안(차근차근 역사 알기) · 원본 교재 쪽수 미확인"
    ]
  },
  {
    "id": "supplement-flow-colonial-rice-increase-plan-1920",
    "sortYear": 1920,
    "sortOrder": 1,
    "dateLabel": "1920년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "일제가 산미 증식 계획을 추진함",
    "summary": "일제는 일본에 필요한 쌀을 확보하려고 조선에서 쌀 생산을 늘리는 산미 증식 계획을 추진했어요.",
    "life": "수리시설 개선 등으로 쌀 생산량은 증가했지만 일본으로 가져가는 쌀도 늘었고, 많은 농민이 비용 부담과 생활의 어려움을 겪었어요.",
    "artifact": "산미 증식 계획 관련 자료",
    "image": {
      "kind": "emoji",
      "value": "🌾",
      "alt": "산미 증식 계획"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "별꼼역사 22호 2차시 수업지도안 · 도란도란 문화 읽기(교재 본문 쪽수 미확인)"
    ]
  },
  {
    "id": "supplement-flow-colonial-kim-sangok-1923",
    "sortYear": 1923,
    "dateLabel": "1923년 1월",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "김상옥이 서울에서 항일 활동을 전개함",
    "summary": "독립운동가 김상옥은 1923년 서울에서 일제에 맞서는 항일 활동을 전개했어요.",
    "life": "1923년 종로경찰서 투탄 사건과 관련하여 김상옥이 거론되지만, 실제로 누가 실행했는지는 확정되지 않았어요. 역사 자료에서 확인된 사실과 불확실한 내용을 구분해요.",
    "artifact": "김상옥 관련 독립운동 기록",
    "image": {
      "kind": "emoji",
      "value": "📚",
      "alt": "김상옥의 항일 활동"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "별꼼역사 22호 2차시 수업지도안 · 종알종알 인물 읽기(교재 본문 쪽수 미확인)"
    ]
  },
  {
    "id": "supplement-flow-colonial-arirang-1926",
    "sortYear": 1926,
    "sortOrder": 5,
    "dateLabel": "1926년 10월 1일",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "나운규의 영화 『아리랑』이 개봉함",
    "summary": "나운규가 각본·감독·주연을 맡은 무성영화 『아리랑』이 단성사에서 개봉했어요.",
    "life": "『아리랑』은 식민지 시대 한국인의 현실과 마음을 담아낸 작품으로, 우리나라 영화와 대중문화의 발전에 중요한 의미가 있어요.",
    "artifact": "영화 『아리랑』 포스터·관련 기록",
    "image": {
      "kind": "emoji",
      "value": "🎬",
      "alt": "나운규의 영화 아리랑"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "별꼼역사 22호 2차시 수업지도안 · 도란도란 문화 읽기(교재 본문 쪽수 미확인)"
    ]
  },
  {
    "id": "supplement-flow-republic-economic-plan-1962",
    "sortYear": 1962,
    "dateLabel": "1962년",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "제1차 경제 개발 5개년 계획이 시작됨",
    "summary": "정부는 1962년부터 제1차 경제 개발 5개년 계획을 추진했어요.",
    "life": "전력과 공장·도로 등 산업 기반을 확충하고 경제 성장을 이루려 했어요. 경제 규모가 커지는 한편 노동·지역 격차 등 해결해야 할 문제도 나타났어요.",
    "artifact": "제1차 경제 개발 5개년 계획 관련 자료",
    "image": {
      "kind": "emoji",
      "value": "🏭",
      "alt": "제1차 경제 개발 5개년 계획"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "별꼼역사 23호 3차시 수업지도안 · 차근차근 역사 알기(교재 본문 쪽수 미확인)"
    ]
  }
];
