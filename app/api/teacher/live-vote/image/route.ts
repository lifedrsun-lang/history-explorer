import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { authorizeVote, voteFailure, voteJson, voteNamespace } from "@/lib/liveVoteServer";
import { VoteError, voteSlot } from "@/lib/liveVote";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    await authorizeVote(request);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new VoteError("허용되지 않은 요청입니다.", 403, "forbidden");
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 5_000_000) throw new VoteError("사진은 4MB 이하로 올려주세요.");
    const form = await request.formData();
    const slot = voteSlot(form.get("slot"));
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 4_000_000 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new VoteError("JPG, PNG, WEBP 사진(4MB 이하)만 등록할 수 있습니다.");
    }
    let output: Buffer;
    try {
      const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 15_000_000 });
      output = await image.rotate().resize(1200, 800, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    } catch { throw new VoteError("사진을 해석하지 못했습니다. 다른 이미지를 선택해주세요."); }
    const name = "sunlab-vote/" + voteNamespace() + "/" + slot + "/" + randomUUID() + ".jpg";
    const token = randomUUID();
    const bucketName = "history-quest-b8e96.firebasestorage.app";
    const bucket = getStorage(getFirebaseAdmin().app).bucket(bucketName);
    await bucket.file(name).save(output, {
      resumable: false, contentType: "image/jpeg",
      metadata: { metadata: { firebaseStorageDownloadTokens: token }, cacheControl: "private, max-age=3600" },
    });
    const url = "https://firebasestorage.googleapis.com/v0/b/" + bucketName + "/o/" + encodeURIComponent(name) + "?alt=media&token=" + token;
    return voteJson({ imageUrl: url });
  } catch (error) { return voteFailure(error); }
}
