/** 연표 보충 사건이 속하는 실제 참고문헌 분류.
 * '누락 검증'은 출처가 아닌 내부 작업 상태이므로 학생·교사 표시 분류에 두지 않는다.
 */
export type HistoryReferenceGroup = "yong" | "robin" | "reading";

export function getHistoryReferenceGroup(book: string): HistoryReferenceGroup | null {
  if (book.startsWith("용선생 교과서 한국사")) return "yong";
  if (book.includes("로빈의 한국사")) return "robin";
  if (book === "한국사 읽기책") return "reading";
  // 출처를 알 수 없는 사건이 잘못된 분류로 공개되는 일을 막는다.
  return null;
}
