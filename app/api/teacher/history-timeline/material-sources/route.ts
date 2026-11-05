import { FieldValue } from "firebase-admin/firestore";
import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { HISTORY_TIMELINE_EVENTS } from "@/lib/historyTimeline";
import { HISTORY_TIMELINE_SOURCES } from "@/lib/historyTimelineSources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "history_timeline_source_links";
const eventIds = new Set(HISTORY_TIMELINE_EVENTS.map((event) => event.id));
const sourceIds = new Set(HISTORY_TIMELINE_SOURCES.map((source) => source.id));
const normalize = (value: unknown) => String(value || "").trim();

const normalizePages = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalize).filter(Boolean))].slice(0, 30);
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const linksSnapshot = await db.collection(COLLECTION).get();
    const links = linksSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        eventId: normalize(data.eventId),
        sourceId: normalize(data.sourceId),
        pages: normalizePages(data.pages),
        note: normalize(data.note),
      };
    }).filter((link) => eventIds.has(link.eventId) && sourceIds.has(link.sourceId));

    return Response.json({
      sources: HISTORY_TIMELINE_SOURCES,
      events: HISTORY_TIMELINE_EVENTS.map((event) => ({
        id: event.id,
        dateLabel: event.dateLabel,
        title: event.title,
      })),
      links,
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
    }
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json().catch(() => ({}));
    const eventId = normalize(body.eventId);
    const sourceId = normalize(body.sourceId);
    const pages = normalizePages(body.pages);
    const note = normalize(body.note).slice(0, 500);
    if (!eventIds.has(eventId) || !sourceIds.has(sourceId) || pages.length === 0) {
      return jsonError("사건·자료·쪽수를 확인해 주세요.", 400, "invalid_source_link");
    }
    const source = HISTORY_TIMELINE_SOURCES.find((item) => item.id === sourceId);
    if (!source?.available) {
      return jsonError("등록이 확인된 자료만 연결할 수 있습니다.", 409, "source_unavailable");
    }

    const { db } = getFirebaseAdmin();
    const id = `${eventId}__${sourceId}`;
    await db.collection(COLLECTION).doc(id).set({
      eventId,
      sourceId,
      pages,
      note,
      updatedBy: teacher.uid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return Response.json({ ok: true, link: { id, eventId, sourceId, pages, note } });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
    }
    return handleRouteError(error);
  }
}
