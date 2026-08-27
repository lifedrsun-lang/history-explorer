import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getEnrollmentStatus } from "@/lib/studentEnrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "teacher_schedule_items";
const normalize = (value: unknown) => String(value || "").trim();

const serializeItem = (
  docItem: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot
) => ({
  id: docItem.id,
  ...docItem.data(),
});

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();

    const [itemSnapshot, studentSnapshot] = await Promise.all([
      db.collection(COLLECTION).get(),
      db.collection("students").get(),
    ]);

    const items = itemSnapshot.docs
      .map(serializeItem)
      .sort((a: any, b: any) => {
        const aDone = Boolean(a.completed);
        const bDone = Boolean(b.completed);
        if (aDone !== bDone) return aDone ? 1 : -1;
        const aDate = normalize(a.dueDate);
        const bDate = normalize(b.dueDate);
        if (aDate !== bDate) return aDate.localeCompare(bDate);
        return normalize(a.schoolName).localeCompare(normalize(b.schoolName), "ko-KR");
      });

    const schoolNames = Array.from(
      new Set(
        studentSnapshot.docs
          .map((docItem) => docItem.data())
          .filter((student) => getEnrollmentStatus(student) === "active")
          .map((student) => normalize(student?.school))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "ko-KR"));

    return Response.json({ items, schoolNames });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const body = await request.json();
    const schoolName = normalize(body?.schoolName);
    const title = normalize(body?.title);
    const dueDate = normalize(body?.dueDate);

    if (!schoolName || !title) {
      return jsonError("학교와 일정 내용을 입력해 주세요.", 400, "invalid_schedule_item");
    }

    const docRef = await db.collection(COLLECTION).add({
      schoolName,
      title,
      dueDate,
      completed: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const saved = await docRef.get();
    return Response.json({ item: serializeItem(saved) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const body = await request.json();
    const id = normalize(body?.id);

    if (!id) {
      return jsonError("수정할 일정이 없습니다.", 400, "missing_schedule_item_id");
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (typeof body?.completed === "boolean") {
      updates.completed = body.completed;
      updates.completedAt = body.completed ? FieldValue.serverTimestamp() : null;
    }
    if (body?.title !== undefined) updates.title = normalize(body.title);
    if (body?.schoolName !== undefined) updates.schoolName = normalize(body.schoolName);
    if (body?.dueDate !== undefined) updates.dueDate = normalize(body.dueDate);

    const docRef = db.collection(COLLECTION).doc(id);
    await docRef.update(updates);
    const saved = await docRef.get();
    return Response.json({ item: serializeItem(saved) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const id = normalize(new URL(request.url).searchParams.get("id"));

    if (!id) {
      return jsonError("삭제할 일정이 없습니다.", 400, "missing_schedule_item_id");
    }

    await db.collection(COLLECTION).doc(id).delete();
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}
