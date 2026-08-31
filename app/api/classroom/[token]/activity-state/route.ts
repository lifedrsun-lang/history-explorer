import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getGaebongClassroomByToken } from "@/app/student/data/classroomData";

export const dynamic = "force-dynamic";

const COLLECTION = "classroom_activity_states";

type RouteContext = {
  params: Promise<{ token: string }>;
};

type ActivityMap = Record<string, boolean>;

const getAllowedActivityIds = (token: string) => {
  const classroom = getGaebongClassroomByToken(token);

  if (!classroom) {
    return null;
  }

  return {
    classroom,
    ids: new Set(
      classroom.lessons.flatMap((lesson) => lesson.links.map((link) => link.id))
    ),
  };
};

const normalizeActivities = (
  value: unknown,
  allowedIds: Set<string>
): ActivityMap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const result: ActivityMap = {};

  for (const id of allowedIds) {
    if (typeof source[id] === "boolean") {
      result[id] = source[id] as boolean;
    }
  }

  return result;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const allowed = getAllowedActivityIds(token);

    if (!allowed) {
      return Response.json({ error: "classroom_not_found" }, { status: 404 });
    }

    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection(COLLECTION).doc(token).get();
    const activities = normalizeActivities(
      snapshot.exists ? snapshot.data()?.activities : {},
      allowed.ids
    );

    return Response.json(
      { activities },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("classroom activity state GET failed", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const { token } = await context.params;
    const allowed = getAllowedActivityIds(token);

    if (!allowed) {
      return Response.json({ error: "classroom_not_found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as
      | { activityId?: unknown; unlocked?: unknown }
      | null;
    const activityId =
      typeof body?.activityId === "string" ? body.activityId.trim() : "";
    const unlocked = body?.unlocked;

    if (!activityId || !allowed.ids.has(activityId) || typeof unlocked !== "boolean") {
      return Response.json({ error: "invalid_activity_state" }, { status: 400 });
    }

    const { db } = getFirebaseAdmin();
    const ref = db.collection(COLLECTION).doc(token);
    const snapshot = await ref.get();
    const currentActivities = normalizeActivities(
      snapshot.exists ? snapshot.data()?.activities : {},
      allowed.ids
    );
    const activities: ActivityMap = {
      ...currentActivities,
      [activityId]: unlocked,
    };

    await ref.set(
      {
        school: "서울개봉초등학교",
        grade: allowed.classroom.grade,
        classNumber: allowed.classroom.classNumber,
        activities,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: teacher.uid,
      },
      { merge: true }
    );

    return Response.json({ activities });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (
      message === "teacher_auth_required" ||
      message.includes("auth/") ||
      message.includes("token")
    ) {
      return Response.json({ error: "teacher_auth_required" }, { status: 401 });
    }

    console.error("classroom activity state PATCH failed", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
