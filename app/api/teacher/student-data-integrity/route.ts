import { createHash } from "node:crypto";

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
import {
  Q2_ORPHAN_LINKS,
  buildQ2OrphanRelinkPlan,
  canonicalizeQ2OrphanReferences,
  type Q2OrphanRelinkPlan,
  type StoredDocument,
} from "@/lib/q2OrphanRelink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalize = (value: unknown) => String(value || "").trim();
const hasAnyCheck = (value: unknown) =>
  Array.isArray(value) && value.slice(0, 3).some(Boolean);
const Q2_RELINK_CONFIRMATION = "relink-exact-q2-orphans";

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

const hashValue = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalizeQ2OrphanReferences(value)))
    .digest("hex");

const hashDocuments = (documents: StoredDocument[]) =>
  hashValue(
    documents
      .map((document) => ({ id: document.id, data: document.data }))
      .sort((left, right) => left.id.localeCompare(right.id))
  );

const makeRelinkProof = ({
  students,
  feeContracts,
  textbookRecords,
}: {
  students: StoredDocument[];
  feeContracts: StoredDocument[];
  textbookRecords: StoredDocument[];
}) => ({
  sourceStudentCount: students.length,
  studentsHash: hashDocuments(students),
  canonicalRelatedDataHash: hashValue({
    feeContracts: feeContracts
      .map((document) => ({ id: document.id, data: document.data }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    textbookRecords: textbookRecords
      .map((document) => ({ id: document.id, data: document.data }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  }),
  currentStudents: Q2_ORPHAN_LINKS.map((link) => {
    const student = students.find((item) => item.id === link.studentId);
    return {
      studentId: link.studentId,
      expectedName: link.currentName,
      actualName: normalize(student?.data?.name),
    };
  }),
});

const getRelinkPlanDigest = (plan: Q2OrphanRelinkPlan) =>
  hashValue({
    mappings: plan.mappings,
    violations: plan.violations,
    updates: plan.updates,
  });

const withOrphanScopeValidation = (
  plan: Q2OrphanRelinkPlan,
  orphanReferences: string[]
) => {
  const expected = new Set<string>(
    Q2_ORPHAN_LINKS.map((link) => link.legacyId)
  );
  const unexpected = orphanReferences.filter(
    (studentId) => !expected.has(studentId)
  );
  if (unexpected.length === 0) return plan;
  const violations = [
    ...plan.violations,
    `허용되지 않은 고아 참조가 있습니다: ${unexpected.join(", ")}`,
  ];
  return {
    ...plan,
    ready: false,
    violations,
    mappings: plan.mappings.map((mapping) => ({
      ...mapping,
      status: "invalid" as const,
    })),
  };
};

const summarizeRelinkPlan = (plan: Q2OrphanRelinkPlan) => ({
  ready: plan.ready,
  changedMappingCount: plan.changedMappingCount,
  changedDocumentCount: plan.changedDocumentCount,
  mappings: plan.mappings,
  violations: plan.violations,
  digest: getRelinkPlanDigest(plan),
});

const applyUpdatesToDocuments = (
  documents: StoredDocument[],
  plan: Q2OrphanRelinkPlan,
  collection: "teacher_fee_contracts" | "teacher_textbook_receipts"
) => {
  const updates = new Map(
    plan.updates
      .filter((update) => update.collection === collection)
      .map((update) => [update.id, update.fields])
  );
  return documents.map((document) => ({
    ...document,
    data: updates.has(document.id)
      ? { ...document.data, ...updates.get(document.id) }
      : document.data,
  }));
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
    const action = normalize(body?.action);

    if (action === "dry-run-q2-orphan-links") {
      const data = await loadData();
      const audit = buildAudit(
        data.students,
        data.feeContracts,
        data.textbookRecords,
        data.linkedMemberIds
      );
      const plan = withOrphanScopeValidation(
        buildQ2OrphanRelinkPlan({
          students: data.students,
          feeContracts: data.feeContracts,
          textbookRecords: data.textbookRecords,
        }),
        audit.orphanReferences
      );
      return Response.json({
        ok: true,
        mode: "dry-run",
        plan: summarizeRelinkPlan(plan),
        before: {
          orphanReferences: audit.orphanReferences,
          proof: makeRelinkProof(data),
        },
      });
    }

    if (action === "apply-q2-orphan-links") {
      if (body?.confirm !== Q2_RELINK_CONFIRMATION) {
        return jsonError(
          "Q2 고아 참조 보정 확인값이 필요합니다.",
          400,
          "q2_relink_confirmation_required"
        );
      }
      const expectedDigest = normalize(body?.dryRunDigest);
      if (!expectedDigest) {
        return jsonError(
          "dry-run 결과값이 필요합니다.",
          400,
          "q2_relink_dry_run_required"
        );
      }

      const { db } = getFirebaseAdmin();
      const { beforeProof, appliedPlan } = await db.runTransaction(
        async (transaction) => {
          const [studentSnapshot, feeSnapshot, textbookSnapshot] =
            await Promise.all([
              transaction.get(db.collection("students")),
              transaction.get(db.collection("teacher_fee_contracts")),
              transaction.get(db.collection("teacher_textbook_receipts")),
            ]);
          const transactionData = {
            students: studentSnapshot.docs.map((docItem) => ({
              id: docItem.id,
              data: docItem.data() as Record<string, unknown>,
            })),
            feeContracts: feeSnapshot.docs.map((docItem) => ({
              id: docItem.id,
              data: docItem.data() as Record<string, unknown>,
            })),
            textbookRecords: textbookSnapshot.docs.map((docItem) => ({
              id: docItem.id,
              data: docItem.data() as Record<string, unknown>,
            })),
          };
          const transactionAudit = buildAudit(
            transactionData.students,
            transactionData.feeContracts,
            transactionData.textbookRecords,
            new Set<string>()
          );
          const plan = withOrphanScopeValidation(
            buildQ2OrphanRelinkPlan(transactionData),
            transactionAudit.orphanReferences
          );
          if (!plan.ready) {
            throw new Error(
              `q2_relink_not_safe:${plan.violations.join(" | ")}`
            );
          }
          if (getRelinkPlanDigest(plan) !== expectedDigest) {
            throw new Error("q2_relink_dry_run_changed");
          }

          const predictedData = {
            students: transactionData.students,
            feeContracts: applyUpdatesToDocuments(
              transactionData.feeContracts,
              plan,
              "teacher_fee_contracts"
            ),
            textbookRecords: applyUpdatesToDocuments(
              transactionData.textbookRecords,
              plan,
              "teacher_textbook_receipts"
            ),
          };
          const currentProof = makeRelinkProof(transactionData);
          const predictedProof = makeRelinkProof(predictedData);
          if (
            currentProof.studentsHash !== predictedProof.studentsHash ||
            currentProof.canonicalRelatedDataHash !==
              predictedProof.canonicalRelatedDataHash
          ) {
            throw new Error("q2_relink_would_change_protected_data");
          }

          plan.updates.forEach((update) => {
            transaction.update(
              db.collection(update.collection).doc(update.id),
              update.fields
            );
          });
          return { beforeProof: currentProof, appliedPlan: plan };
        }
      );

      const afterData = await loadData();
      const afterAudit = buildAudit(
        afterData.students,
        afterData.feeContracts,
        afterData.textbookRecords,
        afterData.linkedMemberIds
      );
      const afterPlan = buildQ2OrphanRelinkPlan({
        students: afterData.students,
        feeContracts: afterData.feeContracts,
        textbookRecords: afterData.textbookRecords,
      });
      const afterProof = makeRelinkProof(afterData);
      const namesUnchanged = afterProof.currentStudents.every(
        (student) => student.actualName === student.expectedName
      );
      const verified =
        afterAudit.orphanReferences.length === 0 &&
        afterPlan.ready &&
        afterPlan.mappings.every(
          (mapping) => mapping.status === "already_linked"
        ) &&
        beforeProof.studentsHash === afterProof.studentsHash &&
        beforeProof.sourceStudentCount === afterProof.sourceStudentCount &&
        beforeProof.canonicalRelatedDataHash ===
          afterProof.canonicalRelatedDataHash &&
        namesUnchanged;

      if (!verified) {
        throw new Error("q2_relink_post_verification_failed");
      }

      return Response.json({
        ok: true,
        mode: "apply",
        applied: summarizeRelinkPlan(appliedPlan),
        after: {
          orphanReferences: afterAudit.orphanReferences,
          proof: afterProof,
          namesUnchanged,
          sourceStudentsUnchanged:
            beforeProof.studentsHash === afterProof.studentsHash,
          relatedValuesUnchanged:
            beforeProof.canonicalRelatedDataHash ===
            afterProof.canonicalRelatedDataHash,
        },
      });
    }

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
    if (message === "q2_relink_dry_run_changed") {
      return jsonError(
        "dry-run 이후 데이터가 변경되어 실행을 중단했습니다. 다시 dry-run해 주세요.",
        409,
        message
      );
    }
    if (message.startsWith("q2_relink_not_safe:")) {
      return jsonError(
        message.slice("q2_relink_not_safe:".length),
        409,
        "q2_relink_not_safe"
      );
    }
    if (
      message === "q2_relink_would_change_protected_data" ||
      message === "q2_relink_post_verification_failed"
    ) {
      return jsonError(
        "보호 대상 데이터 불변 검증에 실패하여 보정을 중단했습니다.",
        409,
        message
      );
    }
    return handleRouteError(error);
  }
}
