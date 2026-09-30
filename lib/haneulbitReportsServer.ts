import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAfterSchoolSchool, matchesAfterSchoolSchool } from "@/lib/afterSchool";
import { toStudentRosterRecord } from "@/lib/studentRoster";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { handleRouteError, jsonError, serializeDate } from "@/lib/assignmentServer";
import { REPORT_COLLECTION, reportPeriodId, validateCommon, validateEvaluation, type ReportStudent, type ReportPeriod, type SavedEvaluation } from "@/lib/haneulbitReports";

export async function loadReportStudents(): Promise<ReportStudent[]> {
  const { db } = getFirebaseAdmin();
  const school = getAfterSchoolSchool("haneulbit")!;
  const snapshot = await db.collection("students").get();
  return snapshot.docs.flatMap((doc) => {
    const student = toStudentRosterRecord(doc.id, doc.data());
    if (!matchesAfterSchoolSchool(student.school, school) || student.enrollmentStatus !== "active") return [];
    return [{ id: student.id, name: student.name, grade: student.grade, schoolClass: student.schoolClass }];
  }).sort((a, b) => a.grade.localeCompare(b.grade, "ko", { numeric: true }) || a.schoolClass.localeCompare(b.schoolClass, "ko", { numeric: true }) || a.name.localeCompare(b.name, "ko"));
}
export function serializePeriod(id: string, data: FirebaseFirestore.DocumentData): ReportPeriod {
  return { ...validateCommon(data), id, revision: Number(data.revision || 0), updatedAt: serializeDate(data.updatedAt) };
}
export async function loadReportPeriod(id: string) {
  const { db } = getFirebaseAdmin();
  const ref = db.collection(REPORT_COLLECTION).doc(id);
  const [period, entries] = await Promise.all([ref.get(), ref.collection("evaluations").get()]);
  return {
    period: period.exists ? serializePeriod(period.id, period.data()!) : null,
    evaluations: Object.fromEntries(entries.docs.map((doc) => [doc.id, { ...validateEvaluation(doc.data()), student: doc.data().student } as SavedEvaluation])),
  };
}
export async function saveReport(body: Record<string, unknown>, uid: string) {
  const common = validateCommon(body.common);
  const id = reportPeriodId(common.year, common.quarter);
  if (!Number.isInteger(body.revision) || Number(body.revision) < 0) throw new Error("invalid_report_input");
  if (!Array.isArray(body.entries) || body.entries.length > 400) throw new Error("invalid_report_input");
  const entries = body.entries.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("invalid_report_input");
    const item = value as Record<string, unknown>;
    if (typeof item.studentId !== "string" || !/^[^/]{1,128}$/.test(item.studentId)) throw new Error("invalid_report_input");
    return { studentId: item.studentId, evaluation: validateEvaluation(item.evaluation) };
  });
  if (new Set(entries.map((entry) => entry.studentId)).size !== entries.length) throw new Error("invalid_report_input");
  const { db } = getFirebaseAdmin();
  const roster = new Map((await loadReportStudents()).map((s) => [s.id, s]));
  const ref = db.collection(REPORT_COLLECTION).doc(id);
  await db.runTransaction(async (transaction) => {
    const period = await transaction.get(ref);
    if (Number(period.data()?.revision || 0) !== body.revision) throw new Error("report_conflict");
    const entryRefs = entries.map((entry) => ref.collection("evaluations").doc(entry.studentId));
    const previous = entryRefs.length ? await transaction.getAll(...entryRefs) : [];
    const payloads = entries.map((entry, index) => {
      // An archived student keeps their saved identity. Never create a new student.
      const student = roster.get(entry.studentId) || previous[index].data()?.student;
      if (!student) throw new Error("report_student_not_found");
      return { ...entry.evaluation, student, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid };
    });
    transaction.set(ref, {
      ...common, schoolSlug: "haneulbit", schemaVersion: 1,
      revision: Number(body.revision) + 1, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid,
      ...(!period.exists ? { createdAt: FieldValue.serverTimestamp(), createdBy: uid } : {}),
    }, { merge: true });
    payloads.forEach((payload, index) => transaction.set(entryRefs[index], payload));
  });
  return loadReportPeriod(id);
}
export function reportError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "teacher_auth_required" || message.startsWith("auth/")) return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
  if (message === "report_conflict") return jsonError("다른 창에서 변경되었습니다. 현재 입력을 보관한 뒤 새로고침해 주세요.", 409, message);
  if (message === "report_student_not_found") return jsonError("현재 수강생 정보를 다시 불러와 주세요.", 400, message);
  if (message.startsWith("invalid_")) return jsonError("입력값과 교육기간을 확인해 주세요.", 400, message);
  if (message === "report_template_missing") return jsonError("학교 원본 양식이 아직 등록되지 않았습니다. 평가 내용은 저장할 수 있습니다.", 503, message);
  if (message === "report_text_overflow") return jsonError("학습 활동 또는 종합의견이 원본 양식 영역을 초과합니다. 내용을 줄여 다시 시도해 주세요.", 422, message);
  if (message === "report_incomplete") return jsonError("공통 정보와 학생의 필수 항목을 모두 입력하고 저장해 주세요.", 400, message);
  if (message === "report_not_found") return jsonError("저장된 결과통지서를 찾을 수 없습니다.", 404, message);
  return handleRouteError(error);
}
