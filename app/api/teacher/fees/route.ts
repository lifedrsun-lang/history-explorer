import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getEnrollmentStatus } from "@/lib/studentEnrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "teacher_fee_contracts";
const normalize = (value: unknown) => String(value || "").trim();
const normalizeDate = (value: unknown) => {
  const date = normalize(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
};
const toNumber = (value: unknown) => {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

const DEFAULT_TERMS = ["1텀", "2텀", "3텀"];

const DEFAULT_AFTER_SCHOOL_CONTRACTS = [
  {
    type: "afterschool",
    schoolName: "하늘빛초",
    title: "역사탐험",
    rateA: 18000,
    rateB: 22411,
    monthLabels: DEFAULT_TERMS,
    participation: {},
    quarterParticipation: {},
    settlements: {},
  },
  {
    type: "afterschool",
    schoolName: "새솔초",
    title: "역사탐구/역사논술",
    rateA: 21520,
    rateB: 21520,
    monthLabels: DEFAULT_TERMS,
    participation: {},
    quarterParticipation: {},
    settlements: {},
  },
  {
    type: "afterschool",
    schoolName: "사우초",
    title: "독서역사논술",
    rateA: 22000,
    rateB: 22000,
    monthLabels: DEFAULT_TERMS,
    participation: {},
    quarterParticipation: {},
    settlements: {},
  },
] as const;

const getGradeNumber = (value: unknown) => {
  const match = normalize(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const getTeachingClass = (student: FirebaseFirestore.DocumentData) => {
  const grade = getGradeNumber(student?.grade);
  if (grade >= 1 && grade <= 2) return "A반";
  if (grade >= 3 && grade <= 6) return "B반";
  return "";
};

const serializeContract = (
  docItem: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot
) => ({
  id: docItem.id,
  ...docItem.data(),
});

const hasCheckedParticipation = (contracts: any[], studentId: string) =>
  contracts.some((contract) => {
    const legacyChecks = contract?.participation?.[studentId];
    if (
      Array.isArray(legacyChecks) &&
      legacyChecks.slice(0, 3).some((value: unknown) => Boolean(value))
    ) {
      return true;
    }

    const quarterParticipation = contract?.quarterParticipation;
    if (!quarterParticipation || typeof quarterParticipation !== "object") {
      return false;
    }

    return Object.values(quarterParticipation).some((quarterValue: any) => {
      const checks = quarterValue?.[studentId];
      return (
        Array.isArray(checks) &&
        checks.slice(0, 3).some((value: unknown) => Boolean(value))
      );
    });
  });

const sanitizeQuarterParticipation = (value: unknown) => {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, Record<string, boolean[]>> = {};

  Object.entries(value as Record<string, unknown>).forEach(
    ([quarterKey, quarterValue]) => {
      if (
        !/^Q[1-4]$/.test(quarterKey) ||
        !quarterValue ||
        typeof quarterValue !== "object"
      ) {
        return;
      }

      const studentMap: Record<string, boolean[]> = {};
      Object.entries(quarterValue as Record<string, unknown>).forEach(
        ([studentId, checks]) => {
          if (!Array.isArray(checks)) return;
          studentMap[studentId] = [
            Boolean(checks[0]),
            Boolean(checks[1]),
            Boolean(checks[2]),
          ];
        }
      );
      result[quarterKey] = studentMap;
    }
  );

  return result;
};

const sanitizeWorkSessions = (value: unknown) => {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, Record<string, number>> = {};

  Object.entries(value as Record<string, unknown>).forEach(
    ([monthKey, monthValue]) => {
      if (
        !/^\d{4}-\d{2}$/.test(monthKey) ||
        !monthValue ||
        typeof monthValue !== "object"
      ) {
        return;
      }

      const dayMap: Record<string, number> = {};
      Object.entries(monthValue as Record<string, unknown>).forEach(
        ([dateKey, sessions]) => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
          const count = Math.max(0, Math.floor(toNumber(sessions)));
          if (count > 0) dayMap[dateKey] = count;
        }
      );
      result[monthKey] = dayMap;
    }
  );

  return result;
};

const sanitizeSettlements = (value: unknown) => {
  if (!value || typeof value !== "object") return {};

  const result: Record<
    string,
    {
      receivedAmount: number;
      grossAmount: number;
      insuranceFee: number;
      taxAmount: number;
      receivedDate: string;
    }
  > = {};

  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    const validKey = /^Q[1-4]-T[1-3]$/.test(key) || /^\d{4}-\d{2}$/.test(key);
    if (!validKey || !entry || typeof entry !== "object") return;

    const data = entry as Record<string, unknown>;
    const receivedAmount = toNumber(data.receivedAmount);
    const grossAmount = toNumber(data.grossAmount);
    const insuranceFee = toNumber(data.insuranceFee);
    const taxAmount = toNumber(data.taxAmount);
    const receivedDate = normalizeDate(data.receivedDate);

    if (
      receivedAmount === 0 &&
      grossAmount === 0 &&
      insuranceFee === 0 &&
      taxAmount === 0 &&
      !receivedDate
    ) {
      return;
    }

    result[key] = {
      receivedAmount,
      grossAmount,
      insuranceFee,
      taxAmount,
      receivedDate,
    };
  });

  return result;
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();

    let contractSnapshot = await db.collection(COLLECTION).get();

    if (contractSnapshot.empty) {
      await Promise.all(
        DEFAULT_AFTER_SCHOOL_CONTRACTS.map((contract) =>
          db.collection(COLLECTION).add({
            ...contract,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            seededFromLegacyFeeModule: true,
          })
        )
      );
      contractSnapshot = await db.collection(COLLECTION).get();
    }

    const studentSnapshot = await db.collection("students").get();

    const contracts = contractSnapshot.docs
      .map(serializeContract)
      .sort((a: any, b: any) =>
        normalize(a.schoolName).localeCompare(normalize(b.schoolName), "ko-KR")
      );

    const students = studentSnapshot.docs
      .map((docItem) => {
        const data = docItem.data();
        return {
          id: docItem.id,
          name: normalize(data?.name),
          school: normalize(data?.school),
          grade: normalize(data?.grade),
          teachingClass: getTeachingClass(data),
          enrollmentStatus: getEnrollmentStatus(data),
        };
      })
      .filter((student) => student.name && student.school)
      .filter(
        (student) =>
          student.enrollmentStatus !== "ended" ||
          hasCheckedParticipation(contracts, student.id)
      )
      .sort((a, b) => {
        if (a.school !== b.school) {
          return a.school.localeCompare(b.school, "ko-KR");
        }
        if (a.teachingClass !== b.teachingClass) {
          return a.teachingClass.localeCompare(b.teachingClass, "ko-KR");
        }
        return a.name.localeCompare(b.name, "ko-KR");
      });

    return Response.json({ contracts, students });
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
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const body = await request.json();
    const type = normalize(body?.type);
    const schoolName = normalize(body?.schoolName);

    if (!schoolName || !["afterschool", "contract"].includes(type)) {
      return jsonError(
        "학교와 수강료 유형을 확인해 주세요.",
        400,
        "invalid_fee_contract"
      );
    }

    const payload: Record<string, unknown> = {
      type,
      schoolName,
      title: normalize(body?.title),
      settlements: {},
      insuranceFee: toNumber(body?.insuranceFee),
      taxAmount: toNumber(body?.taxAmount),
      allowanceAmount: toNumber(body?.allowanceAmount),
      receivedDate: normalizeDate(body?.receivedDate),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (type === "afterschool") {
      payload.rateA = toNumber(body?.rateA);
      payload.rateB = toNumber(body?.rateB);
      payload.monthLabels = Array.isArray(body?.monthLabels)
        ? body.monthLabels.slice(0, 3).map(normalize)
        : DEFAULT_TERMS;
      payload.participation = {};
      payload.quarterParticipation = {};
    } else {
      const contractStartDate = normalizeDate(body?.contractStartDate);
      const contractEndDate = normalizeDate(body?.contractEndDate);

      if (
        !contractStartDate ||
        !contractEndDate ||
        contractStartDate > contractEndDate
      ) {
        return jsonError(
          "건별계약의 계약 시작일과 종료일을 확인해 주세요.",
          400,
          "invalid_contract_period"
        );
      }

      payload.ratePerSession = toNumber(body?.ratePerSession);
      payload.sessionCount = Math.max(
        0,
        Math.floor(toNumber(body?.sessionCount))
      );
      payload.contractStartDate = contractStartDate;
      payload.contractEndDate = contractEndDate;
      payload.workSessions = {};
    }

    const docRef = await db.collection(COLLECTION).add(payload);
    const saved = await docRef.get();
    return Response.json(
      { contract: serializeContract(saved) },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const body = await request.json();
    const id = normalize(body?.id);

    if (!id) {
      return jsonError(
        "수정할 수강료 항목이 없습니다.",
        400,
        "missing_fee_contract_id"
      );
    }

    const docRef = db.collection(COLLECTION).doc(id);
    const existingSnapshot = await docRef.get();
    if (!existingSnapshot.exists) {
      return jsonError(
        "수강료 항목을 찾을 수 없습니다.",
        404,
        "fee_contract_not_found"
      );
    }
    const existing = existingSnapshot.data() || {};

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body?.participation && typeof body.participation === "object") {
      updates.participation = body.participation;
    }
    if (
      body?.quarterParticipation &&
      typeof body.quarterParticipation === "object"
    ) {
      updates.quarterParticipation = sanitizeQuarterParticipation(
        body.quarterParticipation
      );
    }
    if (body?.workSessions && typeof body.workSessions === "object") {
      updates.workSessions = sanitizeWorkSessions(body.workSessions);
    }
    if (body?.settlements && typeof body.settlements === "object") {
      updates.settlements = sanitizeSettlements(body.settlements);
    }
    if (body?.rateA !== undefined) updates.rateA = toNumber(body.rateA);
    if (body?.rateB !== undefined) updates.rateB = toNumber(body.rateB);
    if (body?.ratePerSession !== undefined) {
      updates.ratePerSession = toNumber(body.ratePerSession);
    }
    if (body?.sessionCount !== undefined) {
      updates.sessionCount = Math.max(
        0,
        Math.floor(toNumber(body.sessionCount))
      );
    }
    if (Array.isArray(body?.monthLabels)) {
      updates.monthLabels = body.monthLabels.slice(0, 3).map(normalize);
    }

    // 기존 단일 수금 필드는 과거 데이터 호환을 위해 유지한다.
    if (body?.insuranceFee !== undefined) {
      updates.insuranceFee = toNumber(body.insuranceFee);
    }
    if (body?.taxAmount !== undefined) {
      updates.taxAmount = toNumber(body.taxAmount);
    }
    if (body?.allowanceAmount !== undefined) {
      updates.allowanceAmount = toNumber(body.allowanceAmount);
    }
    if (body?.receivedDate !== undefined) {
      updates.receivedDate = normalizeDate(body.receivedDate);
    }

    if (
      body?.contractStartDate !== undefined ||
      body?.contractEndDate !== undefined
    ) {
      const contractStartDate =
        body?.contractStartDate !== undefined
          ? normalizeDate(body.contractStartDate)
          : normalizeDate(existing.contractStartDate);
      const contractEndDate =
        body?.contractEndDate !== undefined
          ? normalizeDate(body.contractEndDate)
          : normalizeDate(existing.contractEndDate);

      if (
        contractStartDate &&
        contractEndDate &&
        contractStartDate > contractEndDate
      ) {
        return jsonError(
          "계약 시작일은 종료일보다 늦을 수 없습니다.",
          400,
          "invalid_contract_period"
        );
      }

      updates.contractStartDate = contractStartDate;
      updates.contractEndDate = contractEndDate;
    }

    await docRef.update(updates);
    const saved = await docRef.get();
    return Response.json({ contract: serializeContract(saved) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const id = normalize(new URL(request.url).searchParams.get("id"));

    if (!id) {
      return jsonError(
        "삭제할 수강료 항목이 없습니다.",
        400,
        "missing_fee_contract_id"
      );
    }

    await db.collection(COLLECTION).doc(id).delete();
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}
