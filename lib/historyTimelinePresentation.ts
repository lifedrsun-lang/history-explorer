/** 학생에게 구체적인 사료·유물이 아닐 때 자료 영역을 만들지 않는다. */
const PLACEHOLDER_MATERIALS = new Set([
  "역사 사료·연표 보충 자료",
  "본문 추가 대조 필요",
  "교재 본문 확인 필요",
  "교재 확인 필요",
  "역사 사료",
  "관련 기록",
  "추가 자료",
]);
export function shouldShowTimelineMaterial(value?: string): boolean {
  const text = (value ?? "").trim();
  return Boolean(text && !PLACEHOLDER_MATERIALS.has(text));
}
