import type { ByeolbyeolNote } from "./historyTimelineByeolbyeolTypes";

/** 누락 검증 1차: 임진왜란 뒤 비변사 확대를 기존 전쟁 카드에 연결.
 * 별도 연도 카드로 중복 생성하지 않고 배경 설명으로 제공한다.
 * 교재 근거: 별별한국사 시대별기출문제(심화) 조선 후기 PDF 7쪽;
 * 교차 검증: https://contents.history.go.kr/mobile/tg/view.do?levelId=tg_003_1120
 */
export const HISTORY_TIMELINE_AUDITED_NOTES: Readonly<Record<string, ByeolbyeolNote[]>> = {
  "joseon-imjinwar-1592": [
    {
      level: "advanced",
      heading: "임진왜란을 거치며 비변사의 권한이 커졌어요",
      points: [
        "비변사는 원래 국방 문제를 논의하던 기구였어요.",
        "1592년 임진왜란을 수습하는 과정에서 군사뿐 아니라 국정 전반의 중요한 일을 결정하는 역할이 커졌어요.",
        "조선 후기의 정치 운영을 이해할 때 의정부·6조와 비변사의 관계도 함께 살펴봐요."
      ]
    }
  ],
};
