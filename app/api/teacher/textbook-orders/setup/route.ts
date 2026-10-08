import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getStudentProgramValue } from "@/lib/programs";
import { isSameSchool, isStudentEnrolledInQuarter, toStudentRosterRecord, type QuarterKey } from "@/lib/studentRoster";
import { newTextbookOrder, validateOrder } from "@/lib/textbookOrders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SETTINGS = "teacher_textbook_order_settings";
async function authorize(request: Request) {
  const teacher = await verifyTeacherRequest(request);
  if (teacher.firebase?.sign_in_provider !== "password" || teacher.role === "student" || teacher.student === true) throw new Error("teacher_auth_required");
  return teacher;
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "teacher_auth_required" || message.startsWith("auth/")) return Response.json({ error: "교사용 로그인이 필요합니다." }, { status: 401 });
  console.error("textbook order setup failed", error);
  return Response.json({ error: "기본배송지와 신청 인원을 불러오지 못했습니다." }, { status: 500 });
}
export async function GET(request: Request) {
  try {
    const teacher = await authorize(request);
    const year = Number(new URL(request.url).searchParams.get("year"));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return Response.json({ error: "신청 연도를 확인해주세요." }, { status: 400 });
    const { db } = getFirebaseAdmin();
    const [settings, contracts, students] = await Promise.all([
      db.collection(SETTINGS).doc(teacher.uid).get(),
      db.collection("teacher_fee_contracts").where("type", "==", "afterschool").get(),
      db.collection("students").get(),
    ]);
    // Defaults are served only through this authenticated route, never bundled in public client code.
    const delivery = settings.data()?.delivery || { ...newTextbookOrder().delivery, recipient: "이화선", phone: "010-8376-2497", address: "경기도 부천시 원미구 역곡로 20번길 13, 상원탑스빌 501호" };
    const schoolNames = [...new Set(contracts.docs.map(d => String(d.data().schoolName || "").trim()).filter(Boolean))];
    const groups = new Map<string, { id: string; school: string; teachingClass: string; counts: Record<string, number> }>();
    for (const doc of students.docs) {
      const raw = doc.data();
      if (getStudentProgramValue(raw.program) !== "byeolkkum_history") continue;
      const student = toStudentRosterRecord(doc.id, raw);
      if (!student.name || !student.school) continue;
      const school = schoolNames.find(name => isSameSchool(name, student.school));
      if (!school) continue;
      const teachingClass = student.teachingClass || "반 미지정";
      const id = `${school}::${teachingClass}`;
      const group = groups.get(id) || { id, school, teachingClass, counts: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 } };
      for (const quarter of ["Q1", "Q2", "Q3", "Q4"] as QuarterKey[]) if (isStudentEnrolledInQuarter(student, quarter, year)) group.counts[quarter]++;
      groups.set(id, group);
    }
    return Response.json({ delivery, year, groups: [...groups.values()].sort((a, b) => a.id.localeCompare(b.id, "ko")) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    const teacher = await authorize(request);
    const raw = await request.json();
    let delivery;
    try { delivery = validateOrder({ ...newTextbookOrder(), delivery: raw.delivery }).delivery; }
    catch { return Response.json({ error: "기본배송지 입력을 확인해주세요." }, { status: 400 }); }
    await getFirebaseAdmin().db.collection(SETTINGS).doc(teacher.uid).set({ delivery });
    return Response.json({ delivery }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
