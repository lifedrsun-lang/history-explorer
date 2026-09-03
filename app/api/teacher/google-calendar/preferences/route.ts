import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "teacher_google_calendar_preferences";
const ALLOWED_COLORS = new Set([
  "blue",
  "violet",
  "emerald",
  "orange",
  "rose",
  "cyan",
  "amber",
  "fuchsia",
  "lime",
  "indigo",
]);

const normalize = (value: unknown) => String(value || "").trim();

const sanitizeSchoolColors = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  const result: Record<string, string> = {};
  for (const [schoolName, colorKey] of Object.entries(value as Record<string, unknown>)) {
    const school = normalize(schoolName);
    const color = normalize(colorKey);
    if (school && ALLOWED_COLORS.has(color)) {
      result[school] = color;
    }
  }
  return result;
};

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection(COLLECTION).doc(teacher.uid).get();
    const schoolColors = sanitizeSchoolColors(snapshot.data()?.schoolColors);

    return Response.json({ schoolColors });
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
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const schoolName = normalize(body?.schoolName);
    const colorKey = normalize(body?.colorKey);

    if (!schoolName || schoolName.length > 100) {
      return jsonError("학교명이 올바르지 않습니다.", 400, "invalid_school_name");
    }
    if (colorKey && !ALLOWED_COLORS.has(colorKey)) {
      return jsonError("선택할 수 없는 색상입니다.", 400, "invalid_school_color");
    }

    const { db } = getFirebaseAdmin();
    const ref = db.collection(COLLECTION).doc(teacher.uid);
    const snapshot = await ref.get();
    const schoolColors = sanitizeSchoolColors(snapshot.data()?.schoolColors);

    if (colorKey) {
      schoolColors[schoolName] = colorKey;
    } else {
      delete schoolColors[schoolName];
    }

    await ref.set(
      {
        schoolColors,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return Response.json({ schoolColors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}
