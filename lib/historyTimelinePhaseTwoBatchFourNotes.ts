import type { ByeolbyeolNote } from "./historyTimelineByeolbyeolTypes";
/**
 * 2차 참고문헌 상세 검증 4번째 보강(2026-11-07).
 * 실제 업로드 교재 『별별 한국사 능력검정시험 기본』 PDF 페이지 103, 105, 153, 217을
 * 육안으로 확인하고 책의 표현을 복제하지 않도록 새로 서술한 교육용 설명.
 * reference는 교사 내부용 검증 근거이며 API에서 전달하지 않음.
 * 해당 사건 연도와 문화 현상의 지속 시기는 다를 수 있으므로 단일 연도로 오해하지 않게 설명함.
 */
type VerifiedNote = ByeolbyeolNote & {reference:{book:string;pdfPage:number}};
export const HISTORY_TIMELINE_PHASE_TWO_BATCH_FOUR_NOTES: Readonly<Record<string, VerifiedNote[]>> = {
  "goryeo-seongjong-981": [
    {
      "level": "basic",
      "heading": "고려의 유학 교육과 관학·사학",
      "points": [
        "고려에서는 관리 양성과 유학 교육을 위해 국자감 등의 교육 기관을 운영했어요.",
        "이후 최충의 문헌공도를 비롯한 사학 12도가 발달했어요. 국가가 운영한 관학과 개인이 운영한 사학을 구분해 살펴봐요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "pdfPage": 103
      }
    }
  ],
  "goryeo-uicheon-song-1085": [
    {
      "level": "basic",
      "heading": "의천의 천태종과 교관겸수",
      "points": [
        "의천은 고려 중기 불교계에서 교종과 선종의 조화를 추구하며 천태종을 개창했어요.",
        "교리를 배우는 일과 수행을 함께 중시하는 교관겸수는 의천의 불교 사상을 이해하는 핵심 표현이에요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "pdfPage": 105
      }
    }
  ],
  "goryeo-choe-chungheon-1196": [
    {
      "level": "basic",
      "heading": "무신 집권기 불교: 지눌의 수선사 결사",
      "points": [
        "고려 중후기 지눌은 수선사 결사를 통해 불교계의 수행과 개혁을 추구했어요.",
        "지눌이 강조한 정혜쌍수와 돈오점수의 뜻을 살펴보면 당시 선종의 변화를 이해하는 데 도움이 돼요. 이 설명은 1196년에 결사가 시작됐다는 뜻이 아니라 무신 집권기 문화의 배경이에요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "pdfPage": 105
      }
    }
  ],
  "joseon-honggyeongrae-1811": [
    {
      "level": "basic",
      "heading": "조선 후기 신분제의 동요",
      "points": [
        "조선 후기에는 납속책과 공명첩 등을 통해 양반 신분을 얻는 사람이 늘고, 양반의 수가 증가하면서 신분 질서가 흔들렸어요.",
        "노비의 수가 줄어드는 등 신분 구성에도 변화가 나타났어요. 이런 사회 변화는 세도 정치 시기의 불만과 함께 살펴볼 수 있어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "pdfPage": 153
      }
    }
  ],
  "colonial-bakeunshik-1920": [
    {
      "level": "basic",
      "heading": "일제강점기의 역사 연구와 민족의식",
      "points": [
        "일제강점기에는 우리 역사를 연구하고 기록하는 일도 민족의식을 지키는 방법이었어요.",
        "박은식은 『한국독립운동지혈사』 등을 통해 독립운동의 역사를 기록했고, 신채호도 우리 민족의 역사를 주체적으로 해석하려 했어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "pdfPage": 217
      }
    }
  ]
};
