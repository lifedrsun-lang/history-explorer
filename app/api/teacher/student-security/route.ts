import { randomBytes, randomUUID } from "node:crypto";
import { verifiedTeacher } from "@/lib/teacherAuthServer";
import { digest, studentProfile } from "@/lib/studentIdentity";
import { createStudentSession, readStudent, sessionCookie, sessionError, sessionJson, studentDirectory, studentOrigin, StudentSessionError } from "@/lib/studentSessionServer";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getSecurityRules } from "firebase-admin/security-rules";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    studentOrigin(request);
    let teacher;
    try { teacher = await verifiedTeacher(request); } catch { throw new StudentSessionError(401, "교사 로그인이 필요합니다."); }
    const body = await request.json();
    if (body.action === "audit-firestore-rules") {
      // Read-only export. This endpoint cannot create or release rulesets.
      const rules = await getSecurityRules(getFirebaseAdmin().app).getFirestoreRuleset();
      return sessionJson({ name: rules.name, createTime: rules.createTime, source: rules.source });
    }
    if (body.action === "list") {
      return sessionJson({ students: (await studentDirectory()).map(({ identity }) => identity) });
    }
    const student = await readStudent(body.studentCollection, body.studentId);
    if (body.action === "preview") {
      if (request.headers.get("x-sunlab-preview") !== "1") throw new StudentSessionError(400);
      const token = await createStudentSession(request, student, teacher.uid);
      return sessionJson({ student: { ...studentProfile(student.identity.id, student.identity.collectionName, student.data), teacherPreview: true } }, 200, sessionCookie(request, token, 1800));
    }
    const service = getSupabaseServer();
    if (body.action === "issue-photo-code") {
      const code = randomBytes(12).toString("base64url"), expiresAt = new Date(Date.now() + 180 * 86_400_000).toISOString();
      const result = await service.from("student_photo_credentials").upsert({ student_key: student.identity.studentKey, code_hash: digest(code), version: randomUUID(), issued_by: teacher.uid, issued_at: new Date().toISOString(), expires_at: expiresAt });
      if (result.error) throw new StudentSessionError(503);
      return sessionJson({ code, expiresAt });
    }
    if (body.action === "revoke-photo-code") {
      const result = await service.from("student_photo_credentials").delete().eq("student_key", student.identity.studentKey);
      if (result.error) throw new StudentSessionError(503);
      return sessionJson({ ok: true });
    }
    throw new StudentSessionError(400, "지원하지 않는 요청입니다.");
  } catch (error) { return sessionError(error); }
}
