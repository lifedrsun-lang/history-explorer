import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  AFTER_SCHOOL_ACADEMIC_YEAR,
  isSameSchool,
  isStudentEnrolledInQuarter,
  normalizeRosterText,
  toStudentRosterRecord,
  type QuarterKey,
} from "@/lib/studentRoster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECORDS = "teacher_textbook_receipts";
const FEES = "teacher_fee_contracts";

const normalizeChecks = (value: unknown) => {
  const source = Array.isArray(value) ? value : [];
  return [Boolean(source[0]), Boolean(source[1]), Boolean(source[2])];
};

const normalizePhone = (value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).trim().slice(0, 40);
};

const getRule = (schoolName: string) => {
  const key = normalizeRosterText(schoolName).replace(/\s/g, "");
  if (key.includes("새솔초")) return "all_after_enrollment";
  if (key.includes("하늘빛초") || key.includes("사우초")) {
    return "started_terms_only";
  }
  return "follow_fee_checks";
};

const isQuarterKey = (value: string): value is QuarterKey =>
  /^Q[1-4]$/.test(value);

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const requestedSchool =
      new URL(request.url).searchParams.get("school") || "";
    const { db } = getFirebaseAdmin();
    const [feeSnapshot, studentSnapshot, recordSnapshot] = await Promise.all([
      db.collection(FEES).where("type", "==", "afterschool").get(),
      db.collection("students").get(),
      db.collection(RECORDS).where("teacherUid", "==", teacher.uid).get(),
    ]);

    const contracts = feeSnapshot.docs
      .map((docItem) => ({ id: docItem.id, ...docItem.data() } as any))
      .filter(
        (contract) =>
          !requestedSchool ||
          isSameSchool(contract.schoolName, requestedSchool)
      );
    const contractIds = new Set(contracts.map((contract) => contract.id));
    const students = studentSnapshot.docs
      .map((docItem) =>
        toStudentRosterRecord(
          docItem.id,
          docItem.data() as Record<string, any>
        )
      )
      .filter((student) => student.name && student.school);

    const records = recordSnapshot.docs
      .map((docItem) => {
        const data = docItem.data();
        return {
          id: docItem.id,
          contractId: normalizeRosterText(data.contractId),
          quarter: normalizeRosterText(data.quarter),
          receipts:
            data.receipts && typeof data.receipts === "object"
              ? data.receipts
              : {},
          studentIds: Array.isArray(data.studentIds)
            ? data.studentIds.map(normalizeRosterText).filter(Boolean)
            : [],
        };
      })
      .filter(
        (record) =>
          !requestedSchool || contractIds.has(record.contractId)
      );

    return Response.json({
      academicYear: AFTER_SCHOOL_ACADEMIC_YEAR,
      schools: contracts.map((contract) => ({
        contractId: contract.id,
        schoolName: normalizeRosterText(contract.schoolName),
        title: normalizeRosterText(contract.title),
        rule: getRule(contract.schoolName),
        quarterParticipation: contract.quarterParticipation || {},
        students: students.filter((student) =>
          isSameSchool(student.school, contract.schoolName)
        ),
      })),
      records,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const contractId = normalizeRosterText(body?.contractId);
    const quarter = normalizeRosterText(body?.quarter);
    if (!contractId || !isQuarterKey(quarter)) {
      return jsonError(
        "학교와 분기를 확인해 주세요.",
        400,
        "invalid_textbook_receipt"
      );
    }

    const { db } = getFirebaseAdmin();
    const [contractSnapshot, studentSnapshot] = await Promise.all([
      db.collection(FEES).doc(contractId).get(),
      db.collection("students").get(),
    ]);
    const contract = contractSnapshot.data();
    if (
      !contractSnapshot.exists ||
      normalizeRosterText(contract?.type) !== "afterschool"
    ) {
      return jsonError(
        "학교 정보를 찾을 수 없습니다.",
        404,
        "fee_contract_not_found"
      );
    }

    const schoolName = normalizeRosterText(contract?.schoolName);
    if (
      !schoolName ||
      (body?.schoolName && !isSameSchool(body.schoolName, schoolName))
    ) {
      return jsonError(
        "학교 정보가 일치하지 않습니다.",
        400,
        "school_scope_mismatch"
      );
    }

    const students = studentSnapshot.docs.map((docItem) => ({
      ref: docItem.ref,
      roster: toStudentRosterRecord(
        docItem.id,
        docItem.data() as Record<string, any>
      ),
    }));
    const eligibleStudents = students.filter(
      ({ roster }) =>
        isSameSchool(roster.school, schoolName) &&
        isStudentEnrolledInQuarter(roster, quarter)
    );
    const allowedStudentIds = new Set(
      eligibleStudents.map(({ roster }) => roster.id)
    );

    const receipts: Record<string, boolean[]> = {};
    if (body?.receipts && typeof body.receipts === "object") {
      Object.entries(body.receipts as Record<string, unknown>).forEach(
        ([studentId, checks]) => {
          if (!allowedStudentIds.has(studentId)) return;
          receipts[studentId] = normalizeChecks(checks);
        }
      );
    }

    const studentPhones =
      body?.studentPhones && typeof body.studentPhones === "object"
        ? (body.studentPhones as Record<string, unknown>)
        : {};
    const id = `${teacher.uid}__${contractId}__${quarter}`;
    const recordRef = db.collection(RECORDS).doc(id);
    const batch = db.batch();

    batch.set(
      recordRef,
      {
        teacherUid: teacher.uid,
        contractId,
        schoolName,
        quarter,
        receipts,
        studentIds: eligibleStudents.map(({ roster }) => roster.id),
        rule: getRule(schoolName),
        source: "students.enrollmentTerms",
        rosterVersion: 3,
        academicYear: AFTER_SCHOOL_ACADEMIC_YEAR,
        confirmedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    eligibleStudents.forEach(({ ref, roster }) => {
      if (!Object.prototype.hasOwnProperty.call(studentPhones, roster.id)) {
        return;
      }
      batch.update(ref, {
        phone: normalizePhone(studentPhones[roster.id]),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    return Response.json({
      ok: true,
      id,
      studentCount: eligibleStudents.length,
      rosterSource: "students.enrollmentTerms",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}
