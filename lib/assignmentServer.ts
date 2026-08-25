import "server-only";

import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import {
  ASSIGNMENTS_COLLECTION,
  AssignmentFile,
  AssignmentStudent,
  AssignmentSubmissionSummary,
  AssignmentSummary,
  HOMEWORK_MAX_FILES,
  isAllowedStudentCollection,
  makeStorageSafeStudentKey,
  makeStudentKey,
  normalizeAssignmentStatus,
  normalizeText,
  validateHomeworkPhotoFile,
  validateHomeworkPhotoInput,
} from "@/lib/assignments";
import {
  getFirebaseAdmin,
  isFirebaseAdminConfigurationError,
} from "@/lib/firebaseAdmin";
import { isSupabaseConfigurationError } from "@/lib/supabaseServer";

type StudentAuthInput = {
  studentId: unknown;
  studentCollection: unknown;
  studentPassword: unknown;
};

type UploadedFileInput = {
  fileId?: unknown;
  storagePath?: unknown;
  originalName?: unknown;
  contentType?: unknown;
  size?: unknown;
};

export const jsonError = (
  message: string,
  status = 400,
  code = "bad_request"
) => {
  return Response.json({ error: message, code }, { status });
};

export const handleRouteError = (error: unknown) => {
  if (isFirebaseAdminConfigurationError(error)) {
    return jsonError(
      "Firebase Admin 환경변수가 설정되지 않았습니다.",
      500,
      "configuration_error"
    );
  }

  if (isSupabaseConfigurationError(error)) {
    return jsonError(
      "Supabase 환경변수가 설정되지 않았습니다.",
      500,
      "configuration_error"
    );
  }

  console.error(error);

  return jsonError(
    "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    500,
    "server_error"
  );
};

export const serializeDate = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  const maybeTimestamp = value as {
    toDate?: () => Date;
    seconds?: number;
  };

  if (typeof maybeTimestamp.toDate === "function") {
    return maybeTimestamp.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof maybeTimestamp.seconds === "number") {
    return new Date(maybeTimestamp.seconds * 1000).toISOString();
  }

  return null;
};

export const serializeAssignment = (
  id: string,
  data: FirebaseFirestore.DocumentData
): AssignmentSummary => {
  return {
    id,
    schemaVersion: 1,
    title: normalizeText(data?.title),
    description: normalizeText(data?.description),
    program: normalizeText(data?.program),
    school: normalizeText(data?.school),
    targetTeachingClass: normalizeText(data?.targetTeachingClass),
    targetStudentKeys: Array.isArray(data?.targetStudentKeys)
      ? data.targetStudentKeys.map((item: unknown) => normalizeText(item))
      : [],
    createdBy: normalizeText(data?.createdBy),
    createdAt: serializeDate(data?.createdAt),
    updatedAt: serializeDate(data?.updatedAt),
    dueAt: serializeDate(data?.dueAt),
    isActive: data?.isActive !== false,
    archivedAt: serializeDate(data?.archivedAt),
    archivedBy: data?.archivedBy || null,
  };
};

export const serializeSubmission = (
  id: string,
  data: FirebaseFirestore.DocumentData
): AssignmentSubmissionSummary => {
  const files = Array.isArray(data?.files)
    ? data.files.map((file: Record<string, unknown>) => ({
        fileId: normalizeText(file?.fileId),
        storagePath: normalizeText(file?.storagePath),
        originalName: normalizeText(file?.originalName),
        contentType: normalizeText(file?.contentType),
        size: Number(file?.size || 0),
        uploadedAt: serializeDate(file?.uploadedAt),
      }))
    : [];

  return {
    id,
    schemaVersion: 1,
    assignmentId: normalizeText(data?.assignmentId),
    studentId: normalizeText(data?.studentId),
    studentCollection: data?.studentCollection,
    studentKey: normalizeText(data?.studentKey),
    studentSnapshot: {
      name: normalizeText(data?.studentSnapshot?.name),
      school: normalizeText(data?.studentSnapshot?.school),
      grade: normalizeText(data?.studentSnapshot?.grade),
      class: normalizeText(data?.studentSnapshot?.class),
      studentNumber: normalizeText(data?.studentSnapshot?.studentNumber),
    },
    status: normalizeAssignmentStatus(data?.status),
    submissionAttemptId: normalizeText(data?.submissionAttemptId),
    files,
    submittedAt: serializeDate(data?.submittedAt),
    updatedAt: serializeDate(data?.updatedAt),
    revisionRequestedAt: serializeDate(data?.revisionRequestedAt),
    revisionRequestedBy: data?.revisionRequestedBy || null,
    revisionMessage: normalizeText(data?.revisionMessage),
    approvedAt: serializeDate(data?.approvedAt),
    approvedBy: data?.approvedBy || null,
    approvalRevokedAt: serializeDate(data?.approvalRevokedAt),
    approvalRevokedBy: data?.approvalRevokedBy || null,
    rewardGranted: Boolean(data?.rewardGranted),
    rewardGrantedAt: serializeDate(data?.rewardGrantedAt),
    rewardId: data?.rewardId || null,
    rewardCoinHistoryId: data?.rewardCoinHistoryId || null,
    rewardExchangeCount: Number(data?.rewardExchangeCount || 0),
    rewardRevokedAt: serializeDate(data?.rewardRevokedAt),
  };
};

const getStudentPassword = (data: FirebaseFirestore.DocumentData) => {
  return normalizeText(data?.password || data?.studentPassword || data?.pw);
};

