import { getStudentGroup } from "@/app/student/data/studentGroups";
import { isCultureCenterSchool, normalizeSchoolText } from "@/app/student/data/schoolInfo";
import { studentProfile } from "@/lib/studentIdentity";
import { requireStudentSession, sessionJson, sessionError, studentDirectory, StudentSessionError } from "@/lib/studentSessionServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const current = await requireStudentSession(request), s = studentProfile(current.identity.id, current.identity.collectionName, current.data);
    let rank: number | null = null;
    if (!isCultureCenterSchool(s.school) && getStudentGroup(s)) {
      const score = (data: Record<string, unknown>) => Number(data.silver || data.silverCoin || data.은엽전 || 0) * 10 + Number(data.bronze || data.bronzeCoin || data.동엽전 || 0);
      rank = 1 + (await studentDirectory()).filter(({ identity, data }) => normalizeSchoolText(identity.school) === normalizeSchoolText(s.school) && identity.program === s.program && getStudentGroup(identity) === getStudentGroup(s) && score(data) > score(s)).length;
    }
    return sessionJson({ student: s, rank });
  } catch (error) { return sessionError(error); }
}
export async function PATCH(request: Request) {
  try {
    const current = await requireStudentSession(request);
    if (current.session.teacher_uid) throw new StudentSessionError(403, "미리보기에서는 변경할 수 없습니다.");
    const body = await request.json();
    if (typeof body.character !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(body.character)) return sessionJson({ error: "캐릭터를 확인해 주세요." }, 400);
    await current.ref.update({ character: body.character });
    return sessionJson({ ok: true });
  } catch (error) { return sessionError(error); }
}
