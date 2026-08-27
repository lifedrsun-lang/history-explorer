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
const toNumber = (value: unknown) => {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

const DEFAULT_AFTER_SCHOOL_CONTRACTS = [
  {
    type: "afterschool",
    schoolName: "하늘빛초",
    title: "역사탐험",
    rateA: 18000,
    rateB: 22411,
    monthLabels: ["1차월", "2차월", "3차월"],
    participation: {},
  },
  {
    type: "afterschool",
    schoolName: "새솔초",
    title: "역사탐구/역사논술",
    rateA: 21520,
    rateB: 21520,
    monthLabels: ["1차월", "2차월", "3차월"],
    participation: {},
  },
  {
    type: "afterschool",
    schoolName: "사우초",
    title: "독서역사논술",
    rateA: 22000,
    rateB: 22000,
    monthLabels: ["1차월", "2차월", "3차월"],
    participation: {},
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

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();

    let contractSnapshot = await db.collection(COLLECTION).get();

    // 기존 강사료 모듈에서 이미 운영하던 방과후 3개 학교를
    // 새 수강료 모듈의 최초 데이터로 한 번만 옮긴다.
    // 개봉초/원종초는 기존 방과후 단가 대상이 아니므로 자동 등록하지 않는다.
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
      .sort((a, b) => {
        if (a.school !== b.school) return a.school.localeCompare(b.school, "ko-KR");
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
      return jsonError("학교와 수강료 유형을 확인해 주세요.", 400, "invalid_fee_contract");
    }

    const payload: Record<string, unknown> = {
      type,
      schoolName,
      title: normalize(body?.title),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (type === "afterschool") {
      payload.rateA = toNumber(body?.rateA);
      payload.rateB = toNumber(body?.rateB);
      payload.monthLabels = Array.isArray(body?.monthLabels)
        ? body.monthLabels.slice(0, 3).map(normalize)
        : ["1차월", "2차월", "3차월"];
      payload.participation = {};
    } else {
      payload.ratePerSession = toNumber(body?.ratePerSession);
      payload.sessionCount = Math.max(0, Math.floor(toNumber(body?.sessionCount)));
    }

    const docRef = await db.collection(COLLECTION).add(payload);
    const saved = await docRef.get();
    return Response.json({ contract: serializeContract(saved) }, { status: 201 });
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
      return jsonError("수정할 수강료 항목이 없습니다.", 400, "missing_fee_contract_id");
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body?.participation && typeof body.participation === "object") {
      updates.participation = body.participation;
    }
    if (body?.rateA !== undefined) updates.rateA = toNumber(body.rateA);
    if (body?.rateB !== undefined) updates.rateB = toNumber(body.rateB);
    if (body?.ratePerSession !== undefined) {
      updates.ratePerSession = toNumber(body.ratePerSession);
    }
    if (body?.sessionCount !== undefined) {
      updates.sessionCount = Math.max(0, Math.floor(toNumber(body.sessionCount)));
    }
    if (Array.isArray(body?.monthLabels)) {
      updates.monthLabels = body.monthLabels.slice(0, 3).map(normalize);
    }

    const docRef = db.collection(COLLECTION).doc(id);
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
      return jsonError("삭제할 수강료 항목이 없습니다.", 400, "missing_fee_contract_id");
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
