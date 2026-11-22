import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  literacyCoinReward, literacyDeckKey, literacyLevel, literacySeedDeck, literacyWeek,
  normalizeLiteracyAnswer, validateLiteracyCards, type LiteracyCard, type LiteracyLevel,
} from "@/lib/literacy";
import {
  getSunLabStudentSession, readCookieValue, SUNLAB_STUDENT_SESSION_COOKIE,
} from "@/lib/sunLabStudentSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ASSIGNMENTS = "sunlab_literacy_assignments";
const DECKS = "sunlab_literacy_decks";
const PROGRESS = "sunlab_literacy_progress";
const QUESTIONS_PER_ATTEMPT = 7;
const MAX_SWAPS_PER_ATTEMPT = 2;

type SavedProgress = {
  studentId: string; level: LiteracyLevel; week: number;
  cards: LiteracyCard[];
  solvedIds: string[]; wrongIds: string[]; skippedIds: string[];
  swapsUsed: number; currentId: string | null; currentMistakes?: number; completed: boolean; reward: number;
  attemptNumber: number; firstRewardDecided: boolean; firstReward: number;
};

function respond(body: object, status = 200) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie",
  } });
}

async function getStudent(request: Request) {
  const id = readCookieValue(request, SUNLAB_STUDENT_SESSION_COOKIE);
  const session = await getSunLabStudentSession(id);
  if (!session) throw new Error("login_required");
  const { db } = getFirebaseAdmin();
  const student = await db.collection("students").doc(session.studentId).get();
  const data = student.data() || {};
  if (!student.exists || data.isActive === false || data.enrollmentStatus === "ended" ||
      (data.sunLabMember !== true && data.program !== "sun_lab")) {
    throw new Error("login_required");
  }
  const assignment = await db.collection(ASSIGNMENTS).doc(session.studentId).get();
  const rawLevel = assignment.data()?.level;
  const level = typeof rawLevel === "string" && /^K(?:[1-9]|1[0-2])$/.test(rawLevel)
    ? literacyLevel(rawLevel) : null;
  return { studentId: session.studentId, name: session.name, level };
}

async function deckFor(level: LiteracyLevel, week: number) {
  const { db } = getFirebaseAdmin();
  const item = await db.collection(DECKS).doc(literacyDeckKey(level, week)).get();
  if (!item.exists) return literacySeedDeck(level, week);
  const data = item.data() || {};
  return { level, week, published: data.published === true, cards: validateLiteracyCards(data.cards || []) };
}

function availableIds(value: SavedProgress) {
  const solvedIds = Array.isArray(value.solvedIds) ? value.solvedIds : [];
  const skippedIds = Array.isArray(value.skippedIds) ? value.skippedIds : [];
  return value.cards.filter(item => !solvedIds.includes(item.id) && !skippedIds.includes(item.id))
    .map(item => item.id);
}

function progressPublic(value: SavedProgress | null) {
  if (!value) return null;
  const solvedIds = Array.isArray(value.solvedIds) ? value.solvedIds : [];
  const wrongIds = Array.isArray(value.wrongIds) ? value.wrongIds : [];
  const current = value.cards.find(item => item.id === value.currentId);
  return {
    started: true,
    total: QUESTIONS_PER_ATTEMPT,
    solved: Math.min(QUESTIONS_PER_ATTEMPT, solvedIds.length),
    wrong: wrongIds.length,
    remaining: availableIds(value),
    selectedId: current?.id || null,
    currentMistakes: current ? Math.min(3, Math.max(0, Number(value.currentMistakes || 0))) : 0,
    clue: current?.clue || null,
    kind: current?.kind || null,
    swapsUsed: Number(value.swapsUsed || 0),
    swapsAvailable: MAX_SWAPS_PER_ATTEMPT - Number(value.swapsUsed || 0),
    attemptNumber: Number(value.attemptNumber || 1),
    completed: value.completed === true,
    reward: Number(value.reward || 0),
    firstRewardDecided: value.firstRewardDecided === true || (value.completed === true && value.firstRewardDecided !== false),
  };
}
function progressDoc(studentId: string, level: LiteracyLevel, week: number) {
  return studentId + "_" + literacyDeckKey(level, week);
}
async function status(studentId: string, level: LiteracyLevel, week: number) {
  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection(PROGRESS).doc(progressDoc(studentId, level, week)).get();
  return progressPublic(snapshot.exists ? snapshot.data() as SavedProgress : null);
}

