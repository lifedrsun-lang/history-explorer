import "server-only";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import sharp from "sharp";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { isAllowedStudentCollection } from "@/lib/assignments";
import { getSupabaseServer, getAssignmentBucketName } from "@/lib/supabaseServer";
import { getEnrollmentTerms } from "@/lib/studentEnrollment";
import { ArchiveError, archiveId, canReadArchive, studentAlbum, validateArchiveInput, type ArchiveAlbum, type ArchivePhoto } from "@/lib/photoArchive";

const ALBUMS = "student_photo_albums", PHOTOS = "student_archive_photos";
type StoredPhoto = ArchivePhoto & { original_path: string; thumb_path: string; display_path: string; original_type: string; deleted_at: string | null };
const photoColumns = "id,album_id,caption,width,height,created_at";
const db = () => getSupabaseServer();
function storageError(error: unknown) { if (error) throw new ArchiveError("사진 보관함을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.", 503); }
export function archiveOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new ArchiveError("허용되지 않은 요청입니다.", 403);
}
export async function archiveTeacher(request: Request) {
  const match = (request.headers.get("authorization") || "").match(/^Bearer (.+)$/);
  if (!match) throw new ArchiveError("교사 로그인이 필요합니다.", 401);
  try {
    const token = await getFirebaseAdmin().auth.verifyIdToken(match[1], true);
    // Match the established teacher password-login trust boundary; exclude custom/anonymous student tokens.
    if (token.firebase?.sign_in_provider !== "password" || token.role === "student" || token.student === true) throw new Error("teacher_required");
    return token.uid;
  } catch { throw new ArchiveError("교사 로그인이 필요합니다.", 401); }
}
export async function archiveStudent(body: Record<string, unknown>) {
  // The existing Firestore student/password lookup is publicly readable. Never enable
  // real student photos until that legacy authentication boundary has been repaired
  // and reviewed. This task deliberately does not change the existing login flow.
  if (process.env.PHOTO_ARCHIVE_ACCESS_REVIEWED !== "true") throw new ArchiveError("사진 공개를 위한 계정 보안 점검 중입니다. 선생님께 문의해 주세요.", 503);
  try {
    const collection = String(body.studentCollection || ""), id = String(body.studentId || "");
    if (!isAllowedStudentCollection(collection) || !/^[^/]{1,128}$/.test(id) || typeof body.studentPassword !== "string" || !body.studentPassword.trim()) throw new Error("auth_required");
    const snap = await getFirebaseAdmin().db.collection(collection).doc(id).get(), data = snap.data();
    if (!data || data.isActive === false) throw new Error("auth_required");
    const digest = (value: string) => createHash("sha256").update(value).digest();
    if (!timingSafeEqual(digest(String(data.password || data.studentPassword || data.pw || "").trim()), digest(body.studentPassword.trim()))) throw new Error("auth_required");
    return { key: `${collection}:${id}`, terms: getEnrollmentTerms(data) };
  } catch { throw new ArchiveError("학생 로그인을 다시 확인해 주세요.", 401); }
}
export async function archiveRoster() {
  const firestore = getFirebaseAdmin().db;
  const groups = await Promise.all(["students", "student", "Students", "Student"].map(async collection => {
    const snap = await firestore.collection(collection).select("name", "school", "grade", "class", "program", "enrollmentTerms").get();
    return snap.docs.map(doc => ({ key: `${collection}:${doc.id}`, name: String(doc.data().name || ""), school: String(doc.data().school || ""), grade: String(doc.data().grade || ""), classroom: String(doc.data().class || ""), program: String(doc.data().program || ""), terms: getEnrollmentTerms(doc.data()) }));
  }));
  return groups.flat();
}
export async function listTeacherAlbums(uid: string) {
  const result = await db().from(ALBUMS).select("*").eq("owner_uid", uid).order("created_at", { ascending: false }).limit(500);
  storageError(result.error); return result.data as ArchiveAlbum[];
}
export async function getArchiveAlbum(id: unknown) {
  const result = await db().from(ALBUMS).select("*").eq("id", archiveId(id)).maybeSingle();
  storageError(result.error);
  if (!result.data) throw new ArchiveError("열람할 수 없는 앨범입니다.", 404);
  return result.data as ArchiveAlbum;
}
export async function ownedArchive(id: unknown, uid: string) {
  const album = await getArchiveAlbum(id);
  if (album.owner_uid !== uid) throw new ArchiveError("열람할 수 없는 앨범입니다.", 404);
  return album;
}
async function verifyRoster(keys: string[], term: string) {
  const firestore = getFirebaseAdmin().db;
  if (!keys.length) return;
  const refs = keys.map(key => { const [collection, id] = key.split(":"); return firestore.collection(collection).doc(id); });
  const students = await firestore.getAll(...refs);
  if (students.some(student => !student.exists || !getEnrollmentTerms(student.data()).includes(term))) throw new ArchiveError("지정한 학생 중 해당 분기의 수강 이력을 확인할 수 없는 학생이 있습니다.");
}
export async function saveArchiveAlbum(uid: string, body: Record<string, unknown>) {
  const payload = validateArchiveInput(body);
  if (payload.published && process.env.PHOTO_ARCHIVE_ACCESS_REVIEWED !== "true") throw new ArchiveError("기존 학생계정 보안 보완 전에는 학생 공개가 차단됩니다. 비공개로 저장해 주세요.", 409);
  await verifyRoster(payload.member_keys, `${payload.year}-Q${payload.quarter}`);
  if (body.id) {
    const album = await ownedArchive(body.id, uid);
    if (!Number.isInteger(body.revision) || body.revision !== album.revision) throw new ArchiveError("다른 창에서 변경되었습니다. 다시 불러와 주세요.", 409);
    // Changing an album's historical scope could accidentally expose existing photos to another class.
    if (["school", "classroom", "year", "quarter"].some(k => payload[k as keyof typeof payload] !== album[k as keyof ArchiveAlbum])) throw new ArchiveError("학교·반·연도·분기는 변경할 수 없습니다. 새 앨범을 만들어 주세요.");
    const result = await db().from(ALBUMS).update({ ...payload, revision: album.revision + 1, updated_at: new Date().toISOString() }).eq("id", album.id).eq("owner_uid", uid).eq("revision", album.revision).select("*").maybeSingle();
    storageError(result.error); if (!result.data) throw new ArchiveError("다른 창에서 변경되었습니다. 다시 불러와 주세요.", 409);
    return result.data;
  }
  const result = await db().from(ALBUMS).insert({ ...payload, id: randomUUID(), owner_uid: uid }).select("*").single();
  storageError(result.error); return result.data;
}
export async function listStudentAlbums(student: Awaited<ReturnType<typeof archiveStudent>>) {
  // SQL filtering reduces data reads. Authorization is still checked on every list, detail and byte request.
  const result = await db().from(ALBUMS).select("*").eq("published", true).contains("member_keys", [student.key]).limit(500);
  storageError(result.error);
  return (result.data as ArchiveAlbum[]).filter(a => canReadArchive(a, student.key, student.terms)).map(a => studentAlbum(a));
}
export async function readableArchive(id: unknown, student: Awaited<ReturnType<typeof archiveStudent>>) {
  const album = await getArchiveAlbum(id);
  if (!canReadArchive(album, student.key, student.terms)) throw new ArchiveError("열람할 수 없는 앨범입니다.", 404);
  return album;
}
export async function archivePhotos(albumId: string) {
  const result = await db().from(PHOTOS).select(photoColumns).eq("album_id", albumId).is("deleted_at", null).order("created_at").order("id").limit(500);
  storageError(result.error); return result.data as ArchivePhoto[];
}
async function storedPhoto(id: unknown) {
  const result = await db().from(PHOTOS).select("*").eq("id", archiveId(id)).is("deleted_at", null).maybeSingle();
  storageError(result.error); if (!result.data) throw new ArchiveError("열람할 수 없는 사진입니다.", 404);
  return result.data as StoredPhoto;
}
async function privateBucket() {
  const client = db(), bucket = getAssignmentBucketName();
  const result = await client.storage.getBucket(bucket); storageError(result.error);
  if (!result.data || result.data.public !== false) throw new ArchiveError("비공개 사진 저장소를 확인해 주세요.", 503);
  return client.storage.from(bucket);
}
const prefix = (album: string, photo: string) => `student-photo-archives/${album}/${photo}`;
export async function prepareArchiveUpload(albumId: unknown, uid: string, body: Record<string, unknown>) {
  const album = await ownedArchive(albumId, uid);
  if (!["image/jpeg", "image/png", "image/webp"].includes(String(body.contentType)) || !Number.isInteger(body.size) || Number(body.size) < 1 || Number(body.size) > 10 * 1024 * 1024) throw new ArchiveError("JPG·PNG·WEBP 사진을 선택해 주세요. 사진 한 장은 10MB까지 가능합니다.");
  const id = randomUUID(), bucket = await privateBucket();
  const result = await bucket.createSignedUploadUrl(`${prefix(album.id, id)}/original`, { upsert: false });
  storageError(result.error);
  return { id, uploadUrl: result.data!.signedUrl };
}
export async function finishArchiveUpload(albumId: unknown, uid: string, idValue: unknown) {
  const album = await ownedArchive(albumId, uid), id = archiveId(idValue), bucket = await privateBucket();
  const existing = await db().from(PHOTOS).select(photoColumns).eq("id", id).eq("album_id", album.id).maybeSingle();
  storageError(existing.error); if (existing.data) return existing.data;
  const base = prefix(album.id, id), original_path = `${base}/original`, thumb_path = `${base}/thumb.webp`, display_path = `${base}/display.webp`;
  const original = await bucket.download(original_path); storageError(original.error);
  if (!original.data || original.data.size > 10 * 1024 * 1024) throw new ArchiveError("사진 크기를 확인해 주세요.");
  const bytes = Buffer.from(await original.data.arrayBuffer());
  let thumb: Buffer, display: Buffer, width: number, height: number, format: string;
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new Error("format");
    const result = await image.rotate().resize(2200, 2200, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer({ resolveWithObject: true });
    display = result.data; width = result.info.width; height = result.info.height; format = metadata.format!;
    thumb = await sharp(display).resize(360, 300, { fit: "inside", withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  } catch { throw new ArchiveError("읽을 수 없는 사진입니다. JPG·PNG·WEBP 사진을 다시 선택해 주세요."); }
  // Derivatives are deterministic; retries may replace only this pending upload's derivatives.
  for (const [path, buffer] of [[thumb_path, thumb], [display_path, display]] as const) {
    const result = await bucket.upload(path, buffer, { contentType: "image/webp", upsert: true, cacheControl: "0" }); storageError(result.error);
  }
  const result = await db().from(PHOTOS).insert({ id, album_id: album.id, original_path, thumb_path, display_path, original_type: `image/${format}`, width, height }).select(photoColumns).single();
  // Keep the private original on metadata failure so the administrator can retry without losing it.
  storageError(result.error); return result.data;
}
export async function importArchiveBytes(albumId: unknown, uid: string, bytes: Buffer) {
  const album = await ownedArchive(albumId, uid);
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new ArchiveError("사진 한 장은 10MB까지 가능합니다.");
  // Content-based UUID makes repeated/partial imports safe without adding a table or exposing the source URL.
  const hash = createHash("sha256").update(album.id).update(bytes).digest("hex");
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  const existing = await db().from(PHOTOS).select("id,deleted_at").eq("id", id).eq("album_id", album.id).maybeSingle();
  storageError(existing.error);
  if (existing.data) return { id, skipped: true, removed: !!existing.data.deleted_at };
  if ((await archivePhotos(album.id)).length >= 500) throw new ArchiveError("앨범에는 최대 500장까지 등록할 수 있습니다.");
  // Validate before retaining remote data. finishArchiveUpload performs the full decode and derivative pipeline.
  let contentType: string;
  try { const info = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata(); if (!["jpeg", "png", "webp"].includes(info.format || "") || (info.pages || 1) > 1) throw new Error("format"); contentType = `image/${info.format}`; }
  catch { throw new ArchiveError("읽을 수 없는 사진입니다. JPG·PNG·WEBP 사진을 확인해 주세요."); }
  const bucket = await privateBucket();
  const result = await bucket.upload(`${prefix(album.id, id)}/original`, bytes, { contentType, upsert: true, cacheControl: "0" });
  storageError(result.error);
  await finishArchiveUpload(album.id, uid, id);
  return { id, skipped: false, removed: false };
}
export async function editArchivePhoto(uid: string, body: Record<string, unknown>) {
  const photo = await storedPhoto(body.photoId); await ownedArchive(photo.album_id, uid);
  const patch = body.remove === true ? { deleted_at: new Date().toISOString() } : { caption: String(body.caption || "").trim() };
  if ("caption" in patch && patch.caption!.length > 1000) throw new ArchiveError("설명은 1,000자까지 입력해 주세요.");
  const result = await db().from(PHOTOS).update(patch).eq("id", photo.id); storageError(result.error);
}
export async function archiveImage(body: Record<string, unknown>, uid?: string) {
  const photo = await storedPhoto(body.photoId);
  const album = uid ? await ownedArchive(photo.album_id, uid) : await readableArchive(photo.album_id, await archiveStudent(body));
  if (body.albumId !== album.id) throw new ArchiveError("열람할 수 없는 사진입니다.", 404);
  const variant = body.variant;
  if (!["thumb", "display", "original"].includes(String(variant)) || (!uid && variant === "original")) throw new ArchiveError("열람할 수 없는 사진입니다.", 404);
  const bucket = await privateBucket();
  const result = await bucket.download(variant === "original" ? photo.original_path : variant === "display" ? photo.display_path : photo.thumb_path);
  storageError(result.error);
  // Recheck after storage I/O so expiry/unpublish during download cannot return bytes.
  if (!uid) await readableArchive(album.id, await archiveStudent(body));
  return new Response(result.data!, { headers: { ...archiveHeaders, "Content-Type": variant === "original" ? photo.original_type : "image/webp", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff" } });
}
export const archiveHeaders = { "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache", "Vary": "Authorization, Cookie, Origin", "Cross-Origin-Resource-Policy": "same-origin" };
export function archiveJson(value: unknown) { return Response.json(value, { headers: archiveHeaders }); }
export function archiveError(error: unknown) {
  if (!(error instanceof ArchiveError)) console.error("photo_archive_request_failed");
  return Response.json({ error: error instanceof ArchiveError ? error.message : "사진 보관함 요청을 처리하지 못했습니다." }, { status: error instanceof ArchiveError ? error.status : 503, headers: archiveHeaders });
}
