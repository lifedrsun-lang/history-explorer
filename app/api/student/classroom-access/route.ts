import { NextRequest } from "next/server";

import {
  buildStudentSchoolAccessCookie,
  clearStudentClassroomCookie,
  clearStudentSchoolAccessCookie,
  createStudentSchoolAccessSession,
  deleteStudentClassroomSession,
  deleteStudentSchoolAccessSession,
  getStudentSchoolAccessSession,
  readStudentClassroomCookie,
  readStudentSchoolAccessCookie,
} from "@/lib/studentClassroomSession";
import {
  listSafeStudentsForSchool,
  listStudentSchools,
  verifyStudentSchoolEntryCode,
} from "@/lib/studentClassroomServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  try {
    const program = request.nextUrl.searchParams.get("program") || "";
    const session = await getStudentSchoolAccessSession(readStudentSchoolAccessCookie(request));
    if (!session) {
      const schools = await listStudentSchools(program);
      return Response.json({ authenticated: false, schools }, { headers: noStore });
    }
    const students = await listSafeStudentsForSchool(session.school, session.program);
    return Response.json(
      { authenticated: true, school: session.school, program: session.program, students },
      { headers: noStore }
    );
  } catch (error) {
    console.error("student classroom access GET failed", error);
    return Response.json({ error: "학교 정보를 불러오지 못했습니다." }, { status: 500, headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      school?: unknown;
      program?: unknown;
      entryCode?: unknown;
    };
    if (!verifyStudentSchoolEntryCode(body.school, body.entryCode)) {
      return Response.json({ error: "입장 코드를 확인해 주세요." }, { status: 401, headers: noStore });
    }
    const school = String(body.school || "").trim();
    const program = String(body.program || "").trim();
    const created = await createStudentSchoolAccessSession(school, program);
    const students = await listSafeStudentsForSchool(school, program);
    return new Response(JSON.stringify({ authenticated: true, school, program, students }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": buildStudentSchoolAccessCookie(created.id, created.expiresAt),
        ...noStore,
      },
    });
  } catch (error) {
    console.error("student classroom access POST failed", error);
    return Response.json({ error: "학교 입장을 확인하지 못했습니다." }, { status: 500, headers: noStore });
  }
}

export async function DELETE(request: NextRequest) {
  const schoolSessionId = readStudentSchoolAccessCookie(request);
  const classroomSessionId = readStudentClassroomCookie(request);
  await Promise.all([
    deleteStudentSchoolAccessSession(schoolSessionId),
    deleteStudentClassroomSession(classroomSessionId),
  ]);
  const response = Response.json({ ok: true }, { headers: noStore });
  response.headers.append("Set-Cookie", clearStudentSchoolAccessCookie());
  response.headers.append("Set-Cookie", clearStudentClassroomCookie());
  return response;
}
