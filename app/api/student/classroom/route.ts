import { NextRequest } from "next/server";

import {
  buildStudentClassroomCookie,
  clearStudentClassroomCookie,
  createStudentClassroomSession,
  deleteStudentClassroomSession,
  getStudentClassroomSession,
  getStudentSchoolAccessSession,
  readStudentClassroomCookie,
  readStudentSchoolAccessCookie,
} from "@/lib/studentClassroomSession";
import {
  getStudentDocument,
  updateStudentCharacter,
  verifyStudentClassroomCredential,
} from "@/lib/studentClassroomServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  const session = await getStudentClassroomSession(readStudentClassroomCookie(request));
  if (!session) {
    return Response.json({ authenticated: false }, { status: 401, headers: noStore });
  }
  const result = await getStudentDocument(session.collectionName, session.studentId);
  if (!result) {
    return Response.json({ authenticated: false }, { status: 401, headers: noStore });
  }
  return Response.json({ authenticated: true, student: result.student }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  try {
    const schoolAccess = await getStudentSchoolAccessSession(readStudentSchoolAccessCookie(request));
    if (!schoolAccess) {
      return Response.json({ error: "학교 입장 확인이 만료되었습니다." }, { status: 401, headers: noStore });
    }
    const body = (await request.json().catch(() => ({}))) as {
      studentId?: unknown;
      collectionName?: unknown;
      credential?: unknown;
    };
    const result = await verifyStudentClassroomCredential({
      studentId: body.studentId,
      collectionName: body.collectionName,
      credential: body.credential,
      school: schoolAccess.school,
      program: schoolAccess.program,
    });
    if (!result) {
      return Response.json({ error: "학생 인증 정보를 확인해 주세요." }, { status: 401, headers: noStore });
    }
    const created = await createStudentClassroomSession({
      studentId: result.student.id,
      collectionName: result.student.collectionName,
      name: result.student.name,
      school: result.student.school,
      program: result.student.program,
    });
    return new Response(JSON.stringify({ authenticated: true, student: result.student }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": buildStudentClassroomCookie(created.id, created.expiresAt),
        ...noStore,
      },
    });
  } catch (error) {
    console.error("student classroom login failed", error);
    return Response.json({ error: "학생 로그인을 처리하지 못했습니다." }, { status: 500, headers: noStore });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getStudentClassroomSession(readStudentClassroomCookie(request));
  if (!session) {
    return Response.json({ error: "학생 로그인이 필요합니다." }, { status: 401, headers: noStore });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { character?: unknown };
    const student = await updateStudentCharacter(
      session.collectionName,
      session.studentId,
      body.character
    );
    return Response.json({ student }, { headers: noStore });
  } catch (error) {
    console.error("student character update failed", error);
    return Response.json({ error: "캐릭터를 변경하지 못했습니다." }, { status: 400, headers: noStore });
  }
}

export async function DELETE(request: NextRequest) {
  await deleteStudentClassroomSession(readStudentClassroomCookie(request));
  const response = Response.json({ ok: true }, { headers: noStore });
  response.headers.set("Set-Cookie", clearStudentClassroomCookie());
  return response;
}
