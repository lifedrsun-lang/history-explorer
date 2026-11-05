import type { ByeolbyeolNote } from "./historyTimelineByeolbyeolTypes";
/** 심화-하 PDF 페이지 이미지 확인 후 교육용으로 재서술한 2차 검증 사항.
 * reference는 교사 내부 출처 메타데이터이며 학생용 API에서 제거한다. */
type VerifiedPhaseTwo = ByeolbyeolNote & { reference: {book:string;pdfPage:number} };
export const HISTORY_TIMELINE_PHASE_TWO_ADVANCED_NOTES: Readonly<Record<string,VerifiedPhaseTwo[]>> = {
  "joseon-farmer-uprising-1862": [
    {
      "level": "advanced",
      "heading": "농민 봉기와 정부의 제도 개혁 시도",
      "points": [
        "19세기에는 전정·군정·환곡의 폐단에 대한 불만이 여러 지역에서 농민 봉기로 나타났어요.",
        "정부는 삼정이정청을 설치해 삼정의 폐단을 바로잡으려 했지만, 이러한 조치만으로 농민의 불만이 근본적으로 해결되지는 못했어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 심화-하",
        "pdfPage": 51
      }
    }
  ],
  "joseon-donghak-1894": [
    {
      "level": "advanced",
      "heading": "동학 농민 운동의 전개를 단계별로",
      "points": [
        "동학 농민 운동을 고부 봉기에서 시작된 흐름, 전주 화약, 다시 일어난 농민군의 저항으로 구분해 살펴봐요.",
        "농민들이 요구한 사회 개혁과 당시 일본·청나라의 개입을 함께 살펴보면 이 운동의 성격을 이해할 수 있어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 심화-하",
        "pdfPage": 107
      }
    }
  ]
};
