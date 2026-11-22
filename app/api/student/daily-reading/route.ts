import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  FOLKTALES_ACTIVE_DAYS, FOLKTALES_BY_ID, FOLKTALES_CARDS, FIVE_DAY_REVIEW_ENDS,
  formatKoreanLearningDate, nextKoreanLearningDate,
  normalizeDailyVocabularyAnswer, vocabularyCardsForDay,
  vocabularyCardsForFiveDayReview, type DailyVocabularyCard,
} from "@/lib/dailyReadingVocabulary";
import {
  TREASURE_ACTIVE_DAYS, TREASURE_BY_ID, TREASURE_CARDS,
  treasureCardsForDay, treasureCardsForFiveDayReview,
} from "@/lib/dailyReadingTreasureVocabulary";
import {
  getSunLabStudentSession, readCookieValue, SUNLAB_STUDENT_SESSION_COOKIE,
} from "@/lib/sunLabStudentSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VOCABULARY_BOOKS = {
  folktales: {
    label: "전래동화", activeDays: FOLKTALES_ACTIVE_DAYS, cards: FOLKTALES_CARDS,
    byId: FOLKTALES_BY_ID, cardsForDay: vocabularyCardsForDay,
    cardsForReview: vocabularyCardsForFiveDayReview,
  },
  treasure: {
    label: "보물", activeDays: TREASURE_ACTIVE_DAYS, cards: TREASURE_CARDS,
    byId: TREASURE_BY_ID, cardsForDay: treasureCardsForDay,
    cardsForReview: treasureCardsForFiveDayReview,
  },
} as const;
type BookId = keyof typeof VOCABULARY_BOOKS;
type VocabularyDeck = {
  label: string; activeDays: number[]; cards: DailyVocabularyCard[];
  byId: Map<string, DailyVocabularyCard>;
  cardsForDay: (day: number) => DailyVocabularyCard[];
  cardsForReview: (end: number) => DailyVocabularyCard[];
};
function getBookId(value: unknown): BookId {
  if (value === null || value === undefined || value === "") return "folktales";
  if (value === "folktales" || value === "treasure") return value;
  throw new Error("invalid_book");
}
const SESSIONS = "sunlab_daily_reading_sessions";
const MISSED = "sunlab_daily_reading_missed";
const AWARDS = "sunlab_daily_reading_coin_awards";
type Mode = "day" | "roundup" | "mistakes" | "full" | "full_mistakes";
const BOOK_DAYS = 29;
const GROUP_ENDS = [5, 10, 15, 20, 25] as const;

type Session = {
  studentId: string;
  bookId: string;
  mode: Mode;
  key: string;
  cardIds: string[];
  solvedIds: string[];
  wrongIds: string[];
  currentId: string | null;
  currentMistakes: number;
  completed: boolean;
  everCompleted?: boolean;
};
type MissedEntry = { dueDate: string; lastWrongDate: string };
type MissedQueue = { items: Record<string, MissedEntry>; everWrongIds?: string[] };

