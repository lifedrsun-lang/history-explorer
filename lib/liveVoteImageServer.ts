import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getAssignmentBucketName, getSupabaseServer } from "@/lib/supabaseServer";
import { VoteError, type VoteSlot } from "@/lib/liveVote";
import { voteNamespace } from "@/lib/liveVoteServer";
import { isVoteImagePath, voteImageUrl, VOTE_IMAGE_MAX_BYTES, VOTE_IMAGE_TYPES } from "@/lib/liveVoteImages";

export async function storeVoteImage(file: File, slot: VoteSlot) {
  if (!file.size || file.size > VOTE_IMAGE_MAX_BYTES || !VOTE_IMAGE_TYPES.includes(file.type)) {
    throw new VoteError("JPG, PNG, WEBP 사진(4MB 이하)만 등록할 수 있습니다.");
  }
  let output: Buffer;
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 15_000_000 })
      .rotate().resize(1200, 800, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 }).toBuffer();
  } catch { throw new VoteError("사진을 해석하지 못했습니다. 다른 이미지를 선택해주세요."); }

  const path = "sunlab-vote/" + voteNamespace() + "/" + slot + "/" + randomUUID() + ".jpg";
  const bucket = getSupabaseServer().storage.from(getAssignmentBucketName());
  const { error } = await bucket.upload(path, output, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
  if (error) {
    console.error("live-vote image storage upload failed", error.message);
    throw new VoteError("사진을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.", 503, "image_upload_failed");
  }
  return { imageUrl: voteImageUrl(path) };
}

export async function readVoteImage(path: unknown) {
  if (!isVoteImagePath(path)) throw new VoteError("사진 주소를 확인해주세요.", 400, "invalid_image_path");
  if (!path.startsWith("sunlab-vote/" + voteNamespace() + "/")) {
    throw new VoteError("사진을 찾을 수 없습니다.", 404, "image_not_found");
  }
  const { data, error } = await getSupabaseServer().storage.from(getAssignmentBucketName()).download(path);
  if (error || !data) {
    if (error && "statusCode" in error && String(error.statusCode) === "404") throw new VoteError("사진을 찾을 수 없습니다.", 404, "image_not_found");
    console.error("live-vote image storage download failed", error?.message || "missing_file");
    throw new VoteError("사진을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.", 503, "image_unavailable");
  }
  return data;
}
