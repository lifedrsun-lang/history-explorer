import { PlanInputError, validId } from "./semesterPlans";
export function validateAtcMail(input: Record<string, unknown>) {
  const id = validId(input.id);
  if (!Number.isInteger(input.revision) || Number(input.revision) < 1) throw new PlanInputError("계획서를 먼저 저장해 주세요.");
  const to = typeof input.to === "string" ? input.to.trim() : "";
  if (to.length > 254 || !/^[a-zA-Z0-9.!#$%&'*+/?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/.test(to)) throw new PlanInputError("담당자 이메일 주소 한 개를 정확히 입력해 주세요.");
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!subject || subject.length > 200 || /[\r\n\x00]/.test(subject)) throw new PlanInputError("메일 제목을 확인해 주세요.");
  if (!body || body.length > 10000 || body.includes("\x00")) throw new PlanInputError("메일 본문을 확인해 주세요.");
  return { id, revision: Number(input.revision), to, subject, body };
}
