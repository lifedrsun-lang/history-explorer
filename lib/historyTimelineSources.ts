export type HistoryTimelineSource = {
  id: string;
  title: string;
  category: "reference" | "basic" | "advanced";
  scope: string;
  pageCount: number | null;
  available: boolean;
  internalOnly: true;
};

// 업로드 파일을 직접 열어 표지와 PDF 페이지 수를 확인한 내부 자료 대장이다.
// 원본 파일 경로·다운로드 URL은 의도적으로 포함하지 않는다.
export const HISTORY_TIMELINE_SOURCES: readonly HistoryTimelineSource[] = [
  {
    id: "yongseonsaeng-1",
    title: "용선생 교과서 한국사 1",
    category: "reference",
    scope: "선사 시대부터 조선 전기까지",
    pageCount: 273,
    available: true,
    internalOnly: true,
  },
  {
    id: "yongseonsaeng-2",
    title: "용선생 교과서 한국사 2",
    category: "reference",
    scope: "조선 후기부터 현대까지",
    pageCount: 273,
    available: true,
    internalOnly: true,
  },
  {
    id: "byeolbyeol-basic",
    title: "별별 한국사 능력검정시험 기본(4·5·6급)",
    category: "basic",
    scope: "기본 개념 정리와 학습 내용",
    pageCount: null,
    available: false,
    internalOnly: true,
  },
  ...([
    ["advanced-1", "선사 시대~여러 나라의 성장", 10],
    ["advanced-2", "고대", 42],
    ["advanced-3", "고려", 38],
    ["advanced-4", "조선 전기", 28],
    ["advanced-5", "조선 후기", 30],
    ["advanced-6", "개항기", 34],
    ["advanced-7", "일제 강점기", 36],
    ["advanced-8", "현대", 29],
    ["advanced-appendix", "부록", 19],
  ] as const).map(([id, scope, pageCount]) => ({
    id,
    title: `별별한국사 시대별 기출문제 심화 - ${scope}`,
    category: "advanced" as const,
    scope,
    pageCount,
    available: true,
    internalOnly: true as const,
  })),
];
