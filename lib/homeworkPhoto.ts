import { EXTENSION_BY_CONTENT_TYPE, HOMEWORK_MAX_FILE_SIZE } from "./assignments";

export const HOMEWORK_PHOTO_ERROR =
  "이 사진을 처리할 수 없습니다. 다른 사진을 선택하거나 사진을 다시 저장한 후 제출해 주세요.";

// MIME and extensions are gallery-provided hints, not evidence of file contents.
export const detectHomeworkPhotoType = (bytes: Uint8Array): string | null => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return null;
};

export const homeworkPhotoName = (name: string, type: string) => {
  const stem = name.replace(/\.[^.]*$/, "") || "photo";
  return `${stem}.${EXTENSION_BY_CONTENT_TYPE[type]?.[0] || "jpg"}`;
};

export const validateHomeworkPhotoSize = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) return "파일 크기를 확인할 수 없습니다.";
  if (size > HOMEWORK_MAX_FILE_SIZE) return "사진은 파일당 10MB 이하로 제출해 주세요.";
  return "";
};

export type HomeworkUploadTarget = { storagePath: string; signedUrl: string };
export type HomeworkStagedPhoto = { storagePath: string; name: string; type: string; size: number };
