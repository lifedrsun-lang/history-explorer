import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { verifyStudentDataTeacherRequest } from "@/lib/studentDataTeacherAuth";
import { getAfterSchoolSchool, matchesAfterSchoolSchool } from "@/lib/afterSchool";
import { getEnrollmentStatus } from "@/lib/studentEnrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const number = (value: unknown) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};
const balances = (data: FirebaseFirestore.DocumentData) => ({
  bronze: number(data.bronze),
  silver: number(data.silver),
  totalBronze: number(data.totalBronze),
  totalSilver: number(data.totalSilver),
});
const sources: Record<string, string> = { bonus: "선생님 보너스", homework: "과제", quiz: "퀴즈" };
const validId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 150 && !value.includes("/") && value !== "." && value !== "..";

export async function POST(request: Request) {
  let teacher;
  try { teacher = await verifyStudentDataTeacherRequest(request); }
  catch { return json({ error: "teacher_forbidden" }, 403); }
  try {
    const body = await request.json().catch(() => null);
    const school = getAfterSchoolSchool(typeof body?.slug === "string" ? body.slug : "");
    if (!school) return json({ error: "invalid_input" }, 400);
    const { db } = getFirebaseAdmin();
    const students = db.collection("students");
    if (body.action === "list") {
      const snapshot = await students.get();
      return json({ students: snapshot.docs.filter(item => {
        const d = item.data();
        return matchesAfterSchoolSchool(d.school, school) && getEnrollmentStatus(d) === "active";
      }).map(item => {
        const d = item.data();
        return { id: item.id, name: String(d.name || ""), school: String(d.school || ""), grade: d.grade || "", class: d.class || "", studentNumber: d.studentNumber || "", teachingClass: d.teachingClass || "", enrollmentStatus: getEnrollmentStatus(d), isActive: d.isActive !== false, ...balances(d) };
      }) });
    }
    if (!validId(body.studentId)) return json({ error: "invalid_input" }, 400);
    const ref = students.doc(body.studentId);
    // Private, server-managed latest undo receipt. No balance or history supplied by the browser is trusted.
    const receiptRef = ref.collection("serverCoinUndo").doc("latest");
    if (body.action === "award") {
      if (typeof body.source !== "string" || !Object.prototype.hasOwnProperty.call(sources, body.source)) return json({ error: "invalid_input" }, 400);
      const source = body.source as string, sourceLabel = sources[source];
      const receiptId = randomUUID();
      const createdAt = Timestamp.now();
      const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const receipt = await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error("student_not_found");
        const current = snap.data()!;
        if (!matchesAfterSchoolSchool(current.school, school)) throw new Error("school_mismatch");
        if (getEnrollmentStatus(current) !== "active") throw new Error("inactive_student");
        const before = balances(current);
        const coinHistory = Array.isArray(current.coinHistory) ? current.coinHistory : [];
        const exchangeCount = Math.floor((before.bronze + 1) / 10);
        const after = { bronze: (before.bronze + 1) % 10, silver: before.silver + exchangeCount, totalBronze: before.totalBronze + 1, totalSilver: before.totalSilver + exchangeCount };
        const historyItems: Record<string, unknown>[] = [{ id: randomUUID(), date, createdAt, type: "earn", currency: "bronze", amount: 1, source, text: "동엽전 1개 획득 (" + sourceLabel + ")" }];
        if (exchangeCount > 0) historyItems.push({ id: randomUUID(), date, createdAt, type: "exchange", fromCurrency: "bronze", fromAmount: 10 * exchangeCount, toCurrency: "silver", toAmount: exchangeCount, text: "동엽전 " + (10 * exchangeCount) + "개를 은엽전 " + exchangeCount + "개로 자동 교환" });
        const historyIds = historyItems.map(item => String(item.id));
        tx.update(ref, { ...after, coinHistory: [...coinHistory, ...historyItems].slice(-100), studentDataUpdatedBy: teacher.uid, studentDataUpdatedAt: createdAt });
        tx.set(receiptRef, { receiptId, teacherUid: teacher.uid, slug: school.slug, before, after, coinHistory, historyIds, createdAt });
        return { receiptId, studentId: snap.id, studentName: String(current.name || "학생"), source, sourceLabel, before, after };
      });
      return json({ receipt });
    }
    if (body.action === "undo") {
      if (!validId(body.receiptId)) return json({ error: "invalid_input" }, 400);
      await db.runTransaction(async tx => {
        const [snap, receiptSnap] = await Promise.all([tx.get(ref), tx.get(receiptRef)]);
        const current = snap.data(), receipt = receiptSnap.data();
        if (!current || !receipt || receipt.receiptId !== body.receiptId || receipt.teacherUid !== teacher.uid || receipt.slug !== school.slug || !matchesAfterSchoolSchool(current.school, school)) throw new Error("unsafe_undo");
        const history = Array.isArray(current.coinHistory) ? current.coinHistory : [];
        const ids = receipt.historyIds;
        if (!Array.isArray(ids) || ids.length < 1 || ids.length > 2 || !Array.isArray(receipt.coinHistory)) throw new Error("unsafe_undo");
        const tail = history.slice(-ids.length);
        const currentBalances = balances(current);
        if (!ids.every((id, index) => String(tail[index]?.id || "") === id) ||
          !Object.entries(currentBalances).every(([key, value]) => value === receipt.after?.[key])) throw new Error("unsafe_undo");
        tx.update(ref, { ...receipt.before, coinHistory: receipt.coinHistory, studentDataUpdatedBy: teacher.uid, studentDataUpdatedAt: Timestamp.now() });
        tx.delete(receiptRef);
      });
      return json({ ok: true });
    }
    return json({ error: "invalid_input" }, 400);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["student_not_found", "school_mismatch", "inactive_student", "unsafe_undo"].includes(code)) return json({ error: code }, 409);
    return json({ error: "coin_request_failed" }, 500);
  }
}