export const getVerifiedStudent = async (input: StudentAuthInput) => {
  const studentId = normalizeText(input.studentId);
  const studentCollection = normalizeText(input.studentCollection);
  const studentPassword = normalizeText(input.studentPassword);

  if (!studentId || !studentPassword) {
    throw new Error("student_auth_required");
  }

  if (!isAllowedStudentCollection(studentCollection)) {
    throw new Error("invalid_student_collection");
  }

  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection(studentCollection).doc(studentId).get();

  if (!snapshot.exists) {
    throw new Error("student_not_found");
  }

  const data = snapshot.data() || {};

  if (data?.isActive === false) {
    throw new Error("inactive_student");
  }

  if (getStudentPassword(data) !== studentPassword) {
    throw new Error("invalid_student_password");
  }

  const studentKey = makeStudentKey(studentCollection, studentId);

  return {
    id: snapshot.id,
    collectionName: studentCollection,
    studentKey,
    name: normalizeText(data?.name || data?.studentName || data?.student_name),
    school: normalizeText(data?.school || data?.schoolName || data?.school_name),
    grade: normalizeText(data?.grade || data?.studentGrade || data?.student_grade),
    class: normalizeText(data?.class || data?.studentClass || data?.className),
    studentNumber: normalizeText(
      data?.studentNumber || data?.number || data?.studentNo || data?.no
    ),
    program: normalizeText(data?.program),
    isActive: data?.isActive !== false,
  } satisfies AssignmentStudent;
};

export const getAssignmentForStudent = async (
  assignmentId: string,
  student: AssignmentStudent
) => {
  const { db } = getFirebaseAdmin();
  const snapshot = await db
    .collection(ASSIGNMENTS_COLLECTION)
    .doc(assignmentId)
    .get();

  if (!snapshot.exists) {
    throw new Error("assignment_not_found");
  }

  const assignment = serializeAssignment(snapshot.id, snapshot.data() || {});

  if (!assignment.isActive) {
    throw new Error("inactive_assignment");
  }

  if (!assignment.targetStudentKeys.includes(student.studentKey)) {
    throw new Error("assignment_forbidden");
  }

  return assignment;
};

export const getSubmissionDocId = (
  assignmentId: string,
  studentKey: string
) => {
  return `${assignmentId}_${makeStorageSafeStudentKey(studentKey)}`;
};

export const createUploadTarget = (
  assignmentId: string,
  studentKey: string,
  file: { name: string; type: string; size: number },
  submissionAttemptId?: string
) => {
  const validationError = validateHomeworkPhotoInput(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const safeStudentKey = makeStorageSafeStudentKey(studentKey);
  const attemptId = submissionAttemptId || randomUUID();
  const fileId = randomUUID();
  const storagePath = [
    "assignments",
    assignmentId,
    "submissions",
    safeStudentKey,
    attemptId,
    `${fileId}.jpg`,
  ].join("/");

  return {
    submissionAttemptId: attemptId,
    fileId,
    storagePath,
  };
};

export const assertStoragePathForStudent = (
  assignmentId: string,
  studentKey: string,
  submissionAttemptId: string,
  storagePath: string
) => {
  const safeStudentKey = makeStorageSafeStudentKey(studentKey);
  const prefix = [
    "assignments",
    assignmentId,
    "submissions",
    safeStudentKey,
    submissionAttemptId,
    "",
  ].join("/");

  if (!storagePath.startsWith(prefix)) {
    throw new Error("invalid_storage_path");
  }
};

export const verifyTeacherRequest = async (request: Request) => {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/);

  if (!match) {
    throw new Error("teacher_auth_required");
  }

  const { auth } = getFirebaseAdmin();

  // 현재는 teacher custom claim이 없어 Firebase 로그인 여부까지만 검증한다.
  return auth.verifyIdToken(match[1]);
};

export const createAssignmentPayload = (
  body: Record<string, unknown>,
  teacherUid: string
) => {
  const title = normalizeText(body?.title);
  const description = normalizeText(body?.description);
  const program = normalizeText(body?.program);
  const school = normalizeText(body?.school);
  const targetTeachingClass = normalizeText(body?.targetTeachingClass);
  const targetStudentKeys = Array.isArray(body?.targetStudentKeys)
    ? body.targetStudentKeys.map((item: unknown) => normalizeText(item)).filter(Boolean)
    : [];
  const dueAtText = normalizeText(body?.dueAt);

  if (!title) {
    throw new Error("title_required");
  }

  if (!program || !school || !targetTeachingClass) {
    throw new Error("target_required");
  }

  if (targetStudentKeys.length === 0) {
    throw new Error("students_required");
  }

  for (const studentKey of targetStudentKeys) {
    const [collectionName, studentId] = studentKey.split(":");

    if (!isAllowedStudentCollection(collectionName) || !studentId) {
      throw new Error("invalid_student_key");
    }
  }

  return {
    schemaVersion: 1,
    title,
    description,
    program,
    school,
    targetTeachingClass,
    targetStudentKeys,
    createdBy: teacherUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    dueAt: dueAtText ? new Date(dueAtText) : null,
    isActive: true,
  };
};

export const normalizeUploadedFiles = (files: UploadedFileInput[]) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("files_required");
  }

  if (files.length > HOMEWORK_MAX_FILES) {
    throw new Error("too_many_files");
  }

  return files.map((file) => {
    const item: AssignmentFile = {
      fileId: normalizeText(file.fileId),
      storagePath: normalizeText(file.storagePath),
      originalName: normalizeText(file.originalName),
      contentType: normalizeText(file.contentType),
      size: Number(file.size || 0),
      uploadedAt: new Date().toISOString(),
    };

    const validationError = validateHomeworkPhotoFile({
      name: item.originalName,
      type: item.contentType,
      size: item.size,
    });

    if (validationError || !item.fileId || !item.storagePath) {
      throw new Error(validationError || "invalid_file");
    }

    return item;
  });
};

