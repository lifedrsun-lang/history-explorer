import { FieldValue } from "firebase-admin/firestore";

import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getEnrollmentStatus } from "@/lib/studentEnrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECORDS = "teacher_textbook_receipts";
const FEES = "teacher_fee_contracts";
const normalize = (value: unknown) => String(value || "").trim();

const normalizeSchoolName = (value: unknown) =>
  normalize(value).replace(/\s/g, "").replace(/초등학교/g, "초").replace(/초등/g, "초");

const isSameSchool = (a: unknown, b: unknown) => {
  const left = normalizeSchoolName(a);
  const right = normalizeSchoolName(b);
  return Boolean(left && right && (left === right || left.endsWith(right) || right.endsWith(left)));
};

const normalizeChecks = (value: unknown) => {
  const source = Array.isArray(value) ? value : [];
  return [Boolean(source[0]), Boolean(source[1]), Boolean(source[2])];
};

const getRule = (schoolName: string) => {
  const key = normalizeSchoolName(schoolName);
  if (key.includes("새솔초")) return "all_after_enrollment";
  if (key.includes("하늘빛초")) return "started_terms_only";
  return "follow_fee_checks";
};

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const [feeSnapshot, studentSnapshot, recordSnapshot] = await Promise.all([
      db.collection(FEES).where("type", "==", "afterschool").get(),
      db.collection("students").get(),
      db.collection(RECORDS).where("teacherUid", "==", teacher.uid).get(),
    ]);

    const contracts = feeSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
    const students = studentSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: normalize(data.name),
        school: normalize(data.school),
        grade: normalize(data.grade),
        schoolClass: normalize(data.schoolClass || data.className || data.class),
        enrollmentStatus: getEnrollmentStatus(data),
      };
    }).filter((student) => student.name && student.school);

    const records = recordSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return Response.json({
      schools: contracts.map((contract) => ({
        contractId: contract.id,
        schoolName: normalize(contract.schoolName),
        title: normalize(contract.title),
        rule: getRule(contract.schoolName),
        quarterParticipation: contract.quarterParticipation || {},
        students: students.filter((student) => isSameSchool(student.school, contract.schoolName)),
      })),
      records,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401, message);
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const contractId = normalize(body?.contractId);
    const quarter = normalize(body?.quarter);
    const schoolName = normalize(body?.schoolName);
    if (!contractId || !schoolName || !/^Q[1-4]$/.test(quarter)) {
      return jsonError("학교와 분기를 확인해 주세요.", 400, "invalid_textbook_receipt");
    }

    const receipts: Record<string, boolean[]> = {};
    if (body?.receipts && typeof body.receipts === "object") {
      Object.entries(body.receipts as Record<string, unknown>).forEach(([studentId, checks]) => {
        receipts[studentId] = normalizeChecks(checks);
      });
    }

    const { db } = getFirebaseAdmin();
    const id = `${teacher.uid}__${contractId}__${quarter}`;
    await db.collection(RECORDS).doc(id).set({
      teacherUid: teacher.uid,
      contractId,
      schoolName,
      quarter,
      receipts,
      rule: getRule(schoolName),
      confirmedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return Response.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401, message);
    return handleRouteError(error);
  }
}
