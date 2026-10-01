import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { REPORT_COLLECTION, REPORT_PROGRAM, evaluationStatus, reportPeriodId, validateEvaluation, type SavedEvaluation, type ReportSubmission } from "@/lib/haneulbitReports";
import { loadReportPeriod, serializePeriod } from "@/lib/haneulbitReportsServer";
import { SCHOOL_DOCUMENT_SETTINGS_COLLECTION, SCHOOL_DOCUMENT_SUBMISSION_COLLECTION } from "@/lib/schoolDocumentManagement";
import { getAfterSchoolDocumentSchool } from "@/lib/schoolDocumentSchools";

// A manual BAND submission record, never an automatic send or PDF download.
export async function markReportSubmitted(body: Record<string, unknown>, teacherUid: string) {
  const id = reportPeriodId(Number(body.year), Number(body.quarter));
  if (!Number.isInteger(body.revision) || Number(body.revision) < 1 || !Array.isArray(body.studentIds) || !body.studentIds.length || body.studentIds.length > 400 || body.studentIds.some((value: unknown) => typeof value !== "string" || !/^[^/]{1,128}$/.test(value))) throw new Error("invalid_report_input");
  const studentIds = [...new Set(body.studentIds as string[])];
  const { db } = getFirebaseAdmin();
  const school = getAfterSchoolDocumentSchool("haneulbit")!;
  const reportRef = db.collection(REPORT_COLLECTION).doc(id);
  const settingsRef = db.collection(SCHOOL_DOCUMENT_SETTINGS_COLLECTION).doc(`${teacherUid}__haneulbit`);
  const historyRef = db.collection(SCHOOL_DOCUMENT_SUBMISSION_COLLECTION).doc(`${teacherUid}__haneulbit__${id}__r${body.revision}`);
  await db.runTransaction(async (transaction) => {
    const [report, settings, history, ...evaluations] = await transaction.getAll(reportRef, settingsRef, historyRef, ...studentIds.map((studentId) => reportRef.collection("evaluations").doc(studentId)));
    if (!report.exists) throw new Error("report_not_found");
    const period = serializePeriod(id, report.data()!);
    if (body.revision !== period.revision) throw new Error("report_conflict");
    // Retried clicks must not append another history row or change the date.
    if (history.exists && period.submission?.revision === period.revision) return;
    evaluations.forEach((snapshot) => {
      if (!snapshot.exists) throw new Error("report_incomplete");
      const data = snapshot.data()!;
      const entry = { ...validateEvaluation(data), student: data.student } as SavedEvaluation;
      if (!entry.student || evaluationStatus(entry, period, entry.student) !== "작성완료") throw new Error("report_incomplete");
    });
    const submittedAt = new Date().toISOString();
    const submission: ReportSubmission = { revision: period.revision, studentIds, submittedAt, submittedBy: teacherUid, historyId: historyRef.id };
    transaction.set(historyRef, {
      teacherUid, schoolSlug: school.slug, schoolName: school.schoolName,
      contactName: String(settings.data()?.contactName || ""), contactPhone: String(settings.data()?.contactPhone || ""),
      recipientEmail: "", submissionChannel: "band", gmailMessageId: "",
      documentTitles: [`${period.year}년 ${period.quarter}분기 교육활동 결과통지서 (${REPORT_PROGRAM}) · ${studentIds.length}명`],
      reportPeriodId: id, reportRevision: period.revision, studentIds,
      submittedAt, createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(reportRef, { submission, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(settingsRef, {
      teacherUid, schoolSlug: school.slug, schoolName: school.schoolName, displayName: school.displayName,
      latestStatus: "submitted", latestProcessedAt: submittedAt, updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return loadReportPeriod(id);
}
