import type { HistoryTimelineEvent } from "./historyTimeline";
import type { ByeolbyeolLevel } from "./historyTimelineByeolbyeolTypes";

/**
 * 별별한국사 자료를 대조해 기존 01~23호 연표에 없는 역사 흐름만 담은 전용 카드.
 * 공개 연표의 221개 사건이나 기출 문제은행에 합치지 않는다.
 * 별별한국사 권한을 검증한 별도 API에서만 제공하며, 교재 원문을 전재하지 않는다.
 */
export type ByeolbyeolFlowEvent = HistoryTimelineEvent & {
  byeolbyeolLevel: ByeolbyeolLevel;
};

export const HISTORY_TIMELINE_BYEOLBYEOL_FLOW_EVENTS: readonly ByeolbyeolFlowEvent[] =
[
  {
    "id": "supplement-flow-gaya-gumgwan-532",
    "sortYear": 532,
    "dateLabel": "532년",
    "stateOrEra": "가야",
    "eraFilter": "가야",
    "title": "금관가야가 신라에 병합됨",
    "summary": "김해를 중심으로 성장했던 금관가야가 신라에 병합되었어요.",
    "life": "가야의 여러 나라는 한꺼번에 사라진 것이 아니에요. 금관가야는 532년, 대가야는 562년 신라에 병합되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏺",
      "alt": "금관가야가 신라에 병합됨"
    },
    "sourceIssueNumbers": [
      7
    ],
    "textbookPages": [
      "별별한국사 기본 · 04-1 통일 신라 전기 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-silla-maesoseong-675",
    "sortYear": 675,
    "dateLabel": "675년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "매소성 전투에서 당군을 물리침",
    "summary": "신라가 매소성 전투에서 당나라 군대를 물리쳤어요.",
    "life": "백제와 고구려가 멸망한 뒤에도 당나라와의 전쟁이 이어졌어요. 신라는 한반도에 대한 당나라의 지배 시도에 맞섰어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "매소성 전투에서 당군을 물리침"
    },
    "sourceIssueNumbers": [
      8
    ],
    "textbookPages": [
      "별별한국사 기본 · 04-1 통일 신라 전기 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic",
    "sortOrder": 3
  },
  {
    "id": "supplement-flow-silla-gibeolpo-676",
    "sortYear": 676,
    "dateLabel": "676년",
    "stateOrEra": "신라",
    "eraFilter": "신라",
    "title": "기벌포 전투로 나당 전쟁이 마무리됨",
    "summary": "신라가 기벌포에서 당의 수군을 물리치며 나당 전쟁을 마무리했어요.",
    "life": "675년 매소성 전투와 676년 기벌포 전투를 연결하면 신라가 삼국 통일을 완성한 과정을 더 구체적으로 이해할 수 있어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚓",
      "alt": "기벌포 전투로 나당 전쟁이 마무리됨"
    },
    "sourceIssueNumbers": [
      8
    ],
    "textbookPages": [
      "별별한국사 기본 · 04-1 통일 신라 전기 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic",
    "sortOrder": 3
  },
  {
    "id": "supplement-flow-balhae-seon-king-818",
    "sortYear": 818,
    "dateLabel": "818년",
    "stateOrEra": "발해",
    "eraFilter": "발해",
    "title": "선왕 때 발해가 해동성국으로 성장함",
    "summary": "발해는 선왕 때 넓은 영토를 차지하고 국력이 강해졌어요.",
    "life": "당나라에서는 발전한 발해를 '해동성국'이라고 불렀어요. 발해는 5경 15부 62주의 지방 제도를 운영했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "선왕 때 발해가 해동성국으로 성장함"
    },
    "sourceIssueNumbers": [
      9
    ],
    "textbookPages": [
      "별별한국사 기본 · 04-3 발해 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-goryeo-hunyo-943",
    "sortYear": 943,
    "dateLabel": "943년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "태조 왕건이 훈요 10조를 남김",
    "summary": "태조 왕건은 후대 왕들이 나라를 다스릴 때 참고하도록 훈요 10조를 남겼다고 전해져요.",
    "life": "훈요 10조에는 불교 중시, 서경의 중요성 등 고려 왕실이 중요하게 여긴 통치 원칙이 담겨 있어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "태조 왕건이 훈요 10조를 남김"
    },
    "sourceIssueNumbers": [
      10,
      11
    ],
    "textbookPages": [
      "별별한국사 기본 · 08-1 초기 정치 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-goryeo-mongol-1231",
    "sortYear": 1231,
    "dateLabel": "1231년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "몽골의 첫 고려 침입이 시작됨",
    "summary": "몽골군이 고려에 침입하면서 오랜 대몽 항쟁이 시작되었어요.",
    "life": "몽골의 침입은 수도 이전과 강화도 항전, 삼별초의 항쟁으로 이어졌어요. 사건들을 하나의 흐름으로 이해해요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "몽골의 첫 고려 침입이 시작됨"
    },
    "sourceIssueNumbers": [
      13
    ],
    "textbookPages": [
      "별별한국사 기본 · 09-2 몽골의 침입과 고려의 멸망 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-goryeo-ganghwa-capital-1232",
    "sortYear": 1232,
    "dateLabel": "1232년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "고려가 강화도로 도읍을 옮김",
    "summary": "고려 조정은 몽골군에 맞서기 위해 수도를 개경에서 강화도로 옮겼어요.",
    "life": "바다로 둘러싸인 강화도는 몽골 기병의 접근을 어렵게 했어요. 백성들은 전쟁으로 큰 어려움을 겪었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏝️",
      "alt": "고려가 강화도로 도읍을 옮김"
    },
    "sourceIssueNumbers": [
      13
    ],
    "textbookPages": [
      "별별한국사 기본 · 09-2 몽골의 침입과 고려의 멸망 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-goryeo-tripitaka-1236",
    "sortYear": 1236,
    "dateLabel": "1236년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "재조대장경 판각을 시작함",
    "summary": "고려는 몽골의 침입을 겪으며 불경을 새긴 재조대장경의 판각을 시작했어요.",
    "life": "현재 해인사에 보관된 대장경판은 고려의 불교 신앙과 목판 인쇄 기술을 보여 주는 유산이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📚",
      "alt": "재조대장경 판각을 시작함"
    },
    "sourceIssueNumbers": [
      13
    ],
    "textbookPages": [
      "별별한국사 기본 · 11-2 불교와 풍수지리설 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-goryeo-sambyeolcho-1270",
    "sortYear": 1270,
    "dateLabel": "1270년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "삼별초가 대몽 항쟁을 이어 감",
    "summary": "삼별초는 고려 조정이 개경으로 돌아간 뒤에도 몽골에 맞서 싸웠어요.",
    "life": "삼별초는 강화도에서 진도로, 다시 제주도로 옮겨 가며 저항했어요. 1273년에 항쟁이 끝났어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "삼별초가 대몽 항쟁을 이어 감"
    },
    "sourceIssueNumbers": [
      13
    ],
    "textbookPages": [
      "별별한국사 기본 · 09-2 몽골의 침입과 고려의 멸망 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-goryeo-jikji-1377",
    "sortYear": 1377,
    "dateLabel": "1377년",
    "stateOrEra": "고려",
    "eraFilter": "고려",
    "title": "금속 활자로 『직지』를 인쇄함",
    "summary": "청주 흥덕사에서 금속 활자를 이용해 『직지』를 인쇄했어요.",
    "life": "『직지』는 현재 남아 있는 세계에서 가장 오래된 금속 활자 인쇄본으로 알려져 있어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📖",
      "alt": "금속 활자로 『직지』를 인쇄함"
    },
    "sourceIssueNumbers": [
      13
    ],
    "textbookPages": [
      "별별한국사 기본 · 11-1 유학의 발달과 역사서의 편찬 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-joseon-hangeul-published-1446",
    "sortYear": 1446,
    "dateLabel": "1446년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "훈민정음을 반포함",
    "summary": "세종은 1443년에 창제한 훈민정음을 1446년에 세상에 널리 알렸어요.",
    "life": "'훈민정음 창제'와 '훈민정음 반포'는 서로 다른 시점이에요. 백성이 쉽게 글을 쓰도록 하려는 목적이 있었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🔤",
      "alt": "훈민정음을 반포함"
    },
    "sourceIssueNumbers": [
      15
    ],
    "textbookPages": [
      "별별한국사 기본 · 13-1 조선의 건국과 체제 정비 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-joseon-gyeonggukdaejeon-1485",
    "sortYear": 1485,
    "dateLabel": "1485년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "『경국대전』이 완성되어 시행됨",
    "summary": "성종 때 조선의 기본 법전인 『경국대전』이 완성되어 시행되었어요.",
    "life": "세조 때부터 편찬하던 법전이 성종 때 완성되면서 조선의 통치 제도가 체계적으로 정리되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📗",
      "alt": "『경국대전』이 완성되어 시행됨"
    },
    "sourceIssueNumbers": [
      16
    ],
    "textbookPages": [
      "별별한국사 기본 · 13-1 조선의 건국과 체제 정비 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-joseon-samjeondo-1637",
    "sortYear": 1637,
    "dateLabel": "1637년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "인조가 청에 항복함",
    "summary": "병자호란 중 남한산성에서 버티던 인조가 1637년 청에 항복했어요.",
    "life": "이후 조선은 청과 군신 관계를 맺었어요. 병자호란의 시작(1636년)과 전쟁의 끝(1637년)을 나누어 살펴봐요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "인조가 청에 항복함"
    },
    "sourceIssueNumbers": [
      17,
      18
    ],
    "textbookPages": [
      "별별한국사 기본 · 14-1 붕당 정치와 전란 이후의 정치 변화 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-joseon-sinhaetonggong-1791",
    "sortYear": 1791,
    "dateLabel": "1791년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "정조가 신해통공을 실시함",
    "summary": "정조 때 신해통공을 실시하여 일부 시전 상인의 금난전권을 없앴어요.",
    "life": "상업 활동에 대한 독점적 제한을 줄이려는 조치였어요. 육의전의 금난전권은 유지되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚖️",
      "alt": "정조가 신해통공을 실시함"
    },
    "sourceIssueNumbers": [
      19
    ],
    "textbookPages": [
      "별별한국사 기본 · 15-1 토지 제도와 세금 제도의 변화 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-joseon-study-missions-1881",
    "sortYear": 1881,
    "dateLabel": "1881년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "조사 시찰단과 영선사를 파견함",
    "summary": "조선은 일본에 조사 시찰단을, 청에 영선사를 보내 새로운 제도와 기술을 살펴보았어요.",
    "life": "개항 뒤 조선 정부가 근대적인 제도와 기술을 배우려 했던 움직임이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🚢",
      "alt": "조사 시찰단과 영선사를 파견함"
    },
    "sourceIssueNumbers": [
      20
    ],
    "textbookPages": [
      "별별한국사 기본 · 19-1 흥선 대원군의 대내 정책 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-joseon-gabo-reform-1894",
    "sortYear": 1894,
    "dateLabel": "1894년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "갑오개혁이 추진됨",
    "summary": "조선은 군국기무처 등을 중심으로 여러 제도를 바꾸는 갑오개혁을 추진했어요.",
    "life": "신분제 폐지와 과거제 폐지 등 사회와 정치의 변화를 담은 개혁이었지만 외세의 간섭 속에서 추진되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "갑오개혁이 추진됨"
    },
    "sourceIssueNumbers": [
      20
    ],
    "textbookPages": [
      "별별한국사 기본 · 20-2 임오군란과 갑신정변 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-joseon-eulmi-incident-1895",
    "sortYear": 1895,
    "dateLabel": "1895년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "을미사변이 일어남",
    "summary": "일본 세력이 경복궁에 침입해 명성황후를 살해한 을미사변이 일어났어요.",
    "life": "일본의 침략과 간섭에 반발하는 움직임이 커졌고 을미의병이 일어나는 배경이 되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏛️",
      "alt": "을미사변이 일어남"
    },
    "sourceIssueNumbers": [
      20
    ],
    "textbookPages": [
      "별별한국사 기본 · 21-3 독립 협회와 대한 제국 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-joseon-agwanpacheon-1896",
    "sortYear": 1896,
    "dateLabel": "1896년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "고종이 러시아 공사관으로 거처를 옮김",
    "summary": "고종은 일본의 압박 속에서 러시아 공사관으로 거처를 옮겼어요.",
    "life": "이를 아관파천이라고 해요. 이후 열강의 영향력이 커지는 가운데 나라의 자주성을 지키려는 노력이 이어졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏛️",
      "alt": "고종이 러시아 공사관으로 거처를 옮김"
    },
    "sourceIssueNumbers": [
      20
    ],
    "textbookPages": [
      "별별한국사 기본 · 21-3 독립 협회와 대한 제국 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-joseon-manmin-meeting-1898",
    "sortYear": 1898,
    "dateLabel": "1898년",
    "stateOrEra": "대한제국",
    "eraFilter": "대한제국",
    "title": "독립협회가 만민공동회 등을 엶",
    "summary": "독립협회는 만민공동회 등을 열어 국민의 의견을 모으고 개혁을 주장했어요.",
    "life": "백성이 정치에 참여해 의견을 표현한 중요한 경험이었어요. 독립협회가 조직된 1896년과 활동이 활발했던 1898년을 구분해요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📣",
      "alt": "독립협회가 만민공동회 등을 엶"
    },
    "sourceIssueNumbers": [
      20
    ],
    "textbookPages": [
      "별별한국사 기본 · 21-3 독립 협회와 대한 제국 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-empire-national-debt-1907",
    "sortYear": 1907,
    "dateLabel": "1907년",
    "stateOrEra": "대한제국",
    "eraFilter": "대한제국",
    "title": "국채 보상 운동이 시작됨",
    "summary": "대구에서 시작된 국채 보상 운동은 일본에 진 빚을 국민의 힘으로 갚으려는 운동이었어요.",
    "life": "여러 지역으로 모금 활동이 퍼졌으며 여성들도 참여했어요. 경제적 자주권을 지키려는 움직임이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "💰",
      "alt": "국채 보상 운동이 시작됨"
    },
    "sourceIssueNumbers": [
      21
    ],
    "textbookPages": [
      "별별한국사 기본 · 22-3 경제적 구국 운동 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-colonial-bongodong-1920",
    "sortYear": 1920,
    "dateLabel": "1920년 6월",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "홍범도 등이 봉오동 전투에서 승리함",
    "summary": "홍범도 등이 이끄는 독립군 부대가 봉오동에서 일본군을 물리쳤어요.",
    "life": "같은 해 10월의 청산리 전투와 연결해 독립군의 무장 투쟁 흐름을 살펴봐요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "홍범도 등이 봉오동 전투에서 승리함"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "별별한국사 기본 · 26-3 국외 무장 독립 전쟁 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-colonial-heroic-corps-1931",
    "sortYear": 1931,
    "dateLabel": "1931년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "김구가 한인애국단을 조직함",
    "summary": "대한민국 임시정부의 김구가 한인애국단을 조직해 독립운동을 전개했어요.",
    "life": "1932년 이봉창 의거와 윤봉길 의거는 한인애국단의 활동과 연결돼요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🤝",
      "alt": "김구가 한인애국단을 조직함"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "별별한국사 기본 · 27-2 1930년대 무장 독립 전쟁 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-colonial-hangul-society-1942",
    "sortYear": 1942,
    "dateLabel": "1942년",
    "stateOrEra": "일제강점기",
    "eraFilter": "일제강점기",
    "title": "조선어학회 사건이 일어남",
    "summary": "일제는 우리말과 글을 연구하던 조선어학회 관련 인물들을 탄압했어요.",
    "life": "우리말을 지키려는 문화 운동이 계속되었음을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📘",
      "alt": "조선어학회 사건이 일어남"
    },
    "sourceIssueNumbers": [
      22
    ],
    "textbookPages": [
      "별별한국사 기본 · 23-2 근대 학교, 국어, 역사, 종교 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-republic-may10-election-1948",
    "sortYear": 1948,
    "dateLabel": "1948년 5월 10일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "5·10 총선거가 실시됨",
    "summary": "남한에서 제헌 국회를 구성하기 위한 5·10 총선거가 실시되었어요.",
    "life": "광복 뒤 통일 정부를 세우려는 논의가 이어졌지만 남북의 갈등과 국제 정세 속에서 남한만의 선거가 실시되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🗳️",
      "alt": "5·10 총선거가 실시됨"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "별별한국사 기본 · 28-2 대한민국 정부 수립·6·25 전쟁 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic",
    "sortOrder": 1
  },
  {
    "id": "supplement-flow-republic-constitution-1948",
    "sortYear": 1948,
    "dateLabel": "1948년 7월 17일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "제헌 헌법이 공포됨",
    "summary": "제헌 국회가 만든 대한민국 헌법이 1948년 7월 17일 공포되었어요.",
    "life": "헌법 공포와 8월 15일 대한민국 정부 수립은 순서대로 이어지는 별개의 역사적 사건이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "제헌 헌법이 공포됨"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "별별한국사 기본 · 28-2 대한민국 정부 수립·6·25 전쟁 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic",
    "sortOrder": 3
  },
  {
    "id": "supplement-flow-republic-armistice-1953",
    "sortYear": 1953,
    "dateLabel": "1953년 7월 27일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "6·25 전쟁의 정전 협정이 체결됨",
    "summary": "1953년 7월 27일 정전 협정이 체결되면서 대규모 전투가 멈췄어요.",
    "life": "정전은 전쟁이 평화 조약으로 완전히 끝났다는 뜻은 아니에요. 휴전선과 군사분계선의 형성으로 분단 상황이 이어졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🕊️",
      "alt": "6·25 전쟁의 정전 협정이 체결됨"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "별별한국사 기본 · 28-2 대한민국 정부 수립·6·25 전쟁 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-republic-yusin-1972",
    "sortYear": 1972,
    "dateLabel": "1972년",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "유신 헌법이 공포됨",
    "summary": "1972년 유신 헌법이 공포되면서 대통령의 권한이 크게 강화되었어요.",
    "life": "민주주의와 국민의 기본권이 제한되었고, 이에 반대하는 민주화 운동이 이어졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "유신 헌법이 공포됨"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "별별한국사 기본 · 29-1 이승만 정부·박정희 정부 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-republic-buma-1979",
    "sortYear": 1979,
    "dateLabel": "1979년 10월",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "부마 민주 항쟁이 일어남",
    "summary": "부산과 마산에서 시민과 학생들이 유신 체제에 반대하는 시위를 벌였어요.",
    "life": "1980년 5·18 민주화 운동으로 이어지는 민주주의 발전의 흐름을 이해할 때 함께 살펴봐요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📣",
      "alt": "부마 민주 항쟁이 일어남"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "별별한국사 기본 · 29-1 이승만 정부·박정희 정부 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-republic-direct-election-1987",
    "sortYear": 1987,
    "dateLabel": "1987년 10월",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "대통령 직선제 개헌이 이루어짐",
    "summary": "6월 민주 항쟁 이후 대통령을 국민이 직접 뽑는 방향으로 헌법이 개정되었어요.",
    "life": "6월 민주 항쟁과 1987년 헌법 개정은 민주주의 발전의 중요한 흐름이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🗳️",
      "alt": "대통령 직선제 개헌이 이루어짐"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "별별한국사 기본 · 29-2 전두환 정부·김대중 정부 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  },
  {
    "id": "supplement-flow-republic-june15-2000",
    "sortYear": 2000,
    "dateLabel": "2000년 6월 15일",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "6·15 남북 공동 선언이 발표됨",
    "summary": "남북 정상회담 뒤 6·15 남북 공동 선언이 발표되었어요.",
    "life": "남북은 화해와 교류를 확대하고 평화적인 관계 개선을 위해 노력하기로 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🤝",
      "alt": "6·15 남북 공동 선언이 발표됨"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [
      "별별한국사 기본 · 30-2 통일을 위한 노력 (교사 내부 검증용)"
    ],
    "byeolbyeolLevel": "basic"
  }
] as const;
