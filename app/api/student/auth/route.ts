import { getSchoolDisplayName } from "@/app/student/data/schoolInfo";
import { getStudentProgramValue } from "@/lib/programs";
import { studentProfile, text } from "@/lib/studentIdentity";
import { limitStudentAttempt, loginStudent, requireStudentSession, revokeStudentSession, sameStudentSchool, sessionCookie, sessionError, sessionJson, studentDirectory, studentOrigin, verifyPhotoCode } from "@/lib/studentSessionServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const student = await requireStudentSession(request);
    return sessionJson({ student: studentProfile(student.identity.id, student.identity.collectionName, student.data) });
  } catch (error) { return sessionError(error); }
}
export async function POST(request: Request) {
  try {
    studentOrigin(request);
    const body = await request.json();
    if (body.action === "login") return await loginStudent(request, body);
    if (body.action === "verify-photo") return await verifyPhotoCode(request, body);
    if (body.action === "schools") {
      const all = await studentDirectory();
      return sessionJson({ schools: [...new Set(all.filter(row => row.identity.program === getStudentProgramValue(body.program)).map(row => getSchoolDisplayName(row.identity.school)))] });
    }
    if (body.action === "search") {
      const name = text(body.name), school = text(body.school);
      if (name.length < 2 || name.length > 40 || !school || school.length > 100) return sessionJson({ students: [] });
      await limitStudentAttempt(request, "search", `${school}:${name}`, 60);
      const rows = (await studentDirectory()).filter(({ identity }) => identity.program === getStudentProgramValue(body.program) && sameStudentSchool(identity.school, school) && identity.name.includes(name)).slice(0, 10);
      return sessionJson({ students: rows.map(({ identity: s }) => ({ id: s.id, collectionName: s.collectionName, name: s.name, school: s.school, grade: s.grade, class: s.class })) });
    }
    return sessionJson({ error: "지원하지 않는 요청입니다." }, 400);
  } catch (error) { return sessionError(error); }
}
export async function DELETE(request: Request) {
  try {
    studentOrigin(request);
    await revokeStudentSession(request);
    return sessionJson({ ok: true }, 200, sessionCookie(request, "", 0));
  } catch (error) { return sessionError(error); }
}
