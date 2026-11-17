import "server-only";

import { randomUUID } from "node:crypto";

import sharp from "sharp";

import {
  GOLDEN_BINGO_IMAGE_MAX_BYTES,
  GOLDEN_BINGO_IMAGE_TYPES,
  GoldenBingoError,
  type GoldenBingoQuestion,
  goldenBingoImageUrl,
  isGoldenBingoImagePath,
} from "@/lib/goldenBingo";
import { goldenBingoNamespace } from "@/lib/goldenBingoServer";
import { getAssignmentBucketName, getSupabaseServer } from "@/lib/supabaseServer";

export async function storeGoldenBingoImage(
  file: File,
  uid: string,
  gameId: string
) {
  if (
    !file.size ||
    file.size > GOLDEN_BINGO_IMAGE_MAX_BYTES ||
    !GOLDEN_BINGO_IMAGE_TYPES.includes(file.type as (typeof GOLDEN_BINGO_IMAGE_TYPES)[number])
  ) {
    throw new GoldenBingoError("JPG, PNG, WEBP 사진(4MB 이하)만 등록할 수 있습니다.");
  }

  let output: Buffer;
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 20_000_000,
    })
      .rotate()
      .resize(1600, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84 })
      .toBuffer();
  } catch {
    throw new GoldenBingoError(
      "사진을 해석하지 못했습니다. 다른 이미지를 선택해 주세요."
    );
  }

  const path = `golden-bingo/${goldenBingoNamespace()}/${uid}/${gameId}/${randomUUID()}.jpg`;
  const bucket = getSupabaseServer().storage.from(getAssignmentBucketName());
  const { error } = await bucket.upload(path, output, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    console.error("golden-bingo image upload failed", error.message);
    throw new GoldenBingoError(
      "사진을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      503,
      "image_upload_failed"
    );
  }
  return { imagePath: path, imageUrl: goldenBingoImageUrl(path) };
}

export async function deleteGoldenBingoImages(paths: string[]) {
  const valid = [...new Set(paths)].filter(isGoldenBingoImagePath);
  if (valid.length === 0) return;
  const { error } = await getSupabaseServer()
    .storage.from(getAssignmentBucketName())
    .remove(valid);
  if (error) console.error("golden-bingo image cleanup failed", error.message);
}

export async function cloneGoldenBingoQuestionImages(
  questions: GoldenBingoQuestion[],
  uid: string,
  targetGameId: string
) {
  const bucket = getSupabaseServer().storage.from(getAssignmentBucketName());
  const createdPaths: string[] = [];

  try {
    const cloned: GoldenBingoQuestion[] = [];
    for (const question of questions) {
      if (!question.imagePath) {
        cloned.push({
          ...question,
          choices: [...question.choices] as [string, string, string],
        });
        continue;
      }

      const { data, error: downloadError } = await bucket.download(question.imagePath);
      if (downloadError || !data) throw new Error(downloadError?.message || "image_missing");

      const imagePath = `golden-bingo/${goldenBingoNamespace()}/${uid}/${targetGameId}/${randomUUID()}.jpg`;
      const { error: uploadError } = await bucket.upload(imagePath, await data.arrayBuffer(), {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      createdPaths.push(imagePath);
      cloned.push({
        ...question,
        choices: [...question.choices] as [string, string, string],
        imagePath,
        imageUrl: goldenBingoImageUrl(imagePath),
      });
    }
    return cloned;
  } catch (error) {
    if (createdPaths.length > 0) await bucket.remove(createdPaths);
    console.error(
      "golden-bingo image clone failed",
      error instanceof Error ? error.message : "unknown"
    );
    throw new GoldenBingoError(
      "게임 사진을 복제하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      503,
      "image_clone_failed"
    );
  }
}

export async function readGoldenBingoImage(path: unknown) {
  if (!isGoldenBingoImagePath(path)) {
    throw new GoldenBingoError("사진 주소를 확인해 주세요.", 400, "invalid_image_path");
  }
  if (!path.startsWith(`golden-bingo/${goldenBingoNamespace()}/`)) {
    throw new GoldenBingoError("사진을 찾을 수 없습니다.", 404, "image_not_found");
  }
  const { data, error } = await getSupabaseServer()
    .storage.from(getAssignmentBucketName())
    .download(path);
  if (error || !data) {
    console.error("golden-bingo image download failed", error?.message || "missing_file");
    throw new GoldenBingoError(
      "사진을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      503,
      "image_unavailable"
    );
  }
  return data;
}

