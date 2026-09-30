import { detectHomeworkPhotoType, homeworkPhotoName, HOMEWORK_PHOTO_ERROR, validateHomeworkPhotoSize } from "./homeworkPhoto";
import { getFileExtension, EXTENSION_BY_CONTENT_TYPE } from "./assignments";

const MAX_SIDE = 1200;
const TARGET_SIZE = 300 * 1024;

const reportFailure = (stage: string, file: File, signature: string, error: unknown) => {
  // No filenames, student identifiers, credentials or image bytes in diagnostics.
  console.warn("Homework photo processing", {
    stage, mime: file.type, extension: file.name.split(".").pop()?.toLowerCase(),
    signature, size: file.size, errorName: error instanceof Error ? error.name : "unknown",
  });
};

const loadSource = async (file: File, signature: string): Promise<ImageBitmap | HTMLImageElement> => {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (error) {
      reportFailure("createImageBitmap", file, signature, error);
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(HOMEWORK_PHOTO_ERROR));
      image.src = url;
    });
  } catch (error) {
    reportFailure("Image.onload", file, signature, error);
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const toJpeg = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(HOMEWORK_PHOTO_ERROR)), "image/jpeg", quality);
});

export const prepareHomeworkPhoto = async (file: File): Promise<File> => {
  const sizeError = validateHomeworkPhotoSize(file.size);
  if (sizeError) throw new Error(sizeError);
  let signature: string | null;
  try {
    signature = detectHomeworkPhotoType(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  } catch {
    throw new Error(HOMEWORK_PHOTO_ERROR);
  }
  if (!signature) throw new Error(HOMEWORK_PHOTO_ERROR);
  if (file.type !== signature || !EXTENSION_BY_CONTENT_TYPE[signature].includes(getFileExtension(file.name))) {
    reportFailure("signature-mismatch", file, signature, new Error("Image metadata mismatch"));
  }
  const normalized = new File([file], homeworkPhotoName(file.name, signature), { type: signature, lastModified: file.lastModified });
  let source: ImageBitmap | HTMLImageElement | undefined;
  let stage = "decode";
  try {
    source = await loadSource(normalized, signature);
    stage = "canvas.drawImage";
    const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (!width || !height) throw new Error(HOMEWORK_PHOTO_ERROR);
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error(HOMEWORK_PHOTO_ERROR);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    stage = "canvas.toBlob";
    let quality = 0.82;
    let blob = await toJpeg(canvas, quality);
    while (blob.size > TARGET_SIZE && quality > 0.62) {
      quality = Math.max(0.62, quality - 0.08);
      blob = await toJpeg(canvas, quality);
    }
    // Compression is optional. Keep a smaller original as well.
    if (blob.size >= normalized.size) return normalized;
    return new File([blob], homeworkPhotoName(file.name, "image/jpeg"), { type: "image/jpeg", lastModified: file.lastModified });
  } catch (error) {
    reportFailure(stage, file, signature, error);
    // Signature only permits transfer; the server must fully decode before saving a submission.
    return normalized;
  } finally {
    if (source && "close" in source) source.close();
  }
};
