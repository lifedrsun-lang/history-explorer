import type { HistoryReferenceGroup } from "./historyTimelineReferenceGroups";
/** 2차 참고문헌 지면 직접 대조: 기존 로빈 PDF121쪽/읽기책 PDF117,45쪽에 더해 로빈 PDF135, 읽기책 PDF127~128, 별별한국사 초등 PDF110,143쪽.
 * 업로드 교재의 역사 사실을 초등 교재 수준으로 재서술; 책 원문은 복제하지 않음. */
export type HistoryReferenceNote = { referenceGroup: Extract<HistoryReferenceGroup,"robin"|"reading"|"elementary">; heading:string; points:string[]; source:{book:string;pdfPage:number} };
const VERIFIED_REFERENCE_NOTES: Readonly<Record<string,readonly HistoryReferenceNote[]>> = {
  "goryeo-founded-918": [
    {
      "referenceGroup": "robin",
      "heading": "고려 태조의 사심관·기인 제도",
      "points": [
        "왕건은 지방 호족 세력을 중앙 정부와 연결하기 위해 사심관 제도와 기인 제도를 활용했어요.",
        "사심관 제도는 중앙의 관료에게 연고 지역을 관리하도록 책임을 지우고, 기인 제도는 지방 호족의 자제를 수도에 머무르게 해 지방 세력과의 관계를 관리하려는 제도였어요."
      ],
      "source": {
        "book": "한 권으로 끝내는 로빈의 한국사",
        "pdfPage": 121
      }
    }
  ],
  "goryeo-gongmin-1351": [
    {
      "referenceGroup": "reading",
      "heading": "고려 후기 권문세족과 신진 사대부",
      "points": [
        "원 간섭기에는 권문세족이 성장하며 고려 정치와 사회에 큰 영향력을 끼쳤어요.",
        "고려 말에는 성리학을 바탕으로 개혁을 주장하는 신진 사대부가 성장해 기존 지배 세력과 대립했어요."
      ],
      "source": {
        "book": "한국사 읽기책",
        "pdfPage": 117
      }
    }
  ],
  "baekje-geunchogo-king": [
    {
      "referenceGroup": "reading",
      "heading": "근초고왕 때 백제의 성장과 한강 유역",
      "points": [
        "근초고왕 무렵 백제는 한강 유역을 중심으로 성장하면서 마한 지역에 대한 영향력을 넓혔어요.",
        "백제는 바닷길을 통해 중국 및 왜와 교류하며 고대 동아시아 여러 나라와 관계를 맺었어요."
      ],
      "source": {
        "book": "한국사 읽기책",
        "pdfPage": 45
      }
    }
  ]
  "goryeo-ija-gyeom-revolt-1126": [
  {
    "referenceGroup": "robin",
    "heading": "문벌 귀족의 성장과 이자겸의 권력",
    "points": [
      "고려 중기 문벌 귀족은 관직과 토지, 왕실과의 혼인 관계를 통해 정치적 영향력을 키웠어요.",
      "이자겸 가문은 왕실과 혼인 관계를 맺으며 힘을 키웠고, 인종 때 왕권을 둘러싼 갈등이 이자겸의 난으로 이어졌어요."
    ],
    "source": {
      "book": "한 권으로 끝내는 로빈의 한국사",
      "pdfPage": 135
    }
  }
],
  "goryeo-yun-gwan-1107": [
  {
    "referenceGroup": "reading",
    "heading": "여진 세력의 성장과 윤관의 대응",
    "points": [
      "고려 중기 북쪽에서 여진 세력이 성장하면서 고려와 충돌했어요.",
      "고려는 윤관이 이끄는 군대를 보내 여진에 대응했고, 이 과정에서 동북쪽 지역을 둘러싼 갈등이 커졌어요."
    ],
    "source": {
      "book": "한국사 읽기책",
      "pdfPage": 128
    }
  }
],
  "goryeo-choe-chungheon-1196": [
  {
    "referenceGroup": "reading",
    "heading": "최씨 무신 정권의 통치 기구",
    "points": [
      "무신 정권 시기 최충헌과 그 뒤를 이은 집권자들은 왕과 별도로 큰 정치적 권력을 행사했어요.",
      "교정도감은 최씨 정권의 주요 정치 기구였고, 도방은 집권자의 경호와 권력 유지에 쓰였어요."
    ],
    "source": {
      "book": "한국사 읽기책",
      "pdfPage": 127
    }
  }
],
  "joseon-sejong-1418": [
  {
    "referenceGroup": "elementary",
    "heading": "앙부일구와 자격루를 비교해요",
    "points": [
      "앙부일구는 햇빛이 만드는 그림자의 위치로 시각을 읽는 해시계예요.",
      "자격루는 물의 흐름과 자동 장치를 이용해 정해진 시각을 알렸어요. 세종 때 과학 기술이 생활과 국가 운영에 어떻게 쓰였는지 함께 살펴봐요."
    ],
    "source": {
      "book": "별별 한국사 능력검정시험 초등",
      "pdfPage": 110
    }
  }
],
  "joseon-jeongjo-1776": [
  {
    "referenceGroup": "elementary",
    "heading": "조선 후기 서민 문화의 여러 모습",
    "points": [
      "조선 후기에는 판소리·탈춤·민화 등 여러 서민 문화가 발달했어요.",
      "풍속화에는 당시 사람들의 일상생활이 표현되어 있어요. 이러한 문화는 모두 정조 즉위 연도인 1776년에 처음 생겼다는 뜻이 아니라 조선 후기의 변화로 이해해야 해요."
    ],
    "source": {
      "book": "별별 한국사 능력검정시험 초등",
      "pdfPage": 143
    }
  }
],
};
export function getHistoryReferenceNotes(eventIds: Iterable<string>): Record<string,HistoryReferenceNote[]> {
  const result: Record<string,HistoryReferenceNote[]> = {};
  for(const id of eventIds){
    const notes=VERIFIED_REFERENCE_NOTES[id];
    if(notes?.length) result[id]=notes.map(n=>({referenceGroup:n.referenceGroup,heading:n.heading,points:[...n.points],source:{...n.source}}));
  }
  return result;
}
