import type { YongNote } from "./historyTimelineYongNotes";
/** 용선생 교과서 한국사 원본 PDF 직접 확인:
 * 1권 PDF 122쪽(인쇄 120쪽), 2권 PDF 42쪽(인쇄 40쪽).
 * 기존 사건에 붙이는 2차 추가 보강, 책 문장을 복제하지 않고 재서술함.
 */
export const YONG_PHASE_TWO_MORE_NOTES: Readonly<Record<string, YongNote[]>> = {
  "goryeo-khitan-first-993": [
    {
      "heading": "서희의 외교 담판은 왜 중요했을까요?",
      "points": [
        "거란의 첫 침입 당시 고려는 전쟁만이 아니라 외교를 통해 갈등을 풀려고도 했어요.",
        "서희는 고려가 고구려를 계승한 나라임을 강조하며 거란과 담판을 벌였고, 고려는 강동 6주를 확보했어요."
      ],
      "source": {
        "volume": 1,
        "printedPage": 120
      }
    }
  ],
  "joseon-jeongjo-1776": [
    {
      "heading": "조선 후기 서민들이 즐긴 탈춤과 판소리",
      "points": [
        "농업과 상업이 발전하면서 서민들의 문화 활동도 다양해졌어요.",
        "탈춤과 판소리는 양반 사회의 모순을 풍자하거나 서민들의 생활과 감정을 담아 표현하는 문화였어요."
      ],
      "source": {
        "volume": 2,
        "printedPage": 40
      }
    }
  ]
};
