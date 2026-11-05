import type { HistoryTimelineEvent } from "./historyTimeline";
import type { TimelineStudyNotesIndex } from "./historyTimelineStudyTypes";

/** 별꼼역사 16·17·18·19호 원본 PDF 4~5쪽 연표와 각 장(6~27쪽)을 대조해 작성.
 * 17·18호에 같은 연표가 반복될 때는 하나의 사건에 두 교재를 연결한다.
 * 원문을 복제하지 않은 초등 학습용 재서술이다.
 */
export const HISTORY_TIMELINE_JOSEON_LATE_EVENTS: HistoryTimelineEvent[] = [
  {
    "id": "joseon-munjong-1450",
    "sortYear": 1450,
    "dateLabel": "1450년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "문종이 왕위에 오름",
    "summary": "세종의 뒤를 이어 문종이 조선의 왕이 되었어요.",
    "life": "문종이 병으로 일찍 세상을 떠나면서 어린 단종이 왕위에 오르게 되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "문종이 왕위에 오름"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 6~8쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-danjong-1452",
    "sortYear": 1452,
    "dateLabel": "1452년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "단종이 왕위에 오름",
    "summary": "문종이 세상을 떠난 뒤 어린 단종이 왕위에 올랐어요.",
    "life": "왕의 나이가 어려 신하들과 왕족 사이에서 권력을 둘러싼 다툼이 벌어졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "단종이 왕위에 오름"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 6~13쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-sejo-1455",
    "sortYear": 1455,
    "dateLabel": "1455년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "세조가 왕위에 오름",
    "summary": "수양대군이 조카 단종의 왕위를 빼앗고 세조가 되었어요.",
    "life": "세조의 왕위 계승 과정은 왕권을 둘러싼 갈등을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "세조가 왕위에 오름"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 8~13쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-sayuksin-1456",
    "sortYear": 1456,
    "dateLabel": "1456년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "사육신이 처형됨",
    "summary": "단종을 다시 왕위에 올리려던 신하들이 붙잡혀 죽임을 당했어요.",
    "life": "성삼문 등 사육신의 이야기는 단종을 지키려 했던 사람들의 선택을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "사육신이 처형됨"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 10~13쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-seongjong-1469",
    "sortYear": 1469,
    "dateLabel": "1469년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "성종이 왕위에 오름",
    "summary": "성종이 조선의 왕위에 올라 유교 정치와 제도를 정비했어요.",
    "life": "성종 때 학문을 장려하고 관리들의 의견을 듣는 정치가 이루어졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "성종이 왕위에 오름"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 18~21쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-seongjong-sarim-1482",
    "sortYear": 1482,
    "dateLabel": "1482년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "성종이 젊은 선비들을 등용함",
    "summary": "성종은 학문을 익힌 젊은 선비들을 조정으로 불러들였어요.",
    "life": "사림 세력이 중앙 정치에 참여하는 흐름을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📚",
      "alt": "성종이 젊은 선비들을 등용함"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 18~21쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-yeonsangun-1494",
    "sortYear": 1494,
    "dateLabel": "1494년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "연산군이 왕위에 오름",
    "summary": "연산군이 조선의 왕위에 올랐어요.",
    "life": "연산군 때 신하들 사이의 다툼과 왕의 강압적인 정치가 문제가 되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "연산군이 왕위에 오름"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 22~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-muosahwa-1498",
    "sortYear": 1498,
    "dateLabel": "1498년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "무오사화가 일어남",
    "summary": "연산군 때 사림이 큰 피해를 입은 무오사화가 일어났어요.",
    "life": "정치 세력 사이의 갈등과 글에 대한 문제 제기가 화를 불렀어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚖️",
      "alt": "무오사화가 일어남"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 22~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-gapjasahwa-1504",
    "sortYear": 1504,
    "dateLabel": "1504년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "갑자사화가 일어남",
    "summary": "연산군 때 또 다른 사화가 일어나 많은 신하가 피해를 입었어요.",
    "life": "왕의 권력이 강해지면서 정치적 갈등이 더욱 심해졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚖️",
      "alt": "갑자사화가 일어남"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 22~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-jungjong-1506",
    "sortYear": 1506,
    "dateLabel": "1506년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "중종이 왕위에 오름",
    "summary": "연산군이 폐위되고 중종이 왕위에 올랐어요.",
    "life": "새 왕을 세운 뒤에도 조정에서는 개혁을 둘러싼 갈등이 이어졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "중종이 왕위에 오름"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 18~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-jo-gwangjo-1515",
    "sortYear": 1515,
    "dateLabel": "1515년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "조광조가 조정에 등용됨",
    "summary": "중종 때 조광조 등 사림이 개혁 정치를 추진했어요.",
    "life": "조광조는 바른 정치를 이루기 위해 관리 선발과 정치 제도를 바꾸려고 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📚",
      "alt": "조광조가 조정에 등용됨"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 18~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-gimyo-1519",
    "sortYear": 1519,
    "dateLabel": "1519년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "기묘사화가 일어남",
    "summary": "조광조와 개혁을 주장한 신하들이 화를 입은 사건이에요.",
    "life": "급격한 개혁을 둘러싼 반발과 권력 다툼 속에 조광조가 죽임을 당했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚖️",
      "alt": "기묘사화가 일어남"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 22~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-im-kkeokjeong-1559",
    "sortYear": 1559,
    "dateLabel": "1559년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "임꺽정의 난이 일어남",
    "summary": "임꺽정과 그 무리가 관청과 권세가에 맞서 활동했어요.",
    "life": "백성들의 어려움과 신분·재산의 불평등을 함께 생각해 볼 수 있어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "✊",
      "alt": "임꺽정의 난이 일어남"
    },
    "textbookPages": [
      "16호 4~5쪽 연표 · 24~27쪽 본문"
    ],
    "sourceIssueNumbers": [
      16
    ]
  },
  {
    "id": "joseon-imjinwar-1592",
    "sortYear": 1592,
    "dateLabel": "1592년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "임진왜란이 일어남",
    "summary": "일본군이 조선을 침략하면서 임진왜란이 시작되었어요.",
    "life": "조선 군대와 백성들이 나라를 지키기 위해 싸웠어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "임진왜란이 일어남"
    },
    "textbookPages": [
      "17호 4~5쪽 연표 · 6~11쪽 본문"
    ],
    "sourceIssueNumbers": [
      17
    ]
  },
  {
    "id": "joseon-hansando-1592",
    "sortYear": 1592,
    "dateLabel": "1592년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "이순신의 한산도 대첩",
    "summary": "이순신이 조선 수군을 이끌고 한산도 앞바다에서 일본 수군을 물리쳤어요.",
    "life": "바닷길을 지키는 승리는 일본군의 보급을 방해하는 데 중요했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🚢",
      "alt": "이순신의 한산도 대첩"
    },
    "textbookPages": [
      "17호 4~5쪽 연표 · 10~15쪽 본문"
    ],
    "sourceIssueNumbers": [
      17
    ]
  },
  {
    "id": "joseon-jinju-1592",
    "sortYear": 1592,
    "dateLabel": "1592년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "김시민의 진주 대첩",
    "summary": "김시민과 진주성의 군사·백성이 일본군의 공격을 막아 냈어요.",
    "life": "성을 지키기 위해 군사와 백성이 힘을 모은 전투였어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "김시민의 진주 대첩"
    },
    "textbookPages": [
      "17호 4~5쪽 연표 · 10~17쪽 본문"
    ],
    "sourceIssueNumbers": [
      17
    ]
  },
  {
    "id": "joseon-ming-aid-1592",
    "sortYear": 1592,
    "dateLabel": "1592년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "명나라 군대가 조선을 지원함",
    "summary": "명나라는 일본군에 맞서 싸우기 위해 조선에 원군을 보냈어요.",
    "life": "임진왜란은 조선과 일본뿐 아니라 명나라까지 관련된 전쟁이었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🤝",
      "alt": "명나라 군대가 조선을 지원함"
    },
    "textbookPages": [
      "17호 4~5쪽 연표 · 8~15쪽 본문"
    ],
    "sourceIssueNumbers": [
      17
    ]
  },
  {
    "id": "joseon-haengju-1593",
    "sortYear": 1593,
    "dateLabel": "1593년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "권율의 행주 대첩",
    "summary": "권율이 이끄는 조선 군사와 백성들이 행주산성에서 일본군을 물리쳤어요.",
    "life": "여러 사람이 함께 성을 지키면서 큰 승리를 거두었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🛡️",
      "alt": "권율의 행주 대첩"
    },
    "textbookPages": [
      "17호 4~5쪽 연표 · 20~23쪽 본문"
    ],
    "sourceIssueNumbers": [
      17
    ]
  },
  {
    "id": "joseon-peace-talks-1596",
    "sortYear": 1596,
    "dateLabel": "1596년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "명나라와 일본의 강화 교섭이 깨짐",
    "summary": "명나라와 일본 사이의 강화 교섭이 결렬되면서 전쟁이 다시 격화될 상황이 되었어요.",
    "life": "전쟁은 전투뿐 아니라 외교 협상의 결과에도 영향을 받았어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "명나라와 일본의 강화 교섭이 깨짐"
    },
    "textbookPages": [
      "17호 4~5쪽 연표 · 20~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      17
    ]
  },
  {
    "id": "joseon-jeongyu-1597",
    "sortYear": 1597,
    "dateLabel": "1597년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "정유재란이 일어남",
    "summary": "일본군이 다시 조선을 침략하면서 정유재란이 시작되었어요.",
    "life": "조선 수군과 육군, 의병들이 침략에 맞서 싸웠어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "정유재란이 일어남"
    },
    "textbookPages": [
      "17호 4~5쪽 연표 · 22~27쪽 본문"
    ],
    "sourceIssueNumbers": [
      17
    ]
  },
  {
    "id": "joseon-noryang-1598",
    "sortYear": 1598,
    "dateLabel": "1598년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "이순신의 노량 해전",
    "summary": "이순신이 노량 바다에서 일본 수군에 맞서 싸우다 전사했어요.",
    "life": "이 전투는 임진왜란이 끝나 가던 시기의 중요한 해전이었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🚢",
      "alt": "이순신의 노량 해전"
    },
    "textbookPages": [
      "17호 4~5쪽 연표 · 24~27쪽 본문"
    ],
    "sourceIssueNumbers": [
      17
    ]
  },
  {
    "id": "joseon-gwanghae-1608",
    "sortYear": 1608,
    "dateLabel": "1608년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "광해군이 왕위에 오름",
    "summary": "광해군이 조선의 왕위에 올랐어요.",
    "life": "임진왜란 뒤 무너진 나라를 수습하고 전쟁 피해를 복구하려고 노력했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "광해군이 왕위에 오름"
    },
    "textbookPages": [
      "18호 4~5쪽 연표 · 18호 6~11쪽 본문"
    ],
    "sourceIssueNumbers": [
      17,
      18
    ]
  },
  {
    "id": "joseon-injo-1623",
    "sortYear": 1623,
    "dateLabel": "1623년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "인조가 왕위에 오름",
    "summary": "광해군이 왕위에서 물러나고 인조가 왕이 되었어요.",
    "life": "인조반정 이후 조선의 외교 정책과 정치가 달라졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "인조가 왕위에 오름"
    },
    "textbookPages": [
      "18호 4~5쪽 연표 · 18호 10~13쪽 본문"
    ],
    "sourceIssueNumbers": [
      17,
      18
    ]
  },
  {
    "id": "joseon-jeongmyo-1627",
    "sortYear": 1627,
    "dateLabel": "1627년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "정묘호란이 일어남",
    "summary": "후금이 조선을 침략하면서 정묘호란이 일어났어요.",
    "life": "조선은 후금과의 갈등 속에서 전쟁을 겪었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "정묘호란이 일어남"
    },
    "textbookPages": [
      "18호 4~5쪽 연표 · 18호 12~15쪽 본문"
    ],
    "sourceIssueNumbers": [
      17,
      18
    ]
  },
  {
    "id": "joseon-weltevree-1628",
    "sortYear": 1628,
    "dateLabel": "1628년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "벨테브레가 제주도에 표류함",
    "summary": "네덜란드인 벨테브레가 조선에 표류해 들어왔어요.",
    "life": "조선에 머무르며 박연이라는 이름으로 알려졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⛵",
      "alt": "벨테브레가 제주도에 표류함"
    },
    "textbookPages": [
      "18호 4~5쪽 연표 · 17호 28~29쪽 본문"
    ],
    "sourceIssueNumbers": [
      17,
      18
    ]
  },
  {
    "id": "joseon-byeongja-1636",
    "sortYear": 1636,
    "dateLabel": "1636년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "병자호란이 일어남",
    "summary": "청나라가 조선을 침략해 병자호란이 일어났어요.",
    "life": "인조는 남한산성에서 버티다가 결국 항복했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚔️",
      "alt": "병자호란이 일어남"
    },
    "textbookPages": [
      "18호 4~5쪽 연표 · 18호 14~19쪽 본문"
    ],
    "sourceIssueNumbers": [
      17,
      18
    ]
  },
  {
    "id": "joseon-hyojong-1649",
    "sortYear": 1649,
    "dateLabel": "1649년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "효종이 왕위에 오름",
    "summary": "효종이 조선의 왕위에 올랐어요.",
    "life": "청나라에 대한 반감을 바탕으로 북벌을 준비했지만 실제 대규모 북벌 전쟁은 일어나지 않았어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "효종이 왕위에 오름"
    },
    "textbookPages": [
      "18호 4~5쪽 연표 · 18호 20~23쪽 본문"
    ],
    "sourceIssueNumbers": [
      17,
      18
    ]
  },
  {
    "id": "joseon-hamel-1653",
    "sortYear": 1653,
    "dateLabel": "1653년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "하멜이 제주도에 표류함",
    "summary": "네덜란드인 하멜이 제주도에 표류해 조선에 머무르게 되었어요.",
    "life": "하멜의 기록은 당시 조선의 생활 모습이 외국에 전해지는 계기가 되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⛵",
      "alt": "하멜이 제주도에 표류함"
    },
    "textbookPages": [
      "18호 4~5쪽 연표 · 18호 26~27쪽 본문"
    ],
    "sourceIssueNumbers": [
      17,
      18
    ]
  },
  {
    "id": "joseon-hyojong-death-1659",
    "sortYear": 1659,
    "dateLabel": "1659년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "효종이 세상을 떠남",
    "summary": "효종이 세상을 떠나며 북벌 계획은 실현되지 못했어요.",
    "life": "조선은 청나라와 관계를 맺으면서 외교와 방어를 이어 갔어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "효종이 세상을 떠남"
    },
    "textbookPages": [
      "18호 4~5쪽 연표 · 18호 20~23쪽 본문"
    ],
    "sourceIssueNumbers": [
      17,
      18
    ]
  },
  {
    "id": "joseon-sukjong-1674",
    "sortYear": 1674,
    "dateLabel": "1674년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "숙종이 왕위에 오름",
    "summary": "숙종이 왕이 되어 강한 왕권을 추구했어요.",
    "life": "붕당 사이의 대립과 정치 세력 교체가 잦아졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "숙종이 왕위에 오름"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 6~11쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-yeongjo-1724",
    "sortYear": 1724,
    "dateLabel": "1724년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "영조가 왕위에 오름",
    "summary": "영조가 왕위에 올라 붕당 싸움을 줄이려 했어요.",
    "life": "영조는 왕권을 강화하고 백성의 부담을 줄이는 정책을 추진했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "영조가 왕위에 오름"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 8~13쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-tangpyeong-1725",
    "sortYear": 1725,
    "dateLabel": "1725년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "영조가 탕평 정치를 추진함",
    "summary": "영조가 붕당을 가리지 않고 인재를 등용하는 탕평 정치를 추진했어요.",
    "life": "붕당 갈등을 줄여 나라를 안정시키려 했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⚖️",
      "alt": "영조가 탕평 정치를 추진함"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 8~13쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-gyunyeok-1750",
    "sortYear": 1750,
    "dateLabel": "1750년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "균역법을 시행함",
    "summary": "영조 때 군포 부담을 줄이기 위해 균역법을 시행했어요.",
    "life": "백성의 군역 부담을 줄이려는 제도였지만 해결되지 않은 문제도 있었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🌾",
      "alt": "균역법을 시행함"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 10~15쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-sado-1762",
    "sortYear": 1762,
    "dateLabel": "1762년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "사도세자가 죽음",
    "summary": "영조의 아들 사도세자가 뒤주에 갇혀 죽는 사건이 일어났어요.",
    "life": "왕실 내부의 갈등과 당시 정치 문제를 살펴볼 수 있어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "사도세자가 죽음"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 10~15쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-jeongjo-1776",
    "sortYear": 1776,
    "dateLabel": "1776년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "정조가 왕위에 오름",
    "summary": "정조가 왕위에 올라 왕권을 강화하고 다양한 개혁을 추진했어요.",
    "life": "규장각을 설치해 학문을 장려하고 인재를 길렀어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "정조가 왕위에 오름"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 18~23쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-bakjiwon-1780",
    "sortYear": 1780,
    "dateLabel": "1780년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "박지원이 『열하일기』를 씀",
    "summary": "박지원이 청나라 여행에서 보고 들은 내용을 『열하일기』로 남겼어요.",
    "life": "청나라의 발전된 문물과 기술을 살펴 조선의 변화를 생각했어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📚",
      "alt": "박지원이 『열하일기』를 씀"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 22~27쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-sado-tomb-1789",
    "sortYear": 1789,
    "dateLabel": "1789년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "정조가 사도세자의 무덤을 옮김",
    "summary": "정조가 아버지 사도세자의 묘를 수원으로 옮겼어요.",
    "life": "뒤이어 화성을 건설하는 배경이 되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "정조가 사도세자의 무덤을 옮김"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 18~23쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-hwaseong-1796",
    "sortYear": 1796,
    "dateLabel": "1796년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "수원 화성이 완공됨",
    "summary": "정조 때 수원 화성을 완공했어요.",
    "life": "성곽 건설 과정에서는 거중기 등 새로운 기술이 활용되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "🏯",
      "alt": "수원 화성이 완공됨"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 18~25쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-sunjo-1800",
    "sortYear": 1800,
    "dateLabel": "1800년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "순조가 왕위에 오름",
    "summary": "순조가 왕위에 오르면서 외척 가문의 힘이 커졌어요.",
    "life": "왕실과 혼인 관계를 맺은 집안이 정치를 좌우하는 세도 정치가 이어졌어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "👑",
      "alt": "순조가 왕위에 오름"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 12~17쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-jeongyakyong-exile-1801",
    "sortYear": 1801,
    "dateLabel": "1801년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "정약용이 강진으로 유배됨",
    "summary": "정약용이 천주교 관련 사건 등에 연루되어 전라도 강진으로 유배되었어요.",
    "life": "유배 생활 동안 백성을 위한 정치와 제도를 연구하고 여러 책을 썼어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📚",
      "alt": "정약용이 강진으로 유배됨"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 24~27쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-honggyeongrae-1811",
    "sortYear": 1811,
    "dateLabel": "1811년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "홍경래의 난이 일어남",
    "summary": "평안도 지역에서 홍경래가 이끄는 반란이 일어났어요.",
    "life": "지역 차별과 백성의 어려움, 세도 정치의 문제와 연결돼요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "✊",
      "alt": "홍경래의 난이 일어남"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 14~17쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-mokminsimseo-1818",
    "sortYear": 1818,
    "dateLabel": "1818년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "정약용이 『목민심서』를 완성함",
    "summary": "정약용이 백성을 위한 지방 관리의 자세를 다룬 『목민심서』를 완성했어요.",
    "life": "관리들이 백성을 어떻게 돌보아야 하는지 고민한 책이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "정약용이 『목민심서』를 완성함"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 24~27쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-catholic-diocese-1831",
    "sortYear": 1831,
    "dateLabel": "1831년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "조선 천주교 교구가 설정됨",
    "summary": "교황청이 조선 대목구를 설정했어요.",
    "life": "조선에 천주교 신앙이 퍼져 가는 과정과 관련된 사건이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⛪",
      "alt": "조선 천주교 교구가 설정됨"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 12~17쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-jeongyakyong-death-1836",
    "sortYear": 1836,
    "dateLabel": "1836년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "정약용이 세상을 떠남",
    "summary": "정약용이 세상을 떠났어요.",
    "life": "정약용이 남긴 책들은 조선 후기 실학과 개혁 사상을 이해하는 데 중요해요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📚",
      "alt": "정약용이 세상을 떠남"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 24~27쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-kimdaegeon-1846",
    "sortYear": 1846,
    "dateLabel": "1846년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "김대건 신부가 체포되어 순교함",
    "summary": "조선 최초의 한국인 천주교 사제 김대건이 체포되어 처형되었어요.",
    "life": "당시 천주교 신자들이 겪은 박해를 보여 주는 사건이에요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "⛪",
      "alt": "김대건 신부가 체포되어 순교함"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 12~17쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-farmer-uprising-1862",
    "sortYear": 1862,
    "dateLabel": "1862년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "전국에서 농민 봉기가 일어남",
    "summary": "세금 수탈과 관리의 부정에 맞서 여러 지역에서 농민 봉기가 일어났어요.",
    "life": "진주 농민 봉기 등은 세도 정치 아래 백성들이 겪던 어려움을 보여 줘요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "✊",
      "alt": "전국에서 농민 봉기가 일어남"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 14~17쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  },
  {
    "id": "joseon-choejeu-death-1864",
    "sortYear": 1864,
    "dateLabel": "1864년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "최제우가 처형됨",
    "summary": "동학을 만든 최제우가 관헌에 붙잡혀 처형되었어요.",
    "life": "동학은 백성들이 평등과 새로운 세상을 바라는 움직임과 연결되었어요.",
    "artifact": "자료명 미등록",
    "image": {
      "kind": "emoji",
      "value": "📜",
      "alt": "최제우가 처형됨"
    },
    "textbookPages": [
      "19호 4~5쪽 연표 · 24~27쪽 본문"
    ],
    "sourceIssueNumbers": [
      19
    ]
  }
];

