import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getEnrollmentTerms,
  makeEnrollmentTerm,
} from "@/lib/studentEnrollment";
import {
  isValidBirthDate,
  normalizeBirthDate,
} from "@/lib/sunLabMember";
import { AFTER_SCHOOL_ACADEMIC_YEAR } from "@/lib/studentRoster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalize = (value: unknown) => String(value || "").trim();
const hasAnyCheck = (value: unknown) =>
  Array.isArray(value) && value.slice(0, 3).some(Boolean);

type StudentSource = {
  id: string;
  data: Record<string, any>;
};

const buildAudit = (
  students: StudentSource[],
  feeContracts: Array<{ id: string; data: Record<string, any> }>,
  textbookRecords: Array<{ id: string; data: Record<string, any> }>,
  linkedMemberIds: Set<string>
) => {
  const studentById = new Map(students.map((student) => [student.id, student]));
  const q3EvidenceIds = new Set<string>();
  const referencedIds = new Set<string>();
  const staleNames: Array<{
    studentId: string;
    sourceName: string;
    copiedName: string;
    location: string;
  }> = [];

  const inspectSnapshot = (value: unknown, location: string) => {
    if (!Array.isArray(value)) return;
    value.forEach((entry) => {
      const studentId = normalize(entry?.id);
      if (!studentId) return;
      referencedIds.add(studentId);
      const source = studentById.get(studentId);
      const copiedName = normalize(entry?.name);
      const sourceName = normalize(source?.data?.name);
      if (source && copiedName && sourceName && copiedName !== sourceName) {
        staleNames.push({ studentId, sourceName, copiedName, location });
      }
    });
  };

  feeContracts.forEach(({ id, data }) => {
    Object.entries(data.quarterParticipation || {}).forEach(
      ([quarter, studentMap]) => {
        Object.entries((studentMap as Record<string, unknown>) || {}).forEach(
          ([studentId, checks]) => {
            referencedIds.add(studentId);
            if (quarter === "Q3" && hasAnyCheck(checks)) {
              q3EvidenceIds.add(studentId);
            }
          }
        );
      }
    );
    Object.entries(data.participation || {}).forEach(([studentId, checks]) => {
      referencedIds.add(studentId);
      if (hasAnyCheck(checks)) q3EvidenceIds.add(studentId);
    });
    Object.entries(data.quarterStudentSnapshots || {}).forEach(
      ([quarter, snapshots]) =>
        inspectSnapshot(snapshots, `teacher_fee_contracts/${id}/${quarter}`)
    );
  });

  textbookRecords.forEach(({ id, data }) => {
    Object.entries(data.receipts || {}).forEach(([studentId, checks]) => {
      referencedIds.add(studentId);
      if (normalize(data.quarter) === "Q3" && hasAnyCheck(checks)) {
        q3EvidenceIds.add(studentId);
      }
    });
    inspectSnapshot(
      data.studentSnapshots,
      `teacher_textbook_receipts/${id}`
    );
  });

  const q3Term = makeEnrollmentTerm(AFTER_SCHOOL_ACADEMIC_YEAR, 3);
  const missingQ3Students = students
    .filter((student) => q3EvidenceIds.has(student.id))
    .filter((student) => !getEnrollmentTerms(student.data).includes(q3Term))
    .map((student) => ({
      studentId: student.id,
      name: normalize(student.data.name),
      school: normalize(student.data.school),
    }));
  const orphanReferences = Array.from(referencedIds)
    .filter((studentId) => !studentById.has(studentId))
    .sort();
  const missingTerms = students
    .filter((student) => getEnrollmentTerms(student.data).length === 0)
    .map((student) => ({
      studentId: student.id,
      name: normalize(student.data.name),
      school: normalize(student.data.school),
    }));
  const sunLabProfilesToLink = students
    .filter(
      (student) =>
        student.data.sunLabMember === true ||
        normalize(student.data.program) === "sun_lab"
    )
    .filter((student) => !linkedMemberIds.has(student.id))
    .filter((student) =>
      isValidBirthDate(normalizeBirthDate(student.data.birthDate))
    )
    .map((student) => ({
      studentId: student.id,
      name: normalize(student.data.name),
    }));
  const legacySunLabFlags = students
    .filter(
      (student) =>
        normalize(student.data.program) === "sun_lab" &&
        student.data.sunLabMember !== true
    )
    .map((student) => ({
      studentId: student.id,
      name: normalize(student.data.name),
    }));

  const duplicateGroups = new Map<string, StudentSource[]>();
  students.forEach((student) => {
    const key = [
      normalize(student.data.school).replace(/\s/g, ""),
      normalize(student.data.grade),
      normalize(student.data.class),
      normalize(student.data.name),
    ].join("|");
    if (!key.replace(/\|/g, "")) return;
    duplicateGroups.set(key, [...(duplicateGroups.get(key) || []), student]);
  });
  const duplicateStudents = Array.from(duplicateGroups.values())
    .filter((group) => group.length > 1)
    .map((group) =>
      group.map((student) => ({
        studentId: student.id,
        name: normalize(student.data.name),
        school: normalize(student.data.school),
      }))
    );

  return {
    counts: {
      sourceStudents: students.length,
      staleCopiedNames: staleNames.length,
      orphanReferences: orphanReferences.length,
      missingQuarterAssignments: missingTerms.length,
      evidencedMissingQ3: missingQ3Students.length,
      sunLabProfilesToLink: sunLabProfilesToLink.length,
      legacySunLabFlags: legacySunLabFlags.length,
      duplicateSourceGroups: duplicateStudents.length,
    },
    staleNames,
    orphanReferences,
    missingTerms,
    missingQ3Students,
    sunLabProfilesToLink,
    legacySunLabFlags,
    duplicateStudents,
  };
};

