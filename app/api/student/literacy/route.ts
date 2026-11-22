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

type SavedProgress = {
  studentId: string; level: LiteracyLevel; week: number;
  cards: LiteracyCard[]; solvedIds: string[]; wrongIds: string[];
  currentId: string | null; completed: boolean; reward: number;
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
function progressPublic(value: SavedProgress | null) {
  if (!value) return null;
  const solvedIds = Array.isArray(value.solvedIds) ? value.solvedIds : [];
  const wrongIds = Array.isArray(value.wrongIds) ? value.wrongIds : [];
  const current = value.cards.find(item => item.id === value.currentId);
  return {
    started: true,
    total: value.cards.length,
    solved: solvedIds.length,
    wrong: wrongIds.length,
    remaining: value.cards.filter(item => !solvedIds.includes(item.id)).map(item => item.id),
    selectedId: current?.id || null,
    clue: current?.clue || null,
    kind: current?.kind || null,
    completed: value.completed === true,
    reward: Number(value.reward || 0),
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
function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "login_required") return respond({ error: "SUN LAB에 다시 로그인해 주세요." }, 401);
  if (message === "level_required") return respond({ error: "선생님이 문해력 레벨을 지정하면 이용할 수 있어요." }, 403);
  if (message === "week_locked") return respond({ error: "아직 공개되지 않은 리딩코어북입니다." }, 403);
  if (message === "not_started") return respond({ error: "게임 시작을 먼저 눌러 주세요." }, 409);
  if (message === "invalid_action" || message.startsWith("invalid_")) {
    return respond({ error: "학습 정보를 다시 확인해 주세요." }, 400);
  }
  if (message === "in_progress") return respond({ error: "현재 선택한 단어를 먼저 풀어 주세요." }, 409);
  if (message === "already_completed") return respond({ error: "이미 학습을 완료했어요." }, 409);
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
            Array.isArray(override.data().cards) && override.data().cards.length) {
          published.push(w);
        }
      } else if (literacySeedDeck(student.level, w).published) published.push(w);
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
    if (!["start", "draw", "answer"].includes(action)) throw new Error("invalid_action");
    const published = await deckFor(student.level, week);
    if (!published.published || published.cards.length === 0) throw new Error("week_locked");
    const { db } = getFirebaseAdmin();
    const ref = db.collection(PROGRESS).doc(progressDoc(student.studentId, student.level, week));
    const studentRef = db.collection("students").doc(student.studentId);
    const response = await db.runTransaction(async tx => {
      const previous = await tx.get(ref);
      if (action === "start") {
        if (previous.exists) return { progress: progressPublic(previous.data() as SavedProgress) };
        // 단어의 내용/정답을 고정하여 교사가 자료를 편집해도 진행 중 게임이 바뀌지 않도록 함
        const fresh: SavedProgress = {
          studentId: student.studentId, level: student.level!, week,
          cards: published.cards,
          solvedIds: [], wrongIds: [], currentId: null, completed: false, reward: 0,
        };
        tx.create(ref, { ...fresh, startedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        return { progress: progressPublic(fresh) };
      }
      if (!previous.exists) throw new Error("not_started");
      const p = previous.data() as SavedProgress;
      if (p.completed) return { progress: progressPublic(p), alreadyCompleted: true };
      if (action === "draw") {
        if (p.currentId) throw new Error("in_progress");
        const cardId = String(body.cardId || "");
        if (!p.cards.some(item => item.id === cardId && !p.solvedIds.includes(item.id))) {
          throw new Error("invalid_card");
        }
        const changed = { ...p, currentId: cardId };
        tx.update(ref, { currentId: cardId, updatedAt: FieldValue.serverTimestamp() });
        return { progress: progressPublic(changed) };
      }
      if (action !== "answer") throw new Error("invalid_action");
      if (!p.currentId) throw new Error("invalid_card");
      const card = p.cards.find(item => item.id === p.currentId);
      if (!card) throw new Error("invalid_card");
      const answer = String(body.answer || "").trim();
      if (!answer || answer.length > 100) throw new Error("invalid_answer");
      const correct = normalizeLiteracyAnswer(answer) === normalizeLiteracyAnswer(card.answer);
      if (!correct) {
        const wrongIds = p.wrongIds.includes(card.id) ? p.wrongIds : [...p.wrongIds, card.id];
        tx.update(ref, { wrongIds, updatedAt: FieldValue.serverTimestamp() });
        return { correct: false, progress: progressPublic({ ...p, wrongIds }) };
      }
      const solvedIds = [...p.solvedIds, card.id];
      const completed = solvedIds.length === p.cards.length;
      const reward = completed ? literacyCoinReward(p.wrongIds.length) : 0;
      const next: SavedProgress = { ...p, solvedIds, currentId: null, completed, reward };
      if (!completed) {
        tx.update(ref, { solvedIds, currentId: null, updatedAt: FieldValue.serverTimestamp() });
        return { correct: true, progress: progressPublic(next) };
      }
      // 진행 기록과 코인 잔액은 동일한 트랜잭션에서 최초 1회만 확정합니다.
      // 0개 지급도 완료 기록을 남겨 재시작으로 보상이 달라지지 않습니다.
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
            " · 동엽전 " + reward + "개 (오답 카드 " + p.wrongIds.length + "개)",
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
        solvedIds, currentId: null, completed: true, reward,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { correct: true, progress: progressPublic(next) };
    });
    return respond({ ok: true, ...response });
  } catch(error) { return fail(error); }
}