function newAttempt(studentId: string, level: LiteracyLevel, week: number,
  cards: LiteracyCard[], previous?: SavedProgress): SavedProgress {
  // 재도전은 진행 상태만 초기화하며 이전 최초 완료 보상 여부는 지우지 않습니다.
  const firstRewardDecided = previous
    ? (typeof previous.firstRewardDecided === "boolean"
      ? previous.firstRewardDecided
      : previous.completed === true)
    : false;
  return {
    studentId, level, week, cards, solvedIds: [], wrongIds: [], skippedIds: [],
    swapsUsed: 0, currentId: null, currentMistakes: 0, completed: false, reward: 0,
    attemptNumber: previous ? Number(previous.attemptNumber || 1) + 1 : 1,
    firstRewardDecided,
    firstReward: previous ? Number(previous.firstReward ?? previous.reward ?? 0) : 0,
  };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "login_required") return respond({ error: "SUN LAB에 다시 로그인해 주세요." }, 401);
  if (message === "level_required") return respond({ error: "선생님이 문해력 레벨을 지정하면 이용할 수 있어요." }, 403);
  if (message === "week_locked") return respond({ error: "아직 공개되지 않은 리딩코어북입니다." }, 403);
  if (message === "not_started") return respond({ error: "게임 시작을 먼저 눌러 주세요." }, 409);
  if (message === "in_progress") return respond({ error: "현재 선택한 단어를 먼저 풀거나 바꿔 주세요." }, 409);
  if (message === "already_completed") return respond({ error: "다시 도전 버튼을 눌러 주세요." }, 409);
  if (message === "no_swaps") return respond({ error: "이번 도전에서 바꾸기를 모두 사용했어요." }, 409);
  if (message === "not_enough_cards") return respond({ error: "바꿀 수 있는 카드가 부족해요." }, 409);
  if (message === "invalid_action" || message.startsWith("invalid_")) {
    return respond({ error: "학습 정보를 다시 확인해 주세요." }, 400);
  }
  console.error("literacy student API:", message);
  return respond({ error: "학습을 저장하지 못했어요. 다시 시도해 주세요." }, 503);
}