const loadData = async () => {
  const { db } = getFirebaseAdmin();
  const [studentSnapshot, feeSnapshot, textbookSnapshot, memberSnapshot] =
    await Promise.all([
      db.collection("students").get(),
      db.collection("teacher_fee_contracts").get(),
      db.collection("teacher_textbook_receipts").get(),
      db.collection("sun_lab_members").get(),
    ]);

  return {
    db,
    students: studentSnapshot.docs.map((docItem) => ({
      id: docItem.id,
      data: docItem.data() as Record<string, any>,
    })),
    feeContracts: feeSnapshot.docs.map((docItem) => ({
      id: docItem.id,
      data: docItem.data() as Record<string, any>,
    })),
    textbookRecords: textbookSnapshot.docs.map((docItem) => ({
      id: docItem.id,
      data: docItem.data() as Record<string, any>,
    })),
    linkedMemberIds: new Set(memberSnapshot.docs.map((docItem) => docItem.id)),
  };
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const data = await loadData();
    return Response.json({
      audit: buildAudit(
        data.students,
        data.feeContracts,
        data.textbookRecords,
        data.linkedMemberIds
      ),
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
    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== "repair-safe-links") {
      return jsonError(
        "안전 보정 확인값이 필요합니다.",
        400,
        "repair_confirmation_required"
      );
    }

    const data = await loadData();
    const audit = buildAudit(
      data.students,
      data.feeContracts,
      data.textbookRecords,
      data.linkedMemberIds
    );
    const studentById = new Map(
      data.students.map((student) => [student.id, student.data])
    );
    const batch = data.db.batch();
    const q3Term = makeEnrollmentTerm(AFTER_SCHOOL_ACADEMIC_YEAR, 3);

    audit.missingQ3Students.forEach(({ studentId }) => {
      const student = studentById.get(studentId);
      if (!student) return;
      batch.update(data.db.collection("students").doc(studentId), {
        enrollmentTerms: [...getEnrollmentTerms(student), q3Term].sort(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    audit.legacySunLabFlags.forEach(({ studentId }) => {
      batch.update(data.db.collection("students").doc(studentId), {
        sunLabMember: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    audit.sunLabProfilesToLink.forEach(({ studentId }) => {
      const student = studentById.get(studentId);
      if (!student) return;
      batch.set(
        data.db.collection("sun_lab_members").doc(studentId),
        {
          studentId,
          birthDate: normalizeBirthDate(student.birthDate),
          allAccess: student.sunLabAllAccess === true,
          permissions: Array.isArray(student.sunLabPermissions)
            ? student.sunLabPermissions
            : [],
          helloMapleId: normalize(student.helloMapleId),
          helloMaplePassword: normalize(student.helloMaplePassword),
          migratedFrom: "students",
          migratedBy: teacher.uid,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();

    return Response.json({
      ok: true,
      repaired: {
        q3Assignments: audit.missingQ3Students.length,
        sunLabFlags: audit.legacySunLabFlags.length,
        sunLabProfiles: audit.sunLabProfilesToLink.length,
      },
      preservedForReview: {
        orphanReferences: audit.orphanReferences.length,
        duplicateSourceGroups: audit.duplicateStudents.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

