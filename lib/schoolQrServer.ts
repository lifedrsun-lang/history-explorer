import "server-only";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { SCHOOL_QR_CODES, type SchoolQrCode } from "@/lib/schoolQrCodes";

export const SCHOOL_QR_MAX_BYTES = 3 * 1024 * 1024;
// A QR is a small, lossless image. Bound the atomic Firestore record below 1 MiB.
const MAX_STORED_BYTES = 450 * 1024;
const COLLECTION = "school_qr_images";

type StoredQr = {
  deleted: boolean;
  version: string;
  encodedUrl?: string;
  imageBase64?: string;
  updatedAt: string;
  updatedBy: string;
};

function documentFor(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) throw new Error("invalid_slug");
  return getFirebaseAdmin().db.collection(COLLECTION).doc(slug);
}

export function normalizeSchoolQrUrl(value: string, slug: string) {
  const text = value.trim() || `https://sunlab.me.kr/student/classroom/${encodeURIComponent(slug)}`;
  try {
    const url = new URL(text);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || text.length > 2000) throw new Error();
    return url.href;
  } catch { throw new Error("invalid_qr_url"); }
}

export async function getSchoolQr(slug: string, includePreview = false): Promise<SchoolQrCode | null> {
  const snapshot = await documentFor(slug).get();
  if (!snapshot.exists) return SCHOOL_QR_CODES[slug] || null;
  const value = snapshot.data() as StoredQr;
  // Keep a deletion marker so removing the seeded Dongguro QR does not restore it.
  if (value.deleted || !value.imageBase64 || !value.encodedUrl) return null;
  return {
    imageSrc: includePreview
      ? `data:image/png;base64,${value.imageBase64}`
      : `/api/classroom/schools/${encodeURIComponent(slug)}/qr?image=1&v=${encodeURIComponent(value.version)}`,
    encodedUrl: value.encodedUrl,
    filename: "qr.png",
  };
}

export async function getSchoolQrImage(slug: string) {
  const snapshot = await documentFor(slug).get();
  if (!snapshot.exists) return null;
  const value = snapshot.data() as StoredQr;
  return !value.deleted && value.imageBase64 ? Buffer.from(value.imageBase64, "base64") : null;
}

export async function saveSchoolQr(slug: string, source: { bytes: Buffer; encodedUrl: string; uid: string }) {
  const ref = documentFor(slug);
  const encodedUrl = normalizeSchoolQrUrl(source.encodedUrl, slug);
  if (!source.bytes.length || source.bytes.length > SCHOOL_QR_MAX_BYTES) throw new Error("invalid_qr_image");
  let bytes: Buffer;
  try {
    const image = sharp(source.bytes, { limitInputPixels: 16_000_000, animated: false });
    const meta = await image.metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format) || (meta.pages || 1) > 1) throw new Error();
    // Do not resize QR modules or use lossy compression.
    bytes = await image.rotate().png().toBuffer();
    if (bytes.length > MAX_STORED_BYTES) throw new Error();
  } catch { throw new Error("invalid_qr_image"); }
  await ref.set({
    deleted: false, version: randomUUID(), encodedUrl,
    imageBase64: bytes.toString("base64"), updatedAt: new Date().toISOString(), updatedBy: source.uid,
  } satisfies StoredQr);
  return { imageSrc: `data:image/png;base64,${bytes.toString("base64")}`, encodedUrl, filename: "qr.png" } satisfies SchoolQrCode;
}

export async function deleteSchoolQr(slug: string, uid: string) {
  // One atomic replacement removes only this school's QR image and URL.
  await documentFor(slug).set({ deleted: true, version: randomUUID(), updatedAt: new Date().toISOString(), updatedBy: uid } satisfies StoredQr);
}
