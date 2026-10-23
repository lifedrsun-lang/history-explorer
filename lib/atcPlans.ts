import curriculum from "./helloMapleCurriculum.json";
import { newPlan, type SemesterPlan, type PlanWeek } from "./semesterPlans";

export const ATC_CURRICULUM = curriculum;
export function renumberAtcRows(rows: PlanWeek[]): PlanWeek[] {
  let lesson = 1;
  return rows.map((row, index) => {
    const next = { ...row, week_number: index + 1, lesson_number: lesson };
    lesson += row.duration || 1;
    return next;
  });
}
export const atcTotal = (rows: PlanWeek[]) => rows.reduce((sum, row) => sum + (row.duration || 1), 0);
export function composeAtcRows(ids: string[]): PlanWeek[] {
  if (new Set(ids).size !== ids.length) throw new Error("같은 커리큘럼을 두 번 선택할 수 없습니다.");
  const rows = ids.flatMap(id => {
    const selectedModule = curriculum.modules.find(item => item.id === id);
    if (!selectedModule) throw new Error("커리큘럼을 찾을 수 없습니다.");
    return selectedModule.blocks.map(block => ({
      id: crypto.randomUUID(), week_number: 1, lesson_number: 1, duration: block.duration,
      source_lesson_id: null, source_revision: null,
      topic: selectedModule.title, objective: "", activities: `${block.topic}\n${block.activities}`,
      materials: "", notes: selectedModule.warning.trim(),
    }));
  });
  return renumberAtcRows(rows);
}
export function newAtcPlan(school: { slug: string; schoolName: string }): SemesterPlan {
  return { ...newPlan(), format: "atc", school_slug: school.slug, school_name: school.schoolName,
    title: `${school.schoolName} 헬로메이플 수업계획서`, program: "헬로메이플",
    operation: "ATC School", notes: "블록코딩을 활용한 교과 연계 디지털 창작 활동" };
}
export function atcRange(row: PlanWeek) {
  const end = row.lesson_number + (row.duration || 1) - 1;
  return end === row.lesson_number ? String(end) : `${row.lesson_number}~${end}`;
}
const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export function atcPlanHtml(plan: SemesterPlan) {
  const rows = renumberAtcRows(plan.weeks);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(plan.title)}</title><style>
  *{box-sizing:border-box}body{font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;color:#111;margin:0;background:#eef2f6}.paper{max-width:210mm;margin:20px auto;background:white;padding:16mm}h1{text-align:center;font-size:22px;margin:0 0 22px}table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:18px;table-layout:fixed}td,th{border:1px solid #333;padding:9px;white-space:pre-wrap;overflow-wrap:anywhere;vertical-align:top}th{background:#f0f2f4}thead{display:table-header-group}tr{break-inside:avoid}p{font-size:11px}button{padding:10px 20px;margin:12px;border:0;border-radius:8px;background:#155e75;color:white;font-weight:bold}.toolbar{text-align:center}a{color:#155e75}@page{size:A4;margin:14mm}@media print{body{background:white}.paper{padding:0;margin:0;max-width:none}.toolbar{display:none}a{color:inherit;text-decoration:none}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">인쇄 / PDF 저장</button></div><main class="paper"><h1>${escape(plan.year)} ATC School 수업계획서</h1><table><colgroup><col style="width:20%"><col><col style="width:20%"><col></colgroup><tbody><tr><th>학교명</th><td>${escape(plan.school_name)}</td><th>담당 강사</th><td>${escape(plan.instructor)}</td></tr><tr><th>담당 학년</th><td>${escape(plan.target)}</td><th>수업명</th><td>${escape(plan.program)}</td></tr><tr><th>수업 주제</th><td colspan="3">${escape(plan.notes)}</td></tr><tr><th>수업 기간</th><td colspan="3">${escape(plan.period_start || "미정")} ~ ${escape(plan.period_end || "미정")} · 총 ${atcTotal(rows)}차시</td></tr></tbody></table><table><colgroup><col style="width:12%"><col style="width:30%"><col></colgroup><thead><tr><th>차시</th><th>수업 주제</th><th>차시별 수업 계획</th></tr></thead><tbody>${rows.map(row => `<tr><td>${atcRange(row)}</td><td>${escape(row.topic)}</td><td>${escape(row.activities)}</td></tr>`).join("")}</tbody></table><p>* 상기 내용은 수업 상황에 따라 변동될 수 있습니다.</p></main></body></html>`;
}
