import { FieldValue } from "firebase-admin/firestore";
import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  literacyDeckKey, literacyLevel, literacySeedDeck, literacyWeek,
  validateLiteracyCards, type LiteracyCard,
} from "@/lib/literacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const DECKS = "sunlab_literacy_decks";
const ASSIGNMENTS = "sunlab_literacy_assignments";

function privateJson(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

async function checkTeacher(request: Request) {
  const teacher = await verifyTeacherRequest(request);
  if (teacher.firebase?.sign_in_provider !== "password" ||
      teacher.role === "student" || teacher.student === true) {
    throw new Error("teacher_auth_required");
  }
  return teacher;
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "teacher_auth_required" || message.startsWith("auth/")) {
    return privateJson({ error: "교사 로그인이 필요합니다." }, 401);
  }
  if (message.startsWith("invalid_") || message === "duplicate_literacy_cards") {
    return privateJson({ error: "레벨·주차·어휘 입력 내용을 확인해 주세요." }, 400);
  }
  if (message === "invalid_member") return privateJson({ error: "SUN LAB 학생 정보를 확인해 주세요." }, 403);
  if (message === "previous_week_required") return privateJson({ error: "이전 리딩코어북을 먼저 공개해 주세요." }, 409);
  console.error("literacy teacher API", message);
  return privateJson({ error: "문해력 교실을 불러오지 못했습니다." }, 503);
}

async function getDeck(level: ReturnType<typeof literacyLevel>, week: number) {
  const { db } = getFirebaseAdmin();
  const key = literacyDeckKey(level, week);
  const stored = await db.collection(DECKS).doc(key).get();
  if (!stored.exists) return literacySeedDeck(level, week);
  const data = stored.data() || {};
  return {
    level,
    week,
    published: data.published === true,
    cards: validateLiteracyCards(data.cards || []) as LiteracyCard[],
  };
}

export async function GET(request: Request) {
  try {
    await checkTeacher(request);
    const url = new URL(request.url);
    const level = literacyLevel(url.searchParams.get("level") || "K5");
    const week = literacyWeek(url.searchParams.get("week") || "1");
    const { db } = getFirebaseAdmin();
    const [deck, members, assignments, decks] = await Promise.all([
      getDeck(level, week),
      db.collection("students").get(),
      db.collection(ASSIGNMENTS).get(),
      db.collection(DECKS).get(),
    ]);
    const levels = Object.fromEntries(assignments.docs.map(item => [
      item.id, String(item.data()?.level || ""),
    ]));
    const roster = members.docs
      .filter(item => item.data()?.sunLabMember === true || item.data()?.program === "sun_lab")
      .map(item => ({
        studentId: item.id,
        name: String(item.data()?.name || ""),
        school: String(item.data()?.school || ""),
        level: levels[item.id] || "",
      }))
      .sort((a,b) => a.name.localeCompare(b.name, "ko-KR"));
    const enabledWeeks: number[] = [];
    for (let n = 1; n <= 24; n++) {
      const item = decks.docs.find(doc => doc.id === literacyDeckKey(level, n));
      if (item) {
        if (item.data().published === true && Array.isArray(item.data().cards) && item.data().cards.length) {
          enabledWeeks.push(n);
        }
      } else if (literacySeedDeck(level, n).published) enabledWeeks.push(n);
    }
    return privateJson({ deck, roster, enabledWeeks });
  } catch(error) { return fail(error); }
}

export async function PUT(request: Request) {
  try {
    const teacher = await checkTeacher(request);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new Error("invalid_origin");
    const body = await request.json();
    const level = literacyLevel(body.level);
    const week = literacyWeek(body.week);
    const cards = validateLiteracyCards(body.cards);
    const published = body.published === true;
    if (published && cards.length === 0) throw new Error("invalid_literacy_cards");
    const { db } = getFirebaseAdmin();
    // 주차 공개는 순서대로. 이전 주차를 건너뛰어 공개하지 않습니다.
    if (published && week > 1) {
      const previous = await getDeck(level, week - 1);
      if (!previous.published || previous.cards.length === 0) {
        throw new Error("previous_week_required");
      }
    }
    await db.collection(DECKS).doc(literacyDeckKey(level, week)).set({
      schemaVersion: 1, level, week, cards, published,
      updatedBy: teacher.uid, updatedAt: FieldValue.serverTimestamp(),
    });
    return privateJson({ ok: true, deck: { level, week, cards, published } });
  } catch(error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const teacher = await checkTeacher(request);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new Error("invalid_origin");
    const body = await request.json();
    if (body.action !== "assign") throw new Error("invalid_action");
    const level = literacyLevel(body.level);
    const studentId = String(body.studentId || "");
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(studentId)) throw new Error("invalid_member");
    const { db } = getFirebaseAdmin();
    const student = await db.collection("students").doc(studentId).get();
    const data = student.data() || {};
    if (!student.exists || (data.sunLabMember !== true && data.program !== "sun_lab")) {
      throw new Error("invalid_member");
    }
    await db.collection(ASSIGNMENTS).doc(studentId).set({
      studentId, level, updatedBy: teacher.uid, updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return privateJson({ ok: true, studentId, level });
  } catch(error) { return fail(error); }
}
