import { NextRequest } from "next/server";

import {
  getStudentClassroomSession,
  readStudentClassroomCookie,
} from "@/lib/studentClassroomSession";
import {
  calculateStudentRank,
  getStudentDocument,
} from "@/lib/studentClassroomServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  const session = await getStudentClassroomSession(readStudentClassroomCookie(request));
  if (!session) {
    return Response.json({ error: "학생 로그인이 필요합니다." }, { status: 401, headers });
  }
  const result = await getStudentDocument(session.collectionName, session.studentId);
  if (!result) {
    return Response.json({ error: "학생 정보를 찾지 못했습니다." }, { status: 404, headers });
  }
  const rank = await calculateStudentRank(result.student);
  return Response.json(rank, { headers });
}
