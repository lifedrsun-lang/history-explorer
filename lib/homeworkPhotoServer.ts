import "server-only";
import sharp from "sharp";
import { detectHomeworkPhotoType, homeworkPhotoName, HOMEWORK_PHOTO_ERROR, validateHomeworkPhotoSize } from "./homeworkPhoto";

export const processHomeworkPhoto = async (photo: File) => {
  const sizeError = validateHomeworkPhotoSize(photo.size);
  if (sizeError) throw new Error(sizeError);
  const bytes = Buffer.from(await photo.arrayBuffer());
  const signature = detectHomeworkPhotoType(bytes);
  if (!signature) throw new Error(HOMEWORK_PHOTO_ERROR);
  try {
    // toBuffer forces a full decode, unlike metadata/signature inspection alone.
    const processed = await sharp(bytes, { failOn: "error", limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return new File([new Uint8Array(processed)], homeworkPhotoName(photo.name, "image/jpeg"), { type: "image/jpeg" });
  } catch (error) {
    console.warn("Homework photo server decode failed", {
      stage: "sharp.toBuffer", mime: photo.type, signature,
      extension: photo.name.split(".").pop()?.toLowerCase(), size: photo.size,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    throw new Error(HOMEWORK_PHOTO_ERROR);
  }
};
