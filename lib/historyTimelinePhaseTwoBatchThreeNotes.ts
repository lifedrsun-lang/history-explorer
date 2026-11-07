import type { ByeolbyeolNote } from "./historyTimelineByeolbyeolTypes";
/**
 * 2차 인물·제도·문화·사료 검증 (참고문헌 대조 3번째 보강 묶음).
 * 아래 4개 설명은 업로드된 원본 지면을 실제로 확인해 기존 사건에 재서술해 연결함.
 * - 심화-상 PDF 117쪽: 고려 중앙 정치 조직
 * - 심화-하 PDF 75~76쪽: 조선 후기 회화 / 화성 축성 장치
 * - 기본 PDF 181쪽: 흥선 대원군 집권기 신미양요와 척화비
 * reference는 교사용 출처 검증 정보이며 학생 API에는 포함하지 않음.
 * '조선 후기 회화'는 1776년 단일 사건이 아닌 시대 학습 설명임.
 */
type VerifiedNote = ByeolbyeolNote & { reference: { book: string; pdfPage: number } };
export const HISTORY_TIMELINE_PHASE_TWO_BATCH_THREE_NOTES: Readonly<Record<string, VerifiedNote[]>> =
{
  "goryeo-seongjong-981": [
    {
      "level": "advanced",
      "heading": "고려의 중앙 정치 제도: 2성 6부와 독자적 기구",
      "points": [
        "고려는 중앙에 중서문하성과 상서성을 중심으로 한 2성 6부 체계를 두어 국정을 운영했어요.",
        "도병마사는 국방·대외 문제를 논의했고, 식목도감은 법제와 격식을 다루는 회의 기구였어요. 고려의 정치 제도에는 중국 제도를 참고하면서도 독자적으로 운영한 부분이 있었어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 심화-상",
        "pdfPage": 117
      }
    }
  ],
  "joseon-jeongjo-1776": [
    {
      "level": "advanced",
      "heading": "조선 후기 회화: 진경산수화·풍속화·민화",
      "points": [
        "조선 후기에는 우리 산천을 그린 진경산수화, 사람들의 생활을 표현한 풍속화, 민간에서 즐긴 민화 등 회화 문화가 다양해졌어요.",
        "정선의 진경산수화와 김홍도·신윤복의 풍속화를 함께 살펴보면 당시 사람들이 바라본 자연과 생활 모습을 비교할 수 있어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 심화-하",
        "pdfPage": 75
      }
    },
    {
      "level": "advanced",
      "heading": "수원 화성 축성과 거중기",
      "points": [
        "정조는 수원 화성을 축성해 정치적 구상을 펼치고 왕권을 강화하려 했어요.",
        "화성 축성에는 무거운 돌을 들어 올리는 데 도움을 주는 거중기 등 기술과 장치가 활용되었어요. 화성은 조선 후기 과학기술과 건축을 함께 공부할 수 있는 문화유산이에요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 심화-하",
        "pdfPage": 76
      }
    }
  ],
  "joseon-sinmiyangyo-1871": [
    {
      "level": "basic",
      "heading": "신미양요 이후의 척화비와 통상 수교 거부",
      "points": [
        "신미양요는 1871년 미국 함대가 조선에 군사적으로 압박을 가하면서 일어난 사건이에요.",
        "흥선 대원군 집권기의 조선 정부는 서양 세력과의 통상을 거부하는 입장을 더욱 분명히 했고, 이를 알리는 척화비를 여러 곳에 세웠어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "pdfPage": 181
      }
    }
  ]
};
