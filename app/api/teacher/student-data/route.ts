import { NextRequest } from "next/server";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { verifyStudentDataTeacherRequest } from "@/lib/studentDataTeacherAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store, max-age=0" };
const normalize = (value: unknown) => String(value || "").trim();

const serializeValue = (value: any): any => {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value?.toMillis === "function") {
    return { seconds: Math.floor(value.toMillis() / 1000) };
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeValue(item)])
    );
  }
  return value;
};

const safeStudent = (id: string, data: FirebaseFirestore.DocumentData) => ({
  id,
  name: normalize(data?.name || data?.studentName || data?.student_name),
  school: normalize(data?.school || data?.schoolName || data?.school_name),
  grade: data?.grade || data?.studentGrade || data?.student_grade || "",
  class: data?.class || data?.studentClass || data?.student_class || data?.className || "",
  program: data?.program || "",
  bronze: Number(data?.bronze || data?.bronzeCoin || data?.동엽전 || 0),
  silver: Number(data?.silver || data?.silverCoin || data?.은엽전 || 0),
  character: normalize(data?.character),
  stage: Number(data?.stage || 0),
  coinHistory: serializeValue(Array.isArray(data?.coinHistory) ? data.coinHistory : []),
  isActive: data?.isActive !== false,
  enrollmentStatus: normalize(data?.enrollmentStatus || "active"),
});

const authError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  if (message === "teacher_auth_required") {
    return Response.json({ error: "교사 로그인이 필요합니다." }, { status: 401, headers });
  }
  if (message === "student_data_teacher_forbidden") {
    return Response.json({ error: "담당 교사 권한이 없습니다." }, { status: 403, headers });
  }
  console.error("teacher student-data API failed", error);
  return Response.json({ error: "학생 정보를 처리하지 못했습니다." }, { status: 500, headers });
};

export async function GET(request: NextRequest) {
  try {
    await verifyStudentDataTeacherRequest(request);
    const studentId = normalize(request.nextUrl.searchParams.get("studentId"));
    const { db } = getFirebaseAdmin();

    if (studentId) {
      const snapshot = await db.collection("students").doc(studentId).get();
      if (!snapshot.exists) {
        return Response.json({ error: "학생 정보를 찾지 못했습니다." }, { status: 404, headers });
      }
      return Response.json(
        { student: safeStudent(snapshot.id, snapshot.data() || {}) },
        { headers }
      );
    }

    const snapshot = await db.collection("students").get();
    return Response.json(
      { students: snapshot.docs.map((item) => safeStudent(item.id, item.data())) },
      { headers }
    );
  } catch (error) {
    return authError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const teacher = await verifyStudentDataTeacherRequest(request);
    const body = (await request.json().catch(() => ({}))) as {
      studentId?: unknown;
      character?: unknown;
    };
    const studentId = normalize(body.studentId);
    const character = normalize(body.character);
    if (!studentId || !character || character.length > 40) {
      return Response.json({ error: "변경 정보를 확인해 주세요." }, { status: 400, headers });
    }

    const { db } = getFirebaseAdmin();
    const ref = db.collection("students").doc(studentId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return Response.json({ error: "학생 정보를 찾지 못했습니다." }, { status: 404, headers });
    }
    await ref.update({
      character,
      studentDataUpdatedBy: teacher.uid,
      studentDataUpdatedAt: new Date(),
    });
    return Response.json(
      { student: safeStudent(studentId, { ...(snapshot.data() || {}), character }) },
      { headers }
    );
  } catch (error) {
    return authError(error);
  }
}
