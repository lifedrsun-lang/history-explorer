import "server-only";
import sharp from "sharp";
import { ArchiveError } from "@/lib/photoArchive";

// Keep byte responses below the hosting response limit. Never return original EXIF/GPS.
const MAX_RESPONSE_BYTES = 4_000_000;
export async function renderArchiveQuality(bytes: Buffer, variant: "display" | "download") {
  try {
    const input = sharp(bytes, { limitInputPixels: 40_000_000 });
    const metadata = await input.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new Error("format");
    for (const quality of variant === "download" ? [98, 95, 92] : [95, 92]) {
      const image = sharp(bytes, { limitInputPixels: 40_000_000 }).rotate();
      const output = variant === "download"
        ? await image.flatten({ background: "#ffffff" }).jpeg({ quality, chromaSubsampling: "4:4:4", progressive: true }).toBuffer()
        : await image.resize(3840, 3840, { fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer();
      if (output.length <= MAX_RESPONSE_BYTES) return output;
    }
    throw new ArchiveError("고화질 사진이 전송 가능한 크기를 초과했습니다. 선생님께 문의해 주세요. 다운로드 횟수는 차감되지 않았습니다.", 413);
  } catch (error) {
    if (error instanceof ArchiveError) throw error;
    throw new ArchiveError("고화질 사진을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
  }
}