export const HISTORY_STUDY_JOSEON_LATE: TimelineStudyNotesIndex = {
  "joseon-munjong-1450": [
    [
      16,
      "문종이 왕위에 오름",
      "세종의 뒤를 이어 문종이 조선의 왕이 되었어요.",
      "문종이 병으로 일찍 세상을 떠나면서 어린 단종이 왕위에 오르게 되었어요."
    ]
  ],
  "joseon-danjong-1452": [
    [
      16,
      "단종이 왕위에 오름",
      "문종이 세상을 떠난 뒤 어린 단종이 왕위에 올랐어요.",
      "왕의 나이가 어려 신하들과 왕족 사이에서 권력을 둘러싼 다툼이 벌어졌어요."
    ]
  ],
  "joseon-sejo-1455": [
    [
      16,
      "세조가 왕위에 오름",
      "수양대군이 조카 단종의 왕위를 빼앗고 세조가 되었어요.",
      "세조의 왕위 계승 과정은 왕권을 둘러싼 갈등을 보여 줘요."
    ]
  ],
  "joseon-sayuksin-1456": [
    [
      16,
      "사육신이 처형됨",
      "단종을 다시 왕위에 올리려던 신하들이 붙잡혀 죽임을 당했어요.",
      "성삼문 등 사육신의 이야기는 단종을 지키려 했던 사람들의 선택을 보여 줘요."
    ]
  ],
  "joseon-seongjong-1469": [
    [
      16,
      "성종이 왕위에 오름",
      "성종이 조선의 왕위에 올라 유교 정치와 제도를 정비했어요.",
      "성종 때 학문을 장려하고 관리들의 의견을 듣는 정치가 이루어졌어요."
    ]
  ],
  "joseon-seongjong-sarim-1482": [
    [
      16,
      "성종이 젊은 선비들을 등용함",
      "성종은 학문을 익힌 젊은 선비들을 조정으로 불러들였어요.",
      "사림 세력이 중앙 정치에 참여하는 흐름을 보여 줘요."
    ]
  ],
  "joseon-yeonsangun-1494": [
    [
      16,
      "연산군이 왕위에 오름",
      "연산군이 조선의 왕위에 올랐어요.",
      "연산군 때 신하들 사이의 다툼과 왕의 강압적인 정치가 문제가 되었어요."
    ]
  ],
  "joseon-muosahwa-1498": [
    [
      16,
      "무오사화가 일어남",
      "연산군 때 사림이 큰 피해를 입은 무오사화가 일어났어요.",
      "정치 세력 사이의 갈등과 글에 대한 문제 제기가 화를 불렀어요."
    ]
  ],
  "joseon-gapjasahwa-1504": [
    [
      16,
      "갑자사화가 일어남",
      "연산군 때 또 다른 사화가 일어나 많은 신하가 피해를 입었어요.",
      "왕의 권력이 강해지면서 정치적 갈등이 더욱 심해졌어요."
    ]
  ],
  "joseon-jungjong-1506": [
    [
      16,
      "중종이 왕위에 오름",
      "연산군이 폐위되고 중종이 왕위에 올랐어요.",
      "새 왕을 세운 뒤에도 조정에서는 개혁을 둘러싼 갈등이 이어졌어요."
    ]
  ],
  "joseon-jo-gwangjo-1515": [
    [
      16,
      "조광조가 조정에 등용됨",
      "중종 때 조광조 등 사림이 개혁 정치를 추진했어요.",
      "조광조는 바른 정치를 이루기 위해 관리 선발과 정치 제도를 바꾸려고 했어요."
    ]
  ],
  "joseon-gimyo-1519": [
    [
      16,
      "기묘사화가 일어남",
      "조광조와 개혁을 주장한 신하들이 화를 입은 사건이에요.",
      "급격한 개혁을 둘러싼 반발과 권력 다툼 속에 조광조가 죽임을 당했어요."
    ]
  ],
  "joseon-im-kkeokjeong-1559": [
    [
      16,
      "임꺽정의 난이 일어남",
      "임꺽정과 그 무리가 관청과 권세가에 맞서 활동했어요.",
      "백성들의 어려움과 신분·재산의 불평등을 함께 생각해 볼 수 있어요."
    ]
  ],
  "joseon-imjinwar-1592": [
    [
      17,
      "임진왜란이 일어남",
      "일본군이 조선을 침략하면서 임진왜란이 시작되었어요.",
      "조선 군대와 백성들이 나라를 지키기 위해 싸웠어요."
    ]
  ],
  "joseon-hansando-1592": [
    [
      17,
      "이순신의 한산도 대첩",
      "이순신이 조선 수군을 이끌고 한산도 앞바다에서 일본 수군을 물리쳤어요.",
      "바닷길을 지키는 승리는 일본군의 보급을 방해하는 데 중요했어요."
    ]
  ],
  "joseon-jinju-1592": [
    [
      17,
      "김시민의 진주 대첩",
      "김시민과 진주성의 군사·백성이 일본군의 공격을 막아 냈어요.",
      "성을 지키기 위해 군사와 백성이 힘을 모은 전투였어요."
    ]
  ],
  "joseon-ming-aid-1592": [
    [
      17,
      "명나라 군대가 조선을 지원함",
      "명나라는 일본군에 맞서 싸우기 위해 조선에 원군을 보냈어요.",
      "임진왜란은 조선과 일본뿐 아니라 명나라까지 관련된 전쟁이었어요."
    ]
  ],
  "joseon-haengju-1593": [
    [
      17,
      "권율의 행주 대첩",
      "권율이 이끄는 조선 군사와 백성들이 행주산성에서 일본군을 물리쳤어요.",
      "여러 사람이 함께 성을 지키면서 큰 승리를 거두었어요."
    ]
  ],
  "joseon-peace-talks-1596": [
    [
      17,
      "명나라와 일본의 강화 교섭이 깨짐",
      "명나라와 일본 사이의 강화 교섭이 결렬되면서 전쟁이 다시 격화될 상황이 되었어요.",
      "전쟁은 전투뿐 아니라 외교 협상의 결과에도 영향을 받았어요."
    ]
  ],
  "joseon-jeongyu-1597": [
    [
      17,
      "정유재란이 일어남",
      "일본군이 다시 조선을 침략하면서 정유재란이 시작되었어요.",
      "조선 수군과 육군, 의병들이 침략에 맞서 싸웠어요."
    ]
  ],
  "joseon-noryang-1598": [
    [
      17,
      "이순신의 노량 해전",
      "이순신이 노량 바다에서 일본 수군에 맞서 싸우다 전사했어요.",
      "이 전투는 임진왜란이 끝나 가던 시기의 중요한 해전이었어요."
    ]
  ],
  "joseon-gwanghae-1608": [
    [
      17,
      "광해군이 왕위에 오름",
      "광해군이 조선의 왕위에 올랐어요.",
      "임진왜란 뒤 무너진 나라를 수습하고 전쟁 피해를 복구하려고 노력했어요."
    ],
    [
      18,
      "광해군이 왕위에 오름",
      "광해군이 조선의 왕위에 올랐어요.",
      "임진왜란 뒤 무너진 나라를 수습하고 전쟁 피해를 복구하려고 노력했어요."
    ]
  ],
  "joseon-injo-1623": [
    [
      17,
      "인조가 왕위에 오름",
      "광해군이 왕위에서 물러나고 인조가 왕이 되었어요.",
      "인조반정 이후 조선의 외교 정책과 정치가 달라졌어요."
    ],
    [
      18,
      "인조가 왕위에 오름",
      "광해군이 왕위에서 물러나고 인조가 왕이 되었어요.",
      "인조반정 이후 조선의 외교 정책과 정치가 달라졌어요."
    ]
  ],
  "joseon-jeongmyo-1627": [
    [
      17,
      "정묘호란이 일어남",
      "후금이 조선을 침략하면서 정묘호란이 일어났어요.",
      "조선은 후금과의 갈등 속에서 전쟁을 겪었어요."
    ],
    [
      18,
      "정묘호란이 일어남",
      "후금이 조선을 침략하면서 정묘호란이 일어났어요.",
      "조선은 후금과의 갈등 속에서 전쟁을 겪었어요."
    ]
  ],
  "joseon-weltevree-1628": [
    [
      17,
      "벨테브레가 제주도에 표류함",
      "네덜란드인 벨테브레가 조선에 표류해 들어왔어요.",
      "조선에 머무르며 박연이라는 이름으로 알려졌어요."
    ],
    [
      18,
      "벨테브레가 제주도에 표류함",
      "네덜란드인 벨테브레가 조선에 표류해 들어왔어요.",
      "조선에 머무르며 박연이라는 이름으로 알려졌어요."
    ]
  ],
  "joseon-byeongja-1636": [
    [
      17,
      "병자호란이 일어남",
      "청나라가 조선을 침략해 병자호란이 일어났어요.",
      "인조는 남한산성에서 버티다가 결국 항복했어요."
    ],
    [
      18,
      "병자호란이 일어남",
      "청나라가 조선을 침략해 병자호란이 일어났어요.",
      "인조는 남한산성에서 버티다가 결국 항복했어요."
    ]
  ],
  "joseon-hyojong-1649": [
    [
      17,
      "효종이 왕위에 오름",
      "효종이 조선의 왕위에 올랐어요.",
      "청나라에 대한 반감을 바탕으로 북벌을 준비했지만 실제 대규모 북벌 전쟁은 일어나지 않았어요."
    ],
    [
      18,
      "효종이 왕위에 오름",
      "효종이 조선의 왕위에 올랐어요.",
      "청나라에 대한 반감을 바탕으로 북벌을 준비했지만 실제 대규모 북벌 전쟁은 일어나지 않았어요."
    ]
  ],
  "joseon-hamel-1653": [
    [
      17,
      "하멜이 제주도에 표류함",
      "네덜란드인 하멜이 제주도에 표류해 조선에 머무르게 되었어요.",
      "하멜의 기록은 당시 조선의 생활 모습이 외국에 전해지는 계기가 되었어요."
    ],
    [
      18,
      "하멜이 제주도에 표류함",
      "네덜란드인 하멜이 제주도에 표류해 조선에 머무르게 되었어요.",
      "하멜의 기록은 당시 조선의 생활 모습이 외국에 전해지는 계기가 되었어요."
    ]
  ],
  "joseon-hyojong-death-1659": [
    [
      17,
      "효종이 세상을 떠남",
      "효종이 세상을 떠나며 북벌 계획은 실현되지 못했어요.",
      "조선은 청나라와 관계를 맺으면서 외교와 방어를 이어 갔어요."
    ],
    [
      18,
      "효종이 세상을 떠남",
      "효종이 세상을 떠나며 북벌 계획은 실현되지 못했어요.",
      "조선은 청나라와 관계를 맺으면서 외교와 방어를 이어 갔어요."
    ]
  ],
  "joseon-sukjong-1674": [
    [
      19,
      "숙종이 왕위에 오름",
      "숙종이 왕이 되어 강한 왕권을 추구했어요.",
      "붕당 사이의 대립과 정치 세력 교체가 잦아졌어요."
    ]
  ],
  "joseon-yeongjo-1724": [
    [
      19,
      "영조가 왕위에 오름",
      "영조가 왕위에 올라 붕당 싸움을 줄이려 했어요.",
      "영조는 왕권을 강화하고 백성의 부담을 줄이는 정책을 추진했어요."
    ]
  ],
  "joseon-tangpyeong-1725": [
    [
      19,
      "영조가 탕평 정치를 추진함",
      "영조가 붕당을 가리지 않고 인재를 등용하는 탕평 정치를 추진했어요.",
      "붕당 갈등을 줄여 나라를 안정시키려 했어요."
    ]
  ],
  "joseon-gyunyeok-1750": [
    [
      19,
      "균역법을 시행함",
      "영조 때 군포 부담을 줄이기 위해 균역법을 시행했어요.",
      "백성의 군역 부담을 줄이려는 제도였지만 해결되지 않은 문제도 있었어요."
    ]
  ],
  "joseon-sado-1762": [
    [
      19,
      "사도세자가 죽음",
      "영조의 아들 사도세자가 뒤주에 갇혀 죽는 사건이 일어났어요.",
      "왕실 내부의 갈등과 당시 정치 문제를 살펴볼 수 있어요."
    ]
  ],
  "joseon-jeongjo-1776": [
    [
      19,
      "정조가 왕위에 오름",
      "정조가 왕위에 올라 왕권을 강화하고 다양한 개혁을 추진했어요.",
      "규장각을 설치해 학문을 장려하고 인재를 길렀어요."
    ]
  ],
  "joseon-bakjiwon-1780": [
    [
      19,
      "박지원이 『열하일기』를 씀",
      "박지원이 청나라 여행에서 보고 들은 내용을 『열하일기』로 남겼어요.",
      "청나라의 발전된 문물과 기술을 살펴 조선의 변화를 생각했어요."
    ]
  ],
  "joseon-sado-tomb-1789": [
    [
      19,
      "정조가 사도세자의 무덤을 옮김",
      "정조가 아버지 사도세자의 묘를 수원으로 옮겼어요.",
      "뒤이어 화성을 건설하는 배경이 되었어요."
    ]
  ],
  "joseon-hwaseong-1796": [
    [
      19,
      "수원 화성이 완공됨",
      "정조 때 수원 화성을 완공했어요.",
      "성곽 건설 과정에서는 거중기 등 새로운 기술이 활용되었어요."
    ]
  ],
  "joseon-sunjo-1800": [
    [
      19,
      "순조가 왕위에 오름",
      "순조가 왕위에 오르면서 외척 가문의 힘이 커졌어요.",
      "왕실과 혼인 관계를 맺은 집안이 정치를 좌우하는 세도 정치가 이어졌어요."
    ]
  ],
  "joseon-jeongyakyong-exile-1801": [
    [
      19,
      "정약용이 강진으로 유배됨",
      "정약용이 천주교 관련 사건 등에 연루되어 전라도 강진으로 유배되었어요.",
      "유배 생활 동안 백성을 위한 정치와 제도를 연구하고 여러 책을 썼어요."
    ]
  ],
  "joseon-honggyeongrae-1811": [
    [
      19,
      "홍경래의 난이 일어남",
      "평안도 지역에서 홍경래가 이끄는 반란이 일어났어요.",
      "지역 차별과 백성의 어려움, 세도 정치의 문제와 연결돼요."
    ]
  ],
  "joseon-mokminsimseo-1818": [
    [
      19,
      "정약용이 『목민심서』를 완성함",
      "정약용이 백성을 위한 지방 관리의 자세를 다룬 『목민심서』를 완성했어요.",
      "관리들이 백성을 어떻게 돌보아야 하는지 고민한 책이에요."
    ]
  ],
  "joseon-catholic-diocese-1831": [
    [
      19,
      "조선 천주교 교구가 설정됨",
      "교황청이 조선 대목구를 설정했어요.",
      "조선에 천주교 신앙이 퍼져 가는 과정과 관련된 사건이에요."
    ]
  ],
  "joseon-jeongyakyong-death-1836": [
    [
      19,
      "정약용이 세상을 떠남",
      "정약용이 세상을 떠났어요.",
      "정약용이 남긴 책들은 조선 후기 실학과 개혁 사상을 이해하는 데 중요해요."
    ]
  ],
  "joseon-kimdaegeon-1846": [
    [
      19,
      "김대건 신부가 체포되어 순교함",
      "조선 최초의 한국인 천주교 사제 김대건이 체포되어 처형되었어요.",
      "당시 천주교 신자들이 겪은 박해를 보여 주는 사건이에요."
    ]
  ],
  "joseon-farmer-uprising-1862": [
    [
      19,
      "전국에서 농민 봉기가 일어남",
      "세금 수탈과 관리의 부정에 맞서 여러 지역에서 농민 봉기가 일어났어요.",
      "진주 농민 봉기 등은 세도 정치 아래 백성들이 겪던 어려움을 보여 줘요."
    ]
  ],
  "joseon-choejeu-death-1864": [
    [
      19,
      "최제우가 처형됨",
      "동학을 만든 최제우가 관헌에 붙잡혀 처형되었어요.",
      "동학은 백성들이 평등과 새로운 세상을 바라는 움직임과 연결되었어요."
    ]
  ]
};
