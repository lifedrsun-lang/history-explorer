import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "teacher_document_profiles";
const MAX_SIGNATURE_DATA_URL_LENGTH = 350_000;

const normalize = (value: unknown, maxLength = 120) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const normalizeSignature = (value: unknown) => {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("invalid_signature");
  if (!value.startsWith("data:image/png;base64,")) {
    throw new Error("invalid_signature");
  }
  if (value.length > MAX_SIGNATURE_DATA_URL_LENGTH) {
    throw new Error("signature_too_large");
  }
  return value;
};

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection(COLLECTION).doc(teacher.uid).get();
    const data = snapshot.data() || {};

    return Response.json({
      profile: {
        name: normalize(data.name),
        phone: normalize(data.phone),
        birthDate: normalize(data.birthDate, 20),
        signatureDataUrl:
          typeof data.signatureDataUrl === "string" ? data.signatureDataUrl : null,
      },
    });
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
    const name = normalize(body.name);
    const phone = normalize(body.phone, 40);
    const birthDate = normalize(body.birthDate, 20);
    const signatureDataUrl = normalizeSignature(body.signatureDataUrl);

    if (!name) return jsonError("성명을 입력해 주세요.", 400, "name_required");
    if (!phone) return jsonError("전화번호를 입력해 주세요.", 400, "phone_required");

    const { db } = getFirebaseAdmin();
    await db.collection(COLLECTION).doc(teacher.uid).set(
      {
        name,
        phone,
        birthDate,
        signatureDataUrl,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: teacher.uid,
      },
      { merge: true }
    );

    return Response.json({
      ok: true,
      profile: { name, phone, birthDate, signatureDataUrl },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    if (message === "invalid_signature") {
      return jsonError("서명 이미지 형식이 올바르지 않습니다.", 400, message);
    }
    if (message === "signature_too_large") {
      return jsonError("서명 이미지 용량이 너무 큽니다.", 400, message);
    }

    return handleRouteError(error);
  }
}
