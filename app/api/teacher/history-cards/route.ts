import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  authorizeHistoryCards,
  blankCardWeeks,
  cardBody,
  cardBook,
  cardClass,
  cardFailure,
  cardJson,
  cardSchool,
  cardWeek,
  cardWords,
  cardDeckId,
  CARD_COLLECTION,
  FieldValue,
  isCardStudent,
  loadCardWeeks,
} from "@/lib/historyCards";

export async function GET(request: Request) {
  try {
    const teacher = await authorizeHistoryCards(request);
    const url = new URL(request.url);
    const bookNumber = cardBook(url.searchParams.get("book"));
    const school = cardSchool(url.searchParams.get("school"));
    const className = cardClass(url.searchParams.get("class"));
    const { db } = getFirebaseAdmin();
    const [weeks, snapshot] = await Promise.all([
      loadCardWeeks(teacher.uid, bookNumber),
      db.collection("students").get(),
    ]);
    const students = snapshot.docs
      .filter((student) => isCardStudent(student.data(), school.slug, className))
      .map((student) => ({
        id: student.id,
        name: String(student.data().name || "").trim(),
        grade: String(student.data().grade || "").trim(),
        schoolClass: String(student.data().class || "").trim(),
        studentNumber: String(student.data().studentNumber || "").trim(),
        bronze: Math.max(0, Number(student.data().bronze || 0)),
        silver: Math.max(0, Number(student.data().silver || 0)),
      }))
      .sort((a, b) =>
        Number(a.grade) - Number(b.grade) ||
        Number(a.schoolClass) - Number(b.schoolClass) ||
        Number(a.studentNumber) - Number(b.studentNumber) ||
        a.name.localeCompare(b.name, "ko-KR")
      );
    return cardJson({ bookNumber, weeks, students });
  } catch (error) {
    return cardFailure(error);
  }
}

export async function PUT(request: Request) {
  try {
    const teacher = await authorizeHistoryCards(request);
    const body = await cardBody(request);
    const bookNumber = cardBook(body.bookNumber);
    const week = cardWeek(body.week);
    const keywords = cardWords(body.keywords);
    const { db } = getFirebaseAdmin();
    await db.collection(CARD_COLLECTION).doc(cardDeckId(teacher.uid, bookNumber)).set({
      schemaVersion: 1,
      bookNumber,
      weeks: { [String(week)]: keywords },
      updatedBy: teacher.uid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return cardJson({ ok: true, bookNumber, week, keywords });
  } catch (error) {
    return cardFailure(error);
  }
}
