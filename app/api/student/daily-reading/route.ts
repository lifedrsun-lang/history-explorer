import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  FOLKTALES_ACTIVE_DAYS, FOLKTALES_BY_ID, FIVE_DAY_REVIEW_ENDS,
  formatKoreanLearningDate, nextKoreanLearningDate,
  normalizeDailyVocabularyAnswer, vocabularyCardsForDay,
  vocabularyCardsForFiveDayReview,
} from "@/lib/dailyReadingVocabulary";
import {
  getSunLabStudentSession, readCookieValue, SUNLAB_STUDENT_SESSION_COOKIE,
} from "@/lib/sunLabStudentSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOOK = "folktales";
const SESSIONS = "sunlab_daily_reading_sessions";
const MISSED = "sunlab_daily_reading_missed";
type Mode = "day" | "roundup" | "mistakes";

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
};
type MissedEntry = { dueDate: string; lastWrongDate: string };
type MissedQueue = { items: Record<string, MissedEntry> };

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
  return mode === "mistakes" ? "mistakes_" + today :
    mode + "_" + String(day).padStart(2, "0");
}
function sessionDoc(studentId: string, key: string) {
  return studentId + "_" + BOOK + "_" + key;
}
function missedDoc(studentId: string) {
  return studentId + "_" + BOOK;
}
function getMode(input: string): Mode {
  if (input === "day" || input === "roundup" || input === "mistakes") return input;
  throw new Error("invalid_mode");
}
function getDay(mode: Mode, input: unknown) {
  if (mode === "mistakes") return 0;
  const day = Number(input);
  if (!Number.isInteger(day)) throw new Error("invalid_day");
  if (mode === "day" && FOLKTALES_ACTIVE_DAYS.includes(day)) return day;
  if (mode === "roundup" && FIVE_DAY_REVIEW_ENDS.some(end => end === day)) return day;
  throw new Error("invalid_day");
}
function queueEntries(queue: MissedQueue | undefined): Record<string, MissedEntry> {
  return queue?.items && typeof queue.items === "object" && !Array.isArray(queue.items)
    ? queue.items : {};
}
function dueCardIds(queue: MissedQueue | undefined, today: string): string[] {
  return Object.entries(queueEntries(queue))
    .filter(([id, item]) => FOLKTALES_BY_ID.has(id) && item &&
      typeof item.dueDate === "string" && item.dueDate <= today)
    .map(([id]) => id);
}
function assignedIds(mode: Mode, day: number, queue: MissedQueue | undefined, today: string) {
  if (mode === "day") return vocabularyCardsForDay(day).map(card => card.id);
  if (mode === "roundup") return vocabularyCardsForFiveDayReview(day).map(card => card.id);
  return dueCardIds(queue, today);
}
function toPublic(session: Session | null) {
  if (!session) return null;
  const solved = Array.isArray(session.solvedIds) ? session.solvedIds : [];
  const wrong = Array.isArray(session.wrongIds) ? session.wrongIds : [];
  const current = session.currentId ? FOLKTALES_BY_ID.get(session.currentId) : undefined;
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
  };
}
function failure(error: unknown) {
  const msg = error instanceof Error ? error.message : "";
  if (msg === "login_required") return response({ error: "SUN LAB에 다시 로그인해 주세요." }, 401);
  if (msg === "not_unlocked") return response({ error: "해당 5일치의 어휘 학습을 먼저 완료해 주세요." }, 409);
  if (msg === "nothing_to_review") return response({ error: "오늘 복습할 오답 어휘가 없어요." }, 409);
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
    const mode = getMode(url.searchParams.get("mode") || "day");
    const day = getDay(mode, url.searchParams.get("day") || "1");
    const today = formatKoreanLearningDate(new Date());
    const key = activityKey(mode, day, today);
    const { db } = getFirebaseAdmin();
    const [sessions, missed, selected] = await Promise.all([
      db.collection(SESSIONS).where("studentId", "==", student.id).get(),
      db.collection(MISSED).doc(missedDoc(student.id)).get(),
      db.collection(SESSIONS).doc(sessionDoc(student.id, key)).get(),
    ]);
    const saved = new Map<string, Session>();
    for (const doc of sessions.docs) {
      const data = doc.data() as Session;
      if (data.bookId === BOOK && typeof data.key === "string") saved.set(data.key, data);
    }
    const completedDays = new Set(FOLKTALES_ACTIVE_DAYS.filter(day => saved.get(activityKey("day", day, today))?.completed));
    const queue = missed.exists ? missed.data() as MissedQueue : undefined;
    const due = dueCardIds(queue, today);
    const mistakeSession = saved.get(activityKey("mistakes", 0, today));
    return response({
      name: student.name, bookId: BOOK, today,
      days: FOLKTALES_ACTIVE_DAYS.map(day => ({
        day, count: vocabularyCardsForDay(day).length,
        started: saved.has(activityKey("day", day, today)),
        completed: completedDays.has(day),
      })),
      roundups: FIVE_DAY_REVIEW_ENDS.map(end => ({
        end, from: end - 4, count: vocabularyCardsForFiveDayReview(end).length,
        unlocked: fiveDayUnlocked(end, completedDays),
        started: saved.has(activityKey("roundup", end, today)),
        completed: saved.get(activityKey("roundup", end, today))?.completed === true,
      })),
      mistakes: {
        due: due.length,
        started: Boolean(mistakeSession),
        completed: mistakeSession?.completed === true,
      },
      session: toPublic(selected.exists ? selected.data() as Session : null),
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
    const mode = getMode(String(body.mode || ""));
    const day = getDay(mode, body.day);
    const action = String(body.action || "");
    if (!["start", "restart", "draw", "answer"].includes(action)) throw new Error("invalid_action");
    const today = formatKoreanLearningDate(new Date());
    const key = activityKey(mode, day, today);
    const { db } = getFirebaseAdmin();
    const ref = db.collection(SESSIONS).doc(sessionDoc(student.id, key));
    const queueRef = db.collection(MISSED).doc(missedDoc(student.id));
    const result = await db.runTransaction(async tx => {
      // Firestore reads all happen before writes, so competing requests cannot lose updates.
      const [oldSnapshot, queueSnapshot] = await Promise.all([tx.get(ref), tx.get(queueRef)]);
      const queue = queueSnapshot.exists ? queueSnapshot.data() as MissedQueue : undefined;
      const currentQueueItems = queueEntries(queue);
      if (action === "start" || action === "restart") {
        if (oldSnapshot.exists && action === "start") {
          return { progress: toPublic(oldSnapshot.data() as Session) };
        }
        if (oldSnapshot.exists && !(oldSnapshot.data() as Session).completed) throw new Error("in_progress");
        if (!oldSnapshot.exists && action === "restart") throw new Error("not_started");
        if (mode === "roundup") {
          const dailyRefs = Array.from({ length: 5 }, (_, i) => db.collection(SESSIONS).doc(
            sessionDoc(student.id, activityKey("day", day - 4 + i, today))
          ));
          const dailyDocs = await Promise.all(dailyRefs.map(item => tx.get(item)));
          if (!dailyDocs.every(item => item.exists && (item.data() as Session).completed === true)) {
            throw new Error("not_unlocked");
          }
        }
        const cardIds = assignedIds(mode, day, queue, today);
        // Completing the daily mistake review does not erase its history if replayed later.
        if (mode === "mistakes" && cardIds.length === 0 && !oldSnapshot.exists) throw new Error("nothing_to_review");
        const finalIds = cardIds.length > 0 ? cardIds : oldSnapshot.exists
          ? (oldSnapshot.data() as Session).cardIds : [];
        const fresh: Session = {
          studentId: student.id, bookId: BOOK, mode, key,
          cardIds: finalIds, solvedIds: [], wrongIds: [],
          currentId: null, currentMistakes: 0, completed: false,
        };
        tx.set(ref, {
          ...fresh, startedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { progress: toPublic(fresh) };
      }

      if (!oldSnapshot.exists) throw new Error("not_started");
      const progress = oldSnapshot.data() as Session;
      if (progress.completed) throw new Error("already_completed");
      if (action === "draw") {
        if (progress.currentId) throw new Error("in_progress");
        const cardId = String(body.cardId || "");
        if (!progress.cardIds.includes(cardId) || progress.solvedIds.includes(cardId) ||
            !FOLKTALES_BY_ID.has(cardId)) throw new Error("invalid_card");
        const next = { ...progress, currentId: cardId, currentMistakes: 0 };
        tx.update(ref, {
          currentId: cardId, currentMistakes: 0,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { progress: toPublic(next) };
      }
      if (action !== "answer" || !progress.currentId) throw new Error("invalid_card");
      const word = FOLKTALES_BY_ID.get(progress.currentId);
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
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.update(ref, {
          wrongIds, currentId: updated.currentId,
          currentMistakes: updated.currentMistakes,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { correct: false, returned, progress: toPublic(updated) };
      }

      const solvedIds = [...progress.solvedIds, word.id];
      const completed = solvedIds.length === progress.cardIds.length;
      const next = { ...progress, solvedIds, currentId: null,
        currentMistakes: 0, completed };
      const pending = currentQueueItems[word.id];
      // 지난날의 오답을 복습하여 맞히면 복습 대기에서 제거합니다.
      // 단, 오늘 틀렸던 단어는 오늘 다시 맞혀도 내일 한 번 더 복습합니다.
      if (pending && pending.dueDate <= today && pending.lastWrongDate !== today) {
        const entries = { ...currentQueueItems };
        delete entries[word.id];
        tx.set(queueRef, {
          studentId: student.id, bookId: BOOK,
          items: entries, updatedAt: FieldValue.serverTimestamp(),
        });
      }
      tx.update(ref, {
        solvedIds, currentId: null, currentMistakes: 0, completed,
        updatedAt: FieldValue.serverTimestamp(),
        ...(completed ? { completedAt: FieldValue.serverTimestamp() } : {}),
      });
      return { correct: true, progress: toPublic(next) };
    });
    return response({ ok: true, ...result });
  } catch (error) { return failure(error); }
}
