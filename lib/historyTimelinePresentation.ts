/** 학생에게 구체적인 사료·유물이 아닐 때 자료 영역을 만들지 않는다. */
const PLACEHOLDER_MATERIALS = new Set([
  "역사 사료·연표 보충 자료",
  "본문 추가 대조 필요",
  "교재 본문 확인 필요",
  "교재 확인 필요",
  "역사 사료",
  "관련 기록",
  "추가 자료",
  // 02호 '여러 나라의 성장'에서 자료의 이름·종류를 특정하지 않은 표현.
  // 본문 사건·생활 풍습 설명은 남기되 유물·기록으로 오인할 항목은 숨긴다.
  "부여의 법과 풍습 기록",
  "서옥제에 관한 풍습 기록",
  "옥저의 생활 풍습 기록",
]);
export function shouldShowTimelineMaterial(value?: string): boolean {
  const text = (value ?? "").trim();
  return Boolean(text && !PLACEHOLDER_MATERIALS.has(text));
}
