import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { resolveContractSchoolSlugForName } from "@/lib/schoolDocumentsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRMATION_COLLECTION = "teacher_atc_confirmations";
const FEE_COLLECTION = "teacher_fee_contracts";
const MAX_SIGNATURE_DATA_URL_LENGTH = 350_000;
const MAX_SCHEDULE_EVENTS = 250;

const normalize = (value: unknown, maxLength = 240) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const normalizeDate = (value: unknown) => {
  const date = normalize(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
};

const normalizeYearMonth = (value: unknown) => {
  const yearMonth = normalize(value, 7);
  return /^\d{4}-\d{2}$/.test(yearMonth) ? yearMonth : "";
};

const normalizeSchoolKey = (value: unknown) =>
  normalize(value)
    .replace(/\s/g, "")
    .replace(/초등학교/g, "초")
    .replace(/초등/g, "초")
    .replace(/[()]/g, "")
    .trim();

const normalizeSignature = (value: unknown) => {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !value.startsWith("data:image/png;base64,")) {
    throw new Error("invalid_signature");
  }
  if (value.length > MAX_SIGNATURE_DATA_URL_LENGTH) {
    throw new Error("signature_too_large");
  }
  return value;
};

const toMillis = (value: unknown) => {
  if (value && typeof value === "object" && "toMillis" in value) {
    const candidate = value as { toMillis?: () => number };
    if (typeof candidate.toMillis === "function") return candidate.toMillis();
  }
  return Number.MAX_SAFE_INTEGER;
};

const toIso = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === "function") {
      const date = candidate.toDate();
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }
  return "";
};

const serializeConfirmation = (
  docItem: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot
) => {
  const data = docItem.data() || {};
  return {
    id: docItem.id,
    ...data,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
};

const sanitizeScheduleSnapshot = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_SCHEDULE_EVENTS).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const data = entry as Record<string, unknown>;
    const date = normalizeDate(data.date);
    const summary = normalize(data.summary, 500);
    const calendarType = normalize(data.calendarType, 40);
    if (!date || !summary || calendarType !== "contract") return [];
    return [
      {
        eventId: normalize(data.eventId, 220),
        calendarType,
        date,
        summary,
        gradeClass: normalize(data.gradeClass, 80),
        lessonLabel: normalize(data.lessonLabel, 80),
      },
    ];
  });
};

const scheduleFingerprint = (value: unknown) =>
  JSON.stringify(sanitizeScheduleSnapshot(value));

const getConfirmationDocId = (
  teacherUid: string,
  yearMonth: string,
  schoolName: string
) => {
  const schoolToken = Buffer.from(normalizeSchoolKey(schoolName), "utf8").toString(
    "base64url"
  );
  return `${teacherUid}__${yearMonth}__${schoolToken}`;
};