export async function GET(request: Request) {
  try {
    const student = await getStudent(request);
    if (!student.level) return respond({ name: student.name, level: null, weeks: [], progress: null });
    const { db } = getFirebaseAdmin();
    const list = await db.collection(DECKS).get();
    const published: number[] = [];
    for (let w = 1; w <= 24; w++) {
      const override = list.docs.find(item => item.id === literacyDeckKey(student.level!, w));
      if (override) {
        if (override.data().published === true &&
            Array.isArray(override.data().cards) && override.data().cards.length >= QUESTIONS_PER_ATTEMPT) {
          published.push(w);
        }
      } else if (literacySeedDeck(student.level, w).cards.length >= QUESTIONS_PER_ATTEMPT &&
        literacySeedDeck(student.level, w).published) published.push(w);
    }
    const input = new URL(request.url).searchParams.get("week") || "1";
    const requested = literacyWeek(input);
    const progress = published.includes(requested)
      ? await status(student.studentId, student.level, requested) : null;
    return respond({
      name: student.name, level: student.level, weeks: published,
      currentWeek: requested, progress,
    });
  } catch(error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new Error("invalid_origin");
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("invalid_body");
    const student = await getStudent(request);
    if (!student.level) throw new Error("level_required");
    const body = await request.json();
    const week = literacyWeek(body.week);
    const action = String(body.action || "");
    if (!["start", "restart", "draw", "swap", "answer"].includes(action)) throw new Error("invalid_action");
    const published = await deckFor(student.level, week);
    if (!published.published || published.cards.length < QUESTIONS_PER_ATTEMPT) throw new Error("week_locked");
    const { db } = getFirebaseAdmin();
    const ref = db.collection(PROGRESS).doc(progressDoc(student.studentId, student.level, week));
    const studentRef = db.collection("students").doc(student.studentId);
    const response = await db.runTransaction(async tx => {
      const previous = await tx.get(ref);
      if (action === "start" || action === "restart") {
        if (previous.exists) {
          const old = previous.data() as SavedProgress;
          if (action === "start") return { progress: progressPublic(old) };
          if (!old.completed) throw new Error("in_progress");
          const fresh = newAttempt(student.studentId, student.level!, week, published.cards, old);
          tx.set(ref, { ...fresh, startedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
          return { progress: progressPublic(fresh) };
        }
        if (action === "restart") throw new Error("not_started");
        const fresh = newAttempt(student.studentId, student.level!, week, published.cards);
        tx.create(ref, { ...fresh, startedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        return { progress: progressPublic(fresh) };
      }
      if (!previous.exists) throw new Error("not_started");
      const p = previous.data() as SavedProgress;
      if (p.completed) return { progress: progressPublic(p), alreadyCompleted: true };
      if (action === "draw") {
        if (p.currentId) throw new Error("in_progress");
        const cardId = String(body.cardId || "");
        if (!availableIds(p).includes(cardId)) throw new Error("invalid_card");
        const changed = { ...p, currentId: cardId, currentMistakes: 0 };
        tx.update(ref, { currentId: cardId, currentMistakes: 0, updatedAt: FieldValue.serverTimestamp() });
        return { progress: progressPublic(changed) };
      }
      if (action === "swap") {
        if (!p.currentId) throw new Error("invalid_card");
        if (Number(p.swapsUsed || 0) >= MAX_SWAPS_PER_ATTEMPT) throw new Error("no_swaps");
        const remain = availableIds(p);
        const required = QUESTIONS_PER_ATTEMPT - (p.solvedIds || []).length;
        if (remain.length - 1 < required) throw new Error("not_enough_cards");
        const next: SavedProgress = {
          ...p,
          currentId: null,
          currentMistakes: 0,
          swapsUsed: Number(p.swapsUsed || 0) + 1,
          skippedIds: [...(p.skippedIds || []), p.currentId],
        };
        tx.update(ref, {
          currentId: null, currentMistakes: 0, swapsUsed: next.swapsUsed, skippedIds: next.skippedIds,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { swapped: true, progress: progressPublic(next) };
      }
      if (action !== "answer" || !p.currentId) throw new Error("invalid_card");
      const card = p.cards.find(item => item.id === p.currentId);
      if (!card) throw new Error("invalid_card");
      const answer = String(body.answer || "").trim();
      if (!answer || answer.length > 100) throw new Error("invalid_answer");
      const correct = normalizeLiteracyAnswer(answer) === normalizeLiteracyAnswer(card.answer);
      if (!correct) {
        const wrongIds = (p.wrongIds || []).includes(card.id) ? p.wrongIds : [...(p.wrongIds || []), card.id];
        const nextMistakes = Math.min(3, Math.max(0, Number(p.currentMistakes || 0)) + 1);
        // 한 카드를 3회 틀리면 자동으로 카드 선택 화면으로 돌아갑니다.
        // 자동 복귀는 수동 바꾸기 2회를 차감하지 않으며 카드는 다시 선택할 수 있습니다.
        const autoReturned = nextMistakes >= 3;
        const next = {
          ...p, wrongIds,
          currentId: autoReturned ? null : p.currentId,
          currentMistakes: autoReturned ? 0 : nextMistakes,
        };
        tx.update(ref, {
          wrongIds, currentId: next.currentId, currentMistakes: next.currentMistakes,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { correct: false, autoReturned, progress: progressPublic(next) };
      }
      const solvedIds = [...(p.solvedIds || []), card.id];
      const completed = solvedIds.length >= QUESTIONS_PER_ATTEMPT;
      const previousAwardDecided = typeof p.firstRewardDecided === "boolean"
        ? p.firstRewardDecided
        : Number(p.attemptNumber || 1) > 1;
      // 오답은 최초 선택한 카드별로 계산합니다. 교재당 첫 번째 완료에만 코인을 지급합니다.
      const reward = completed && !previousAwardDecided ? literacyCoinReward((p.wrongIds || []).length) : 0;
      const next: SavedProgress = {
        ...p, solvedIds, currentId: null, currentMistakes: 0, completed, reward,
        firstRewardDecided: completed ? true : previousAwardDecided,
        firstReward: completed && !previousAwardDecided ? reward : Number(p.firstReward || 0),
      };
      if (!completed) {
        tx.update(ref, { solvedIds, currentId: null, currentMistakes: 0, updatedAt: FieldValue.serverTimestamp() });
        return { correct: true, progress: progressPublic(next) };
      }

      // 점수·코인·완료 기록은 하나의 Firestore 트랜잭션에 저장됩니다.
      if (reward > 0) {
        const studentSnapshot = await tx.get(studentRef);
        if (!studentSnapshot.exists) throw new Error("login_required");
        const data = studentSnapshot.data() || {};
        const beforeBronze = Math.max(0, Number(data.bronze || 0));
        const beforeSilver = Math.max(0, Number(data.silver || 0));
        const exchanged = Math.floor((beforeBronze + reward) / 10);
        const bronze = (beforeBronze + reward) % 10;
        const silver = beforeSilver + exchanged;
        const now = new Date();
        const date = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
        }).format(now);
        const history = Array.isArray(data.coinHistory) ? data.coinHistory : [];
        const items: Record<string, unknown>[] = [{
          id: "literacy-" + ref.id,
          date, createdAt: now, type: "earn", currency: "bronze", amount: reward,
          source: "quiz", sourceDetail: "literacy_reading_core",
          text: "문해력 어휘 카드 " + student.level + " 리딩코어북 " + String(week).padStart(2, "0") +
            " · 동엽전 " + reward + "개 (7문제 · 오답 카드 " + (p.wrongIds || []).length + "개)",
        }];
        if (exchanged > 0) items.push({
          id: "literacy-exchange-" + ref.id, date, createdAt: now, type: "exchange",
          fromCurrency: "bronze", fromAmount: exchanged * 10,
          toCurrency: "silver", toAmount: exchanged,
          text: "동엽전 " + exchanged * 10 + "개를 은엽전 " + exchanged + "개로 자동 교환",
        });
        tx.update(studentRef, {
          bronze, silver,
          totalBronze: Math.max(0, Number(data.totalBronze || 0)) + reward,
          totalSilver: Math.max(0, Number(data.totalSilver || 0)) + exchanged,
          coinHistory: [...history, ...items].slice(-100),
        });
      }
      tx.update(ref, {
        solvedIds, currentId: null, currentMistakes: 0, completed: true, reward,
        firstRewardDecided: true, firstReward: next.firstReward,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { correct: true, progress: progressPublic(next) };
    });
    return respond({ ok: true, ...response });
  } catch(error) { return fail(error); }
}