function response(body: object, status = 200) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie",
  } });
}
async function loggedInStudent(request: Request) {
  const cookie = readCookieValue(request, SUNLAB_STUDENT_SESSION_COOKIE);
  const session = await getSunLabStudentSession(cookie);
  if (!session?.studentId) throw new Error("login_required");
  const { db } = getFirebaseAdmin();
  const student = await db.collection("students").doc(session.studentId).get();
  const data = student.data() || {};
  if (!student.exists || data.isActive === false || data.enrollmentStatus === "ended" ||
      data.sunLabMember !== true) throw new Error("login_required");
  return { id: session.studentId, name: session.name };
}
function activityKey(mode: Mode, day: number, today: string) {
  return mode === "mistakes" ? "mistakes_" + String(day).padStart(2, "0") + "_" + today :
    mode + "_" + String(day).padStart(2, "0");
}
function sessionDoc(studentId: string, key: string, bookId: BookId) {
  return studentId + "_" + bookId + "_" + key;
}
function missedDoc(studentId: string, bookId: BookId) {
  return studentId + "_" + bookId;
}
function getMode(input: string): Mode {
  if (input === "day" || input === "roundup" || input === "mistakes" || input === "full" || input === "full_mistakes") return input;
  throw new Error("invalid_mode");
}
function getDay(mode: Mode, input: unknown, deck: VocabularyDeck) {
  const day = Number(input);
  if (!Number.isInteger(day)) throw new Error("invalid_day");
  if (mode === "day" && deck.activeDays.includes(day)) return day;
  if (mode === "roundup" && FIVE_DAY_REVIEW_ENDS.some(end => end === day)) return day;
  if (mode === "mistakes" && GROUP_ENDS.some(end => end === day)) return day;
  if ((mode === "full" || mode === "full_mistakes") && day === 30) return day;
  throw new Error("invalid_day");
}
function queueEntries(queue: MissedQueue | undefined): Record<string, MissedEntry> {
  return queue?.items && typeof queue.items === "object" && !Array.isArray(queue.items)
    ? queue.items : {};
}
function wasCompleted(session: Session | undefined): boolean {
  return session?.completed === true || session?.everCompleted === true;
}
function dueCardIds(queue: MissedQueue | undefined, today: string, deck: VocabularyDeck): string[] {
  return Object.entries(queueEntries(queue))
    .filter(([id, item]) => deck.byId.has(id) && item &&
      typeof item.dueDate === "string" && item.dueDate <= today)
    .map(([id]) => id);
}
function assignedIds(
  mode: Mode, day: number, queue: MissedQueue | undefined,
  today: string, deck: VocabularyDeck
) {
  if (mode === "day") return deck.cardsForDay(day).map(card => card.id);
  if (mode === "roundup") return deck.cardsForReview(day).map(card => card.id);
  if (mode === "mistakes") {
    const due = dueCardIds(queue, today, deck).filter(id => {
      const word = deck.byId.get(id);
      return word && word.day > day - 5 && word.day <= day;
    });
    if (due.length) return due;
    // 오답연습 완료 후에도 같은 구간의 이전 오답 카드로 재연습 가능
    return Array.from(new Set(queue?.everWrongIds || []))
      .filter(id => { const word = deck.byId.get(id);
        return word && word.day > day - 5 && word.day <= day; });
  }
  if (mode === "full") return deck.cards.map(card => card.id);
  return Array.from(new Set(queue?.everWrongIds || Object.keys(queueEntries(queue))))
    .filter(id => deck.byId.has(id));
}
function toPublic(session: Session | null, deck: VocabularyDeck) {
  if (!session) return null;
  const solved = Array.isArray(session.solvedIds) ? session.solvedIds : [];
  const wrong = Array.isArray(session.wrongIds) ? session.wrongIds : [];
  const current = session.currentId ? deck.byId.get(session.currentId) : undefined;
  return {
    started: true,
    total: session.cardIds.length,
    solved: solved.length,
    wrong: wrong.length,
    remaining: session.cardIds.filter(id => !solved.includes(id)),
    currentId: current?.id || null,
    clue: current?.clue || null,
    currentMistakes: current ? Number(session.currentMistakes || 0) : 0,
    completed: session.completed === true,
    everCompleted: wasCompleted(session),
  };
}
function failure(error: unknown) {
  const msg = error instanceof Error ? error.message : "";
  if (msg === "login_required") return response({ error: "SUN LAB에 다시 로그인해 주세요." }, 401);
  if (msg === "not_unlocked") return response({ error: "해당 구간의 일차별 어휘를 먼저 완료해 주세요." }, 409);
  if (msg === "day_locked") return response({ error: "앞선 일차의 어휘 학습을 모두 완료하면 다음 일차가 열려요." }, 409);
  if (msg === "nothing_to_review") return response({ error: "이 구간에 복습할 오답 어휘가 없어요." }, 409);
  if (msg === "not_started") return response({ error: "학습 시작을 먼저 눌러 주세요." }, 409);
  if (msg === "in_progress") return response({ error: "현재 카드를 먼저 풀어 주세요." }, 409);
  if (msg === "already_completed") return response({ error: "다시 도전 버튼을 눌러 주세요." }, 409);
  if (msg === "invalid_action" || msg.startsWith("invalid_")) {
    return response({ error: "학습 정보를 다시 확인해 주세요." }, 400);
  }
  console.error("daily reading vocabulary API:", msg);
  return response({ error: "학습 정보를 불러오지 못했어요. 다시 시도해 주세요." }, 503);
}
function fiveDayUnlocked(end: number, completedDays: Set<number>): boolean {
  return Array.from({ length: 5 }, (_, i) => end - 4 + i).every(day => completedDays.has(day));
}

