import { randomUUID } from "crypto";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import {
  getAssignmentBucketName,
  getSupabaseServer,
} from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const extensionForType = (contentType: string) => {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
};

const normalizePath = (value: unknown) => String(value || "").trim();

export async function POST(request: Request) {
  let uploadedPath = "";

  try {
    const teacher = await verifyTeacherRequest(request);
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return jsonError("문제 사진을 선택해 주세요.", 400, "image_required");
    }

    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return jsonError(
        "JPG, PNG, WEBP 사진만 올릴 수 있습니다.",
        400,
        "invalid_image_type"
      );
    }

    if (!Number.isFinite(image.size) || image.size <= 0 || image.size > MAX_IMAGE_SIZE) {
      return jsonError(
        "문제 사진은 10MB 이하로 올려 주세요.",
        400,
        "invalid_image_size"
      );
    }

    const supabase = getSupabaseServer();
    const bucketName = getAssignmentBucketName();
    const extension = extensionForType(image.type);
    uploadedPath = `review-questions/${teacher.uid}/${randomUUID()}.${extension}`;
    const buffer = await image.arrayBuffer();
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(uploadedPath, buffer, {
        contentType: image.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase review image upload failed:", error);
      throw new Error("review_image_upload_failed");
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(uploadedPath, 60 * 30);

    if (signedError) {
      console.error("Supabase review image signed URL failed:", signedError);
    }

    return Response.json({
      ok: true,
      storagePath: uploadedPath,
      originalName: image.name,
      contentType: image.type,
      size: image.size,
      previewUrl: signedData?.signedUrl || "",
    });
  } catch (error) {
    if (uploadedPath) {
      try {
        await getSupabaseServer()
          .storage.from(getAssignmentBucketName())
          .remove([uploadedPath]);
      } catch (cleanupError) {
        console.error("Review image cleanup failed:", cleanupError);
      }
    }

    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }

    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json().catch(() => ({}));
    const storagePath = normalizePath(body?.storagePath);
    const allowedPrefix = `review-questions/${teacher.uid}/`;

    if (!storagePath || !storagePath.startsWith(allowedPrefix)) {
      return jsonError("삭제할 문제 사진을 확인해 주세요.", 400, "invalid_image_path");
    }

    const { error } = await getSupabaseServer()
      .storage.from(getAssignmentBucketName())
      .remove([storagePath]);

    if (error) {
      console.error("Supabase review image delete failed:", error);
      throw new Error("review_image_delete_failed");
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }

    return handleRouteError(error);
  }
}
