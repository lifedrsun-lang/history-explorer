import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  authorizeHistoryCards,
  AWARD_COLLECTION,
  cardBody,
  cardBook,
  cardClass,
  cardFailure,
  cardJson,
  cardMode,
  cardSchool,
  HistoryCardError,
  isCardStudent,
  loadCardWeeks,
  wordsForMode,
} from "@/lib/historyCards";

const safeNumber = (value: unknown) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

export async function POST(request: Request) {
  try {
    const teacher = await authorizeHistoryCards(request);
    const input = await cardBody(request);
    const school = cardSchool(input.school);
    const className = cardClass(input.className);
    const bookNumber = cardBook(input.bookNumber);
    const mode = cardMode(input.mode);
    const studentId = String(input.studentId || "");
    const roundId = String(input.roundId || "");
    const baseKeyword = String(input.baseKeyword || "").trim();
    const childKeyword = String(input.childKeyword || "").trim();

    if (!/^[A-Za-z0-9_-]{1,160}$/.test(studentId) ||
        !/^[0-9a-f-]{36}$/i.test(roundId)) {
      throw new HistoryCardError("학생 또는 게임 차례를 확인해 주세요.");
    }
    if (!baseKeyword || !childKeyword) {
      throw new HistoryCardError("사용한 카드 2장을 확인해 주세요.");
    }
    const keywords = wordsForMode(await loadCardWeeks(teacher.uid, bookNumber), mode);
    if (!keywords.includes(baseKeyword) || !keywords.includes(childKeyword)) {
      throw new HistoryCardError("선택한 권수와 주차의 키워드가 아닙니다.");
    }

    const { db } = getFirebaseAdmin();
    const studentRef = db.collection("students").doc(studentId);
    const awardRef = db.collection(AWARD_COLLECTION).doc(roundId);
    const result = await db.runTransaction(async (transaction) => {
      const [awardSnapshot, studentSnapshot] = await Promise.all([
        transaction.get(awardRef),
        transaction.get(studentRef),
      ]);

      if (awardSnapshot.exists) {
        const data = awardSnapshot.data() || {};
        if (data.teacherUid !== teacher.uid ||
            data.studentId !== studentId ||
            data.school !== school.slug ||
            data.className !== className ||
            data.bookNumber !== bookNumber ||
            data.mode !== mode ||
            data.baseKeyword !== baseKeyword ||
            data.childKeyword !== childKeyword) {
          throw new HistoryCardError("이미 다른 지급에 사용된 차례 번호입니다.", 409);
        }
        return { alreadyAwarded: true, bronze: safeNumber(data.bronze), silver: safeNumber(data.silver) };
      }

      if (!studentSnapshot.exists) throw new HistoryCardError("학생을 찾을 수 없습니다.", 404);
      const student = studentSnapshot.data() || {};
      if (!isCardStudent(student, school.slug, className)) {
        throw new HistoryCardError("현재 선택한 학교·반의 수강중 학생이 아닙니다.", 403);
      }

      const beforeBronze = safeNumber(student.bronze);
      const beforeSilver = safeNumber(student.silver);
      const exchanged = Math.floor((beforeBronze + 1) / 10);
      const bronze = (beforeBronze + 1) % 10;
      const silver = beforeSilver + exchanged;
      const now = new Date();
      const date = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");
      const history = Array.isArray(student.coinHistory) ? student.coinHistory : [];
      const items: Record<string, unknown>[] = [
        {
          id: "history-card-" + roundId,
          date,
          createdAt: now,
          type: "earn",
          currency: "bronze",
          amount: 1,
          source: "quiz",
          sourceDetail: "history_cards",
          bookNumber,
          week: mode,
          text: "동엽전 1개 획득 (역사 카드 문장 만들기 · " + bookNumber + "호 · " + mode + "주차)",
        },
      ];
      if (exchanged > 0) {
        items.push({
          id: "history-card-exchange-" + roundId,
          date,
          createdAt: now,
          type: "exchange",
          fromCurrency: "bronze",
          fromAmount: 10 * exchanged,
          toCurrency: "silver",
          toAmount: exchanged,
          text: "동엽전 " + (10 * exchanged) + "개를 은엽전 " + exchanged + "개로 자동 교환",
        });
      }
      transaction.update(studentRef, {
        bronze,
        silver,
        totalBronze: safeNumber(student.totalBronze) + 1,
        totalSilver: safeNumber(student.totalSilver) + exchanged,
        coinHistory: [...history, ...items].slice(-100),
      });
      transaction.create(awardRef, {
        teacherUid: teacher.uid,
        studentId,
        school: school.slug,
        className,
        bookNumber,
        mode,
        baseKeyword,
        childKeyword,
        bronze,
        silver,
        createdAt: now,
      });
      return { alreadyAwarded: false, bronze, silver };
    });

    return cardJson({ ok: true, ...result });
  } catch (error) {
    return cardFailure(error);
  }
}