export async function GET(request: Request) {
  try {
    const student = await loggedInStudent(request);
    const url = new URL(request.url);
    const BOOK = getBookId(url.searchParams.get("bookId"));
    const deck: VocabularyDeck = VOCABULARY_BOOKS[BOOK];
    const mode = getMode(url.searchParams.get("mode") || "day");
    const day = getDay(mode, url.searchParams.get("day") || "1", deck);
    const today = formatKoreanLearningDate(new Date());
    const key = activityKey(mode, day, today);
    const { db } = getFirebaseAdmin();
    const [sessions, missed, selected] = await Promise.all([
      db.collection(SESSIONS).where("studentId", "==", student.id).get(),
      db.collection(MISSED).doc(missedDoc(student.id, BOOK)).get(),
      db.collection(SESSIONS).doc(sessionDoc(student.id, key, BOOK)).get(),
    ]);
    const saved = new Map<string, Session>();
    for (const doc of sessions.docs) {
      const data = doc.data() as Session;
      if (data.bookId === BOOK && typeof data.key === "string") saved.set(data.key, data);
    }
    const completedDays = new Set(deck.activeDays.filter(day => wasCompleted(saved.get(activityKey("day", day, today)))));
    const queue = missed.exists ? missed.data() as MissedQueue : undefined;
    const due = dueCardIds(queue, today, deck);
    const fullUnlocked = deck.activeDays.length === BOOK_DAYS &&
      Array.from({ length: BOOK_DAYS }, (_, i) => i + 1).every(day => completedDays.has(day));
    const everWrong = Array.from(new Set(queue?.everWrongIds || Object.keys(queueEntries(queue))))
      .filter(id => deck.byId.has(id));
    return response({
      name: student.name, bookId: BOOK, today,
      days: deck.activeDays.map(day => ({
        day, count: deck.cardsForDay(day).length,
        started: saved.has(activityKey("day", day, today)),
        completed: completedDays.has(day),
        // 총복습·오답연습 완료는 다음 일차 잠금 해제 조건에 포함하지 않습니다.
        unlocked: deck.activeDays.every(previousDay =>
          previousDay >= day || completedDays.has(previousDay)),
      })),
      roundups: FIVE_DAY_REVIEW_ENDS.map(end => ({
        end, from: end - 4, count: deck.cardsForReview(end).length,
        unlocked: fiveDayUnlocked(end, completedDays),
        started: saved.has(activityKey("roundup", end, today)),
        completed: wasCompleted(saved.get(activityKey("roundup", end, today))),
      })),
      mistakes: GROUP_ENDS.map(end => {
        const groupDue = due.filter(id => {
          const word = deck.byId.get(id);
          return word && word.day >= end - 4 && word.day <= end;
        });
        const session = saved.get(activityKey("mistakes", end, today));
        const completedEver = [...saved.values()].some(item =>
          item.mode === "mistakes" &&
          item.key.startsWith("mistakes_" + String(end).padStart(2, "0") + "_") &&
          wasCompleted(item));
        return { end, from: end - 4, due: groupDue.length,
          started: Boolean(session), completed: completedEver };
      
      }),
      fullReview: { unlocked: fullUnlocked, count: deck.cards.length,
        started: saved.has(activityKey("full", 30, today)),
        completed: wasCompleted(saved.get(activityKey("full", 30, today))) },
      fullMistakes: { unlocked: fullUnlocked && everWrong.length > 0, count: everWrong.length,
        started: saved.has(activityKey("full_mistakes", 30, today)),
        completed: wasCompleted(saved.get(activityKey("full_mistakes", 30, today))) },
      session: toPublic(selected.exists ? selected.data() as Session : null, deck),
    });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new Error("invalid_origin");
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("invalid_body");
    const student = await loggedInStudent(request);
    const body = await request.json().catch(() => ({}));
    const BOOK = getBookId(body.bookId);
    const deck: VocabularyDeck = VOCABULARY_BOOKS[BOOK];
    const mode = getMode(String(body.mode || ""));
    const day = getDay(mode, body.day, deck);
    const action = String(body.action || "");
    if (!["start", "restart", "draw", "answer"].includes(action)) throw new Error("invalid_action");
    const today = formatKoreanLearningDate(new Date());
    const key = activityKey(mode, day, today);
    const { db } = getFirebaseAdmin();
    const ref = db.collection(SESSIONS).doc(sessionDoc(student.id, key, BOOK));
    const queueRef = db.collection(MISSED).doc(missedDoc(student.id, BOOK));
    const result = await db.runTransaction(async tx => {
      // Firestore reads all happen before writes, so competing requests cannot lose updates.
      const [oldSnapshot, queueSnapshot] = await Promise.all([tx.get(ref), tx.get(queueRef)]);
      // 학생 화면의 잠금 버튼을 우회한 직접 요청도 차단합니다.
      // 이전 일차의 정식 완료 기록만 검사하고, 5일 총복습·오답연습은 제외합니다.
      if (mode === "day" && day > 1) {
        const requiredDays = deck.activeDays.filter(previousDay => previousDay < day);
        const requiredRefs = requiredDays.map(previousDay => db.collection(SESSIONS).doc(
          sessionDoc(student.id, activityKey("day", previousDay, today), BOOK)
        ));
        const priorSessions = await Promise.all(requiredRefs.map(previousRef => tx.get(previousRef)));
        if (!priorSessions.every(snapshot =>
          snapshot.exists && wasCompleted(snapshot.data() as Session))) {
          throw new Error("day_locked");
        }
      }
      const queue = queueSnapshot.exists ? queueSnapshot.data() as MissedQueue : undefined;
      const currentQueueItems = queueEntries(queue);
      if (action === "start" || action === "restart") {
        if (oldSnapshot.exists && action === "start") {
          return { progress: toPublic(oldSnapshot.data() as Session, deck) };
        }
        if (oldSnapshot.exists && !(oldSnapshot.data() as Session).completed) throw new Error("in_progress");
        if (!oldSnapshot.exists && action === "restart") throw new Error("not_started");
        if (mode === "roundup" || mode === "full" || mode === "full_mistakes") {
          const dailyDays = mode === "roundup"
            ? Array.from({ length: 5 }, (_, i) => day - 4 + i)
            : Array.from({ length: BOOK_DAYS }, (_, i) => i + 1);
          if (dailyDays.some(num => !deck.activeDays.includes(num))) throw new Error("not_unlocked");
          const dailyRefs = dailyDays.map(num => db.collection(SESSIONS).doc(
            sessionDoc(student.id, activityKey("day", num, today), BOOK)
          ));
          const dailyDocs = await Promise.all(dailyRefs.map(item => tx.get(item)));
          if (!dailyDocs.every(item => item.exists && wasCompleted(item.data() as Session))) {
            throw new Error("not_unlocked");
          }
        }
        const cardIds = assignedIds(mode, day, queue, today, deck);
        // Completed reviews may be replayed; a first attempt requires at least one word.
        if ((mode === "mistakes" || mode === "full_mistakes") && cardIds.length === 0 && !oldSnapshot.exists) throw new Error("nothing_to_review");
        const finalIds = cardIds.length > 0 ? cardIds : oldSnapshot.exists
          ? (oldSnapshot.data() as Session).cardIds : [];
        const fresh: Session = {
          studentId: student.id, bookId: BOOK, mode, key,
          cardIds: finalIds, solvedIds: [], wrongIds: [],
          currentId: null, currentMistakes: 0, completed: false,
          everCompleted: oldSnapshot.exists
            ? wasCompleted(oldSnapshot.data() as Session) : false,
        };
        tx.set(ref, {
          ...fresh, startedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { progress: toPublic(fresh, deck) };
      }

      if (!oldSnapshot.exists) throw new Error("not_started");
      const progress = oldSnapshot.data() as Session;
      if (progress.completed) throw new Error("already_completed");
      if (action === "draw") {
        if (progress.currentId) throw new Error("in_progress");
        const cardId = String(body.cardId || "");
        if (!progress.cardIds.includes(cardId) || progress.solvedIds.includes(cardId) ||
            !deck.byId.has(cardId)) throw new Error("invalid_card");
        const next = { ...progress, currentId: cardId, currentMistakes: 0 };
        tx.update(ref, {
          currentId: cardId, currentMistakes: 0,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { progress: toPublic(next, deck) };
      }
      if (action !== "answer" || !progress.currentId) throw new Error("invalid_card");
      const word = deck.byId.get(progress.currentId);
      if (!word || !progress.cardIds.includes(word.id)) throw new Error("invalid_card");
      const answer = String(body.answer || "").trim();
      if (!answer || answer.length > 80) throw new Error("invalid_answer");
      const correct = normalizeDailyVocabularyAnswer(answer) ===
        normalizeDailyVocabularyAnswer(word.answer);

      if (!correct) {
        const wrongIds = progress.wrongIds.includes(word.id)
          ? progress.wrongIds : [...progress.wrongIds, word.id];
        const attemptMistakes = Math.max(0, Number(progress.currentMistakes || 0)) + 1;
        const returned = attemptMistakes >= 3;
        const updated = {
          ...progress, wrongIds, currentId: returned ? null : progress.currentId,
          currentMistakes: returned ? 0 : attemptMistakes,
        };
        // 한 번이라도 틀린 단어는 그날 나중에 맞혀도 다음날 복습에 남습니다.
        const nextDate = nextKoreanLearningDate(today);
        tx.set(queueRef, {
          studentId: student.id, bookId: BOOK,
          items: {
            ...currentQueueItems,
            [word.id]: { dueDate: nextDate, lastWrongDate: today },
          },
          everWrongIds: Array.from(new Set([...(queue?.everWrongIds || Object.keys(currentQueueItems)), word.id])),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.update(ref, {
          wrongIds, currentId: updated.currentId,
          currentMistakes: updated.currentMistakes,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { correct: false, returned, progress: toPublic(updated, deck) };
      }

      const solvedIds = [...progress.solvedIds, word.id];
      const completed = solvedIds.length === progress.cardIds.length;
      const next = { ...progress, solvedIds, currentId: null,
        currentMistakes: 0, completed,
        everCompleted: wasCompleted(progress) || completed };
      // 완료 시 동코인 지급은 학생별·교재별·활동별 최초 1회만 허용합니다.
      // 완료 도장 상태와 지급 기록, 잔액은 같은 트랜잭션으로 저장합니다.
      const reward = mode === "day" ? 1 : 2;
      const studentRef = db.collection("students").doc(student.id);
      const awardRef = db.collection(AWARDS).doc(
        student.id + "_" + BOOK + "_" + mode + "_" + String(day).padStart(2, "0")
      );
      const [awardSnapshot, studentSnapshot] = completed
        ? await Promise.all([tx.get(awardRef), tx.get(studentRef)])
        : [null, null];
      const shouldAward = completed && !wasCompleted(progress) && !awardSnapshot?.exists;
      if (shouldAward && !studentSnapshot?.exists) throw new Error("login_required");

      const pending = currentQueueItems[word.id];
      // 해당 구간의 오답연습에서 지난날의 오답을 맞혀야 복습 대기에서 제거합니다.
      // 단, 오늘 틀렸던 단어는 오늘 다시 맞혀도 내일 한 번 더 복습합니다.
      if (mode === "mistakes" && pending && pending.dueDate <= today && pending.lastWrongDate !== today) {
        const entries = { ...currentQueueItems };
        delete entries[word.id];
        tx.set(queueRef, {
          studentId: student.id, bookId: BOOK,
          items: entries,
          everWrongIds: queue?.everWrongIds || Object.keys(currentQueueItems),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      if (shouldAward && studentSnapshot) {
        const wallet = studentSnapshot.data() || {};
        const bronzeBefore = Math.max(0, Number(wallet.bronze || 0));
        const silverBefore = Math.max(0, Number(wallet.silver || 0));
        const exchanged = Math.floor((bronzeBefore + reward) / 10);
        const bronze = (bronzeBefore + reward) % 10;
        const now = new Date();
        const name = mode === "day" ? day + "일차 어휘" :
          mode === "roundup" ? (day - 4) + "~" + day + "일 총복습" :
          mode === "mistakes" ? (day - 4) + "~" + day + "일 오답연습" :
          mode === "full" ? "30일 전체복습" : "30일 전체 오답복습";
        const history = Array.isArray(wallet.coinHistory) ? wallet.coinHistory : [];
        const entries: Record<string, unknown>[] = [{
          id: "daily-reading-" + awardRef.id,
          date: today, createdAt: now, type: "earn", currency: "bronze", amount: reward,
          source: "quiz", sourceDetail: "daily_reading_" + BOOK,
          text: "1일 1독해 " + deck.label + " · " + name + " 완료 · 동엽전 " + reward + "개",
        }];
        if (exchanged > 0) entries.push({
          id: "daily-reading-exchange-" + awardRef.id,
          date: today, createdAt: now, type: "exchange",
          fromCurrency: "bronze", fromAmount: exchanged * 10,
          toCurrency: "silver", toAmount: exchanged,
          text: "동엽전 " + exchanged * 10 + "개를 은엽전 " + exchanged + "개로 자동 교환",
        });
        tx.create(awardRef, {
          studentId: student.id, bookId: BOOK, mode, day, reward,
          date: today, completedAt: FieldValue.serverTimestamp(),
        });
        tx.update(studentRef, {
          bronze, silver: silverBefore + exchanged,
          totalBronze: Math.max(0, Number(wallet.totalBronze || 0)) + reward,
          totalSilver: Math.max(0, Number(wallet.totalSilver || 0)) + exchanged,
          coinHistory: [...history, ...entries].slice(-100),
        });
      }
      tx.update(ref, {
        solvedIds, currentId: null, currentMistakes: 0, completed,
        everCompleted: next.everCompleted,
        updatedAt: FieldValue.serverTimestamp(),
        ...(completed ? { completedAt: FieldValue.serverTimestamp() } : {}),
      });
      return { correct: true, progress: toPublic(next, deck), awardedCoins: shouldAward ? reward : 0 };
    });
    return response({ ok: true, ...result });
  } catch (error) { return failure(error); }
}
