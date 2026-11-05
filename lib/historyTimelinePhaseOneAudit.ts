import type { HistoryTimelineEvent } from "./historyTimeline";

/** 1차 사건·연도 누락 대조로 확인한 신규 카드.
 * 원전: 사용자가 업로드한 로빈의 한국사 / 한국사 읽기책 실제 PDF 페이지.
 * 공공 교차검증: 국사편찬위원회·국가기록원·제주4·3평화재단.
 * 이 목록은 일반 사건 목록/한능검 문제은행과 독립되어, 기존 참고자료 접근권한을 통해서만 제공한다.
 */
export type PhaseOneChronologyEvent = HistoryTimelineEvent & {
  phaseOneEvidence: { book: string; pdfPage: number; official: string };
};
export const HISTORY_TIMELINE_PHASE_ONE_EVENTS: readonly PhaseOneChronologyEvent[] = [
{
  "id": "phase1-goguryeo-nakrang-313",
  "sortYear": 313,
  "dateLabel": "313년",
  "stateOrEra": "고구려",
  "eraFilter": "고구려",
  "title": "미천왕이 낙랑군을 몰아냄",
  "summary": "고구려 미천왕은 313년 낙랑군을 공격해 그 지배 세력을 몰아냈어요.",
  "life": "낙랑군은 기원전 108년 고조선이 멸망한 뒤 설치된 한의 군현 가운데 하나였어요. 미천왕은 313년 낙랑군을, 이듬해 대방군을 공략하며 고구려의 영역을 넓혔어요.",
  "artifact": "낙랑군·대방군",
  "image": {
    "kind": "emoji",
    "value": "🏯",
    "alt": "313년 미천왕 낙랑군 축출"
  },
  "sourceIssueNumbers": [
    4,
    5
  ],
  "textbookPages": [],
  "phaseOneEvidence": {
    "book": "한 권으로 끝내는 로빈의 한국사",
    "pdfPage": 46,
    "official": "https://contents.history.go.kr/front/kc/printViewPopup.do?levelId=kc_n101115"
  }
},
  {
    "id": "phase1-joseon-eulsa-purge-1545",
    "sortYear": 1545,
    "dateLabel": "1545년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "을사사화가 일어남",
    "summary": "명종이 즉위하던 해에 외척 세력의 권력 다툼 속에서 을사사화가 일어났어요.",
    "life": "조선 전기의 사화가 사림과 외척 세력의 관계에 어떤 영향을 주었는지 살펴봐요. 문정왕후와 윤원형 등 외척이 권력을 강화한 계기가 되었어요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "을사사화가 일어남"
    },
    "sourceIssueNumbers": [
      16
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한 권으로 끝내는 로빈의 한국사",
      "pdfPage": 181,
      "official": "https://contents.history.go.kr/mobile/tg/view.do?levelId=tg_003_1390"
    }
  },
  {
    "id": "phase1-joseon-dongin-seoin-1575",
    "sortYear": 1575,
    "dateLabel": "1575년 무렵",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "동인과 서인으로 붕당이 나뉘기 시작함",
    "summary": "선조 때 이조 전랑의 임명 문제 등을 둘러싸고 사림이 동인과 서인으로 나뉘기 시작했어요.",
    "life": "김효원과 심의겸의 대립이 계기가 되었지만, 정치 운영에 관한 견해 차이도 붕당 형성의 배경이었어요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "👥",
      "alt": "동인과 서인으로 붕당이 나뉘기 시작함"
    },
    "sourceIssueNumbers": [
      16,
      17
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한 권으로 끝내는 로빈의 한국사",
      "pdfPage": 190,
      "official": "https://contents.history.go.kr/front/kc/printViewPopup.do?levelId=kc_n301800"
    }
  },
  {
    "id": "phase1-joseon-byeongin-persecution-1866",
    "sortYear": 1866,
    "dateLabel": "1866년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "병인박해가 시작됨",
    "summary": "흥선 대원군 집권기에 천주교에 대한 대규모 탄압인 병인박해가 시작되었어요.",
    "life": "프랑스 선교사 처형이 뒤이어 프랑스가 조선을 침략한 병인양요의 구실이 되었어요. 병인박해와 병인양요는 서로 다른 사건이에요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "⛪",
      "alt": "병인박해가 시작됨"
    },
    "sourceIssueNumbers": [
      20
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한 권으로 끝내는 로빈의 한국사",
      "pdfPage": 230,
      "official": "https://contents.history.go.kr/front/kc/printViewPopup.do?levelId=kc_i302620"
    }
  },
  {
    "id": "phase1-liberation-geonjun-1945",
    "sortYear": 1945,
    "dateLabel": "1945년 8월 15일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "조선 건국 준비 위원회가 발족함",
    "summary": "광복을 맞아 여운형 등이 조선 건국 준비 위원회를 조직해 해방 뒤의 사회 질서를 마련하고자 했어요.",
    "life": "1944년의 조선 건국 동맹과 1945년 광복 직후의 건국 준비 위원회를 구분하면 해방 전후의 준비 과정이 이어져 보여요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "🏛️",
      "alt": "조선 건국 준비 위원회가 발족함"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한 권으로 끝내는 로빈의 한국사",
      "pdfPage": 377,
      "official": "https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_o500100"
    }
  },
  {
    "id": "phase1-republic-jeju43-1948",
    "sortYear": 1948,
    "dateLabel": "1948년 4월 3일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "제주4·3사건이 일어남",
    "summary": "제주에서는 1947년부터 갈등이 커졌고, 1948년 4월 3일 무장봉기가 발생했어요.",
    "life": "이후 진압과 갈등이 이어지는 과정에서 많은 민간인이 희생되었어요. 해방 뒤 통일 정부 수립 문제와 지역사회의 갈등을 함께 살펴봐요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "🕊️",
      "alt": "제주4·3사건이 일어남"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한 권으로 끝내는 로빈의 한국사",
      "pdfPage": 388,
      "official": "https://jeju43peace.or.kr/kor/sub01_01_03.do"
    }
  },
  {
    "id": "phase1-republic-yeosun-1948",
    "sortYear": 1948,
    "dateLabel": "1948년 10월 19일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "여수·순천 10·19사건이 발생함",
    "summary": "여수에 있던 군 부대의 일부가 제주도 출동 명령을 거부하며 사건이 시작되었어요.",
    "life": "이후 무력 충돌과 진압 과정에서 많은 민간인이 희생되었어요. 제주4·3사건과 해방 이후의 정치·사회적 갈등을 연결해 살펴봐요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "🕊️",
      "alt": "여수·순천 10·19사건이 발생함"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한 권으로 끝내는 로빈의 한국사",
      "pdfPage": 388,
      "official": "https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_i502800"
    }
  },
  {
    "id": "phase1-republic-march15-election-1960",
    "sortYear": 1960,
    "dateLabel": "1960년 3월 15일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "3·15 부정선거가 실시됨",
    "summary": "1960년 대통령·부통령 선거에서 대규모 부정행위가 일어났어요.",
    "life": "부정선거에 반대하는 학생·시민들의 항의가 확대되어 같은 해 4·19 혁명으로 이어졌어요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "🗳️",
      "alt": "3·15 부정선거가 실시됨"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한 권으로 끝내는 로빈의 한국사",
      "pdfPage": 415,
      "official": "https://contents.history.go.kr/front/kc/printViewPopup.do?levelId=kc_i500600"
    }
  },
  {
    "id": "phase1-republic-japan-treaty-1965",
    "sortYear": 1965,
    "dateLabel": "1965년 6월 22일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "한일기본조약과 부속 협정이 조인됨",
    "summary": "대한민국과 일본이 외교 관계를 정상화하기 위한 조약 및 협정을 맺었어요.",
    "life": "경제 협력의 계기가 되었지만 식민지 지배에 대한 사과, 피해자 배상, 문화재 문제 등을 둘러싼 논란도 이어졌어요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "🤝",
      "alt": "한일기본조약과 부속 협정이 조인됨"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한 권으로 끝내는 로빈의 한국사",
      "pdfPage": 421,
      "official": "https://theme.archives.go.kr/next/govpo/detail.do?policySeq=502"
    }
  },
  {
    "id": "phase1-republic-july4-statement-1972",
    "sortYear": 1972,
    "dateLabel": "1972년 7월 4일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "7·4 남북 공동 성명이 발표됨",
    "summary": "남과 북은 자주·평화·민족대단결을 통일의 원칙으로 하는 공동 성명을 발표했어요.",
    "life": "남북 당국이 분단 이후 처음으로 통일 문제에 관해 공동으로 발표한 합의였어요. 같은 해 10월 유신 체제 성립과는 별개의 사건이에요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "📃",
      "alt": "7·4 남북 공동 성명이 발표됨"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한국사 읽기책",
      "pdfPage": 415,
      "official": "https://theme.archives.go.kr/next/unikorea/seven/seven01.do"
    }
  },
  {
    "id": "phase1-republic-october26-1979",
    "sortYear": 1979,
    "dateLabel": "1979년 10월 26일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "10·26사건으로 박정희 대통령이 사망함",
    "summary": "1979년 10월 26일 박정희 대통령이 피살되면서 유신 체제의 권력 구조가 크게 흔들렸어요.",
    "life": "부마 민주 항쟁 이후의 상황과 12·12 군사반란, 1980년 민주화 운동으로 이어지는 변화를 살펴봐요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "📅",
      "alt": "10·26사건으로 박정희 대통령이 사망함"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한 권으로 끝내는 로빈의 한국사",
      "pdfPage": 434,
      "official": "https://contents.history.go.kr/front/kc/printViewPopup.do?levelId=kc_i500150"
    }
  },
  {
    "id": "phase1-republic-december12-1979",
    "sortYear": 1979,
    "dateLabel": "1979년 12월 12일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "12·12 군사반란이 일어남",
    "summary": "전두환 등 신군부 세력이 군 내부의 지휘 체계를 무너뜨리고 군사적 권력을 장악했어요.",
    "life": "10·26사건 뒤의 권력 공백과 1980년 5·18 민주화 운동 전후의 정치 상황을 연결해 이해할 수 있어요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "📅",
      "alt": "12·12 군사반란이 일어남"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한 권으로 끝내는 로빈의 한국사",
      "pdfPage": 434,
      "official": "https://contents.history.go.kr/front/kc/printViewPopup.do?levelId=kc_i500150"
    }
  },
  {
    "id": "phase1-republic-unjoint-1991",
    "sortYear": 1991,
    "dateLabel": "1991년 9월 17일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "남북한이 유엔에 동시 가입함",
    "summary": "남한과 북한이 1991년 각각 유엔 회원국으로 가입했어요.",
    "life": "남북이 국제사회에서 함께 활동하는 새로운 국면을 맞은 사건으로, 같은 해 남북기본합의서와 연결해서 살펴봐요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "🌐",
      "alt": "남북한이 유엔에 동시 가입함"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한국사 읽기책",
      "pdfPage": 414,
      "official": "https://theme.archives.go.kr/next/govpo/detail.do?policySeq=602"
    }
  },
  {
    "id": "phase1-republic-basic-agreement-1991",
    "sortYear": 1991,
    "dateLabel": "1991년 12월 13일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "남북기본합의서가 채택됨",
    "summary": "남북한이 화해, 불가침, 교류·협력에 관한 기본합의서를 채택했어요.",
    "life": "1991년 12월 채택된 뒤 1992년 2월 발효되었어요. 1972년 7·4 남북 공동 성명, 2000년 6·15 남북 공동 선언과 함께 살펴봐요.",
    "artifact": "해당 사건의 참고자료는 아래 출처 표시를 확인하세요.",
    "image": {
      "kind": "emoji",
      "value": "🤝",
      "alt": "남북기본합의서가 채택됨"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "한국사 읽기책",
      "pdfPage": 416,
      "official": "https://theme.archives.go.kr/next/unikorea/1991/cont1991_1.do"
    }
  }
];
