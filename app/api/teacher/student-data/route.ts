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
  materialHistory: serializeValue(Array.isArray(data?.materialHistory) ? data.materialHistory : []),
  studentNumber: normalize(data?.studentNumber || data?.number || data?.studentNo),
  teachingClass: normalize(data?.teachingClass),
  worldCultureStage: normalize(data?.worldCultureStage),
  sunLabMember: data?.sunLabMember === true,
  enrollmentTerms: Array.isArray(data?.enrollmentTerms)
    ? data.enrollmentTerms.map(normalize).filter(Boolean)
    : [],
  pendingCoinExchangeRequestId: normalize(data?.pendingCoinExchangeRequestId),
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
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const studentId = normalize(body.studentId);
    const action = normalize(body.action || "character");
    if (!studentId) {
      return Response.json({ error: "학생 ID를 확인해 주세요." }, { status: 400, headers });
    }

    const { db } = getFirebaseAdmin();
    const ref = db.collection("students").doc(studentId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return Response.json({ error: "학생 정보를 찾지 못했습니다." }, { status: 404, headers });
    }

    let changes: Record<string, unknown>;

    if (action === "character") {
      const character = normalize(body.character);
      if (!character || character.length > 40) {
        return Response.json({ error: "캐릭터 정보를 확인해 주세요." }, { status: 400, headers });
      }
      changes = { character };
    } else if (action === "materialHistory") {
      if (!Array.isArray(body.materialHistory) || body.materialHistory.length > 100) {
        return Response.json({ error: "교재 지급 기록을 확인해 주세요." }, { status: 400, headers });
      }
      changes = { materialHistory: serializeValue(body.materialHistory) };
    } else if (action === "profile") {
      const fields = body.fields && typeof body.fields === "object" ? body.fields : {};
      const school = normalize(fields.school);
      const grade = normalize(fields.grade);
      const className = normalize(fields.class);
      const studentNumber = normalize(fields.studentNumber);
      const name = normalize(fields.name);
      const program = normalize(fields.program);
      const teachingClass = normalize(fields.teachingClass);
      const enrollmentStatus = normalize(fields.enrollmentStatus);
      const worldCultureStage = normalize(fields.worldCultureStage);
      const enrollmentTerms = Array.isArray(fields.enrollmentTerms)
        ? fields.enrollmentTerms.map(normalize).filter(Boolean)
        : [];

      if (
        !school ||
        !name ||
        school.length > 100 ||
        name.length > 50 ||
        grade.length > 20 ||
        className.length > 20 ||
        studentNumber.length > 20 ||
        program.length > 50 ||
        worldCultureStage.length > 80 ||
        !["", "A반", "B반"].includes(teachingClass) ||
        !["active", "paused", "completed", "withdrawn"].includes(enrollmentStatus) ||
        enrollmentTerms.length > 20 ||
        enrollmentTerms.some((term: string) => !/^\d{4}-Q[1-4]$/.test(term))
      ) {
        return Response.json({ error: "수강생 정보를 확인해 주세요." }, { status: 400, headers });
      }

      changes = {
        school,
        grade,
        class: className,
        studentNumber,
        password: studentNumber.padStart(2, "0"),
        name,
        program,
        worldCultureStage,
        teachingClass,
        enrollmentStatus,
        isActive: enrollmentStatus === "active",
        enrollmentTerms,
        sunLabMember: fields.sunLabMember === true,
      };
    } else {
      return Response.json({ error: "허용되지 않은 변경입니다." }, { status: 400, headers });
    }

    await ref.update({
      ...changes,
      studentDataUpdatedBy: teacher.uid,
      studentDataUpdatedAt: new Date(),
    });

    return Response.json(
      { student: safeStudent(studentId, { ...(snapshot.data() || {}), ...changes }) },
      { headers }
    );
  } catch (error) {
    return authError(error);
  }
}
