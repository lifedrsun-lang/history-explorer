import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "teacher_resume_master";
const PROFILE_COLLECTION = "teacher_document_profiles";
const MAX_ITEMS_PER_SECTION = 80;

const normalize = (value: unknown, maxLength = 500) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const normalizeBoolean = (value: unknown) => value !== false;

type ResumeItem = {
  id: string;
  selected: boolean;
  fields: Record<string, string>;
};

const normalizeItem = (value: unknown, index: number): ResumeItem => {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawFields = source.fields && typeof source.fields === "object"
    ? (source.fields as Record<string, unknown>)
    : {};
  const fields: Record<string, string> = {};

  for (const [key, fieldValue] of Object.entries(rawFields)) {
    const safeKey = normalize(key, 60);
    if (!safeKey) continue;
    fields[safeKey] = normalize(fieldValue, 1000);
  }

  return {
    id: normalize(source.id, 120) || `item-${index + 1}`,
    selected: normalizeBoolean(source.selected),
    fields,
  };
};

const normalizeSection = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ITEMS_PER_SECTION).map(normalizeItem);
};

const sanitizePayload = (body: Record<string, unknown>) => ({
  profile: {
    name: normalize((body.profile as Record<string, unknown> | undefined)?.name, 120),
    birthDate: normalize((body.profile as Record<string, unknown> | undefined)?.birthDate, 30),
    phone: normalize((body.profile as Record<string, unknown> | undefined)?.phone, 50),
    email: normalize((body.profile as Record<string, unknown> | undefined)?.email, 180),
    address: normalize((body.profile as Record<string, unknown> | undefined)?.address, 300),
    headline: normalize((body.profile as Record<string, unknown> | undefined)?.headline, 200),
  },
  sections: {
    education: normalizeSection((body.sections as Record<string, unknown> | undefined)?.education),
    programExperience: normalizeSection((body.sections as Record<string, unknown> | undefined)?.programExperience),
    otherExperience: normalizeSection((body.sections as Record<string, unknown> | undefined)?.otherExperience),
    training: normalizeSection((body.sections as Record<string, unknown> | undefined)?.training),
    certification: normalizeSection((body.sections as Record<string, unknown> | undefined)?.certification),
  },
});

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const [resumeSnapshot, baseProfileSnapshot] = await Promise.all([
      db.collection(COLLECTION).doc(teacher.uid).get(),
      db.collection(PROFILE_COLLECTION).doc(teacher.uid).get(),
    ]);

    const stored = resumeSnapshot.data() || {};
    const baseProfile = baseProfileSnapshot.data() || {};
    const data = sanitizePayload({
      profile: {
        ...(stored.profile || {}),
        name: stored.profile?.name || baseProfile.name || "",
        birthDate: stored.profile?.birthDate || baseProfile.birthDate || "",
        phone: stored.profile?.phone || baseProfile.phone || "",
        email: stored.profile?.email || teacher.email || "",
      },
      sections: stored.sections || {},
    });

    return Response.json({ resume: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = (await request.json()) as Record<string, unknown>;
    const data = sanitizePayload(body);

    if (!data.profile.name) {
      return jsonError("성명을 입력해 주세요.", 400, "name_required");
    }

    const { db } = getFirebaseAdmin();
    await db.collection(COLLECTION).doc(teacher.uid).set(
      {
        ...data,
        schemaVersion: 1,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: teacher.uid,
      },
      { merge: true }
    );

    return Response.json({ ok: true, resume: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}