type PeriodCandidate = {
  schoolName: string;
  schoolKey: string;
  startDate: string;
  endDate: string;
  sourceContractId: string;
  createdAtMs: number;
};

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const url = new URL(request.url);
    const requestedYearMonth = normalizeYearMonth(url.searchParams.get("yearMonth"));
    const { db } = getFirebaseAdmin();

    const [confirmationSnapshot, feeSnapshot] = await Promise.all([
      db.collection(CONFIRMATION_COLLECTION).get(),
      db.collection(FEE_COLLECTION).get(),
    ]);

    const confirmations = confirmationSnapshot.docs
      .map(serializeConfirmation)
      .filter((item: any) => item.teacherUid === teacher.uid)
      .filter(
        (item: any) => !requestedYearMonth || item.yearMonth === requestedYearMonth
      )
      .sort((a: any, b: any) =>
        normalize(a.schoolName).localeCompare(normalize(b.schoolName), "ko-KR")
      );

    const candidates: PeriodCandidate[] = feeSnapshot.docs.flatMap((docItem) => {
      const data = docItem.data();
      if (normalize(data.type, 40) !== "contract") return [];
      const schoolName = normalize(data.schoolName);
      const schoolKey = normalizeSchoolKey(schoolName);
      const startDate = normalizeDate(data.contractStartDate);
      const endDate = normalizeDate(data.contractEndDate);
      if (!schoolName || !schoolKey || !startDate || !endDate) return [];
      return [
        {
          schoolName,
          schoolKey,
          startDate,
          endDate,
          sourceContractId: docItem.id,
          createdAtMs: toMillis(data.createdAt),
        },
      ];
    });

    candidates.sort((a, b) => {
      if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      return a.schoolName.localeCompare(b.schoolName, "ko-KR");
    });

    const periodMap = new Map<string, PeriodCandidate>();
    candidates.forEach((candidate) => {
      if (!periodMap.has(candidate.schoolKey)) periodMap.set(candidate.schoolKey, candidate);
    });

    const periods = Array.from(periodMap.values()).map(
      ({ createdAtMs: _createdAtMs, ...period }) => period
    );

    return Response.json({ confirmations, periods });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = (await request.json()) as Record<string, unknown>;
    const yearMonth = normalizeYearMonth(body.yearMonth);
    const schoolName = normalize(body.schoolName, 160);

    if (!yearMonth || !schoolName) {
      return jsonError(
        "작성 월과 학교를 확인해 주세요.",
        400,
        "invalid_atc_confirmation"
      );
    }

    const schoolVerifierName = normalize(body.schoolVerifierName, 120);
    const requestedSchoolSignature = normalizeSignature(body.schoolSignatureDataUrl);
    const educatorSignatureDataUrlSnapshot = normalizeSignature(
      body.educatorSignatureDataUrlSnapshot
    );
    const scheduleSnapshot = sanitizeScheduleSnapshot(body.scheduleSnapshot);
    const operationPeriodStart = normalizeDate(body.operationPeriodStart);
    const operationPeriodEnd = normalizeDate(body.operationPeriodEnd);
    const operationPeriodSourceContractId = normalize(
      body.operationPeriodSourceContractId,
      220
    );
    const markSubmitted = body.markSubmitted === true;
    const nowIso = new Date().toISOString();
    const schoolSlug = await resolveContractSchoolSlugForName(schoolName);
    const { db } = getFirebaseAdmin();
    const docRef = db
      .collection(CONFIRMATION_COLLECTION)
      .doc(getConfirmationDocId(teacher.uid, yearMonth, schoolName));
    const existingSnapshot = await docRef.get();
    const existing = existingSnapshot.data() || {};

    const previousSignature =
      typeof existing.schoolSignatureDataUrl === "string"
        ? existing.schoolSignatureDataUrl
        : null;
    const previousVerifierName = normalize(existing.schoolVerifierName, 120);
    const previouslySigned =
      typeof existing.schoolSignedAt === "string" ? existing.schoolSignedAt : "";
    const previouslySubmitted =
      typeof existing.submittedAt === "string" ? existing.submittedAt : "";

    const scheduleChanged =
      existingSnapshot.exists &&
      scheduleFingerprint(existing.scheduleSnapshot) !==
        scheduleFingerprint(scheduleSnapshot);
    const verifierChanged =
      existingSnapshot.exists && previousVerifierName !== schoolVerifierName;
    const signatureChanged = previousSignature !== requestedSchoolSignature;
    const signedContentChanged = scheduleChanged || verifierChanged;

    // 이미 받은 학교 서명을 일정/확인자 변경 뒤 그대로 재사용하지 않는다.
    const schoolSignatureDataUrl =
      signedContentChanged && !signatureChanged ? null : requestedSchoolSignature;

    if (schoolSignatureDataUrl && !schoolVerifierName) {
      return jsonError(
        "담당교사 성명을 입력한 뒤 서명해 주세요.",
        400,
        "school_verifier_required"
      );
    }

    const schoolSignedAt = schoolSignatureDataUrl
      ? signatureChanged || signedContentChanged
        ? nowIso
        : previouslySigned || nowIso
      : "";

    let submittedAt = signedContentChanged ? "" : previouslySubmitted;

    if (markSubmitted) {
      if (scheduleSnapshot.length === 0) {
        return jsonError(
          "출강일정이 없는 확인서는 제출완료로 처리할 수 없습니다.",
          400,
          "schedule_required"
        );
      }
      if (!schoolSignatureDataUrl || !schoolVerifierName) {
        return jsonError(
          "담당교사 확인 서명이 필요합니다.",
          400,
          "school_signature_required"
        );
      }
      if (!educatorSignatureDataUrlSnapshot) {
        return jsonError(
          "에듀케이터 서명이 필요합니다.",
          400,
          "educator_signature_required"
        );
      }
      if (!operationPeriodStart || !operationPeriodEnd) {
        return jsonError(
          "수금관리의 운영기간을 확인해 주세요.",
          400,
          "operation_period_required"
        );
      }
      submittedAt =
        signedContentChanged || signatureChanged || !previouslySubmitted
          ? nowIso
          : previouslySubmitted;
    }

    let status = "draft";
    if (scheduleSnapshot.length > 0) status = "teacher_signature_pending";
    if (schoolSignatureDataUrl) status = "signed";
    if (submittedAt) status = "submitted";

    const payload = {
      teacherUid: teacher.uid,
      programName: "ATC스쿨",
      yearMonth,
      schoolSlug: schoolSlug || normalize(existing.schoolSlug, 40),
      schoolName,
      schoolVerifierName,
      schoolSignatureDataUrl,
      schoolSignedAt,
      educatorSignatureDataUrlSnapshot,
      operationPeriodStart,
      operationPeriodEnd,
      operationPeriodSourceContractId,
      scheduleSnapshot,
      status,
      submittedAt,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existingSnapshot.exists
        ? {}
        : { createdAt: FieldValue.serverTimestamp() }),
    };

    await docRef.set(payload, { merge: true });
    const saved = await docRef.get();
    return Response.json({ confirmation: serializeConfirmation(saved) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    if (message === "invalid_signature") {
      return jsonError("서명 이미지 형식이 올바르지 않습니다.", 400, message);
    }
    if (message === "signature_too_large") {
      return jsonError("서명 이미지 용량이 너무 큽니다.", 400, message);
    }
    return handleRouteError(error);
  }
}
