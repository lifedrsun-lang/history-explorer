import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { ArchiveError, archiveExpiry, type ArchiveAlbum } from "./photoArchive";
import { getSupabaseServer } from "./supabaseServer";
import { PHOTO_CONSENT_VERSION, PHOTO_PUBLICATION_LABEL, PHOTO_VIEWING_LABEL, type PhotoConsentStatus, type TeacherPhotoConsent } from "./photoArchiveConsent";

type Decision = { student_key: string; album_id: string; scope_hash: string; publication: boolean; viewing: boolean; guardian_declared: boolean; created_at: string; expires_on: string };
export function archiveConsentScope(album: ArchiveAlbum) {
  const notice = { version: PHOTO_CONSENT_VERSION, school: album.school, classroom: album.classroom, year: album.year, quarter: album.quarter,
    expiresOn: archiveExpiry(album).expiresOn, publication: PHOTO_PUBLICATION_LABEL, viewing: PHOTO_VIEWING_LABEL,
    retention: "공개 종료 후 학생·보호자의 열람은 차단되며 관리자 원본은 별도 보관됩니다.",
    verification: "로그인 계정에 연결된 보호자의 동의 진술을 기록합니다. 보호자 본인·법정대리인 여부는 별도 확인이 필요합니다." };
  return { notice, scopeKey: createHash("sha256").update(JSON.stringify(notice)).digest("hex") };
}
function storage(error: unknown) { if (error) throw new ArchiveError("사진 동의 기록을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503); }
export async function latestArchiveConsents(albumIds: string[], studentKey?: string) {
  if (!albumIds.length) return [] as Decision[];
  const result = await getSupabaseServer().rpc("photo_archive_latest_consents", { p_album_ids: albumIds, p_student_key: studentKey || null });
  storage(result.error); return (result.data || []) as Decision[];
}
export function archiveConsentStatus(album: ArchiveAlbum, decision?: Decision): PhotoConsentStatus {
  const { scopeKey, notice } = archiveConsentScope(album);
  const current = decision?.scope_hash === scopeKey;
  return { scopeKey, version: PHOTO_CONSENT_VERSION, expiresOn: notice.expiresOn, recordedExpiresOn: decision?.expires_on || null, decidedAt: decision?.created_at || null,
    status: !decision ? "pending" : !current ? "renewal" : decision.publication && decision.viewing && decision.guardian_declared ? "accepted" : "declined",
    publication: current && decision?.publication === true, viewing: current && decision?.viewing === true, publicationDeclined: decision?.publication === false };
}
export async function requireArchiveConsent(album: ArchiveAlbum, studentKey: string) {
  const decisions = await latestArchiveConsents([album.id]);
  if (decisions.some(record => record.publication === false)) throw new ArchiveError("사진 공개 비동의 기록이 있어 이 앨범의 열람이 보류되었습니다. 선생님께 문의해 주세요.", 403);
  const decision = decisions.find(record => record.student_key === studentKey);
  if (archiveConsentStatus(album, decision).status !== "accepted") throw new ArchiveError("보호자의 사진 공개 동의와 열람 안내 확인 후 입장할 수 있습니다.", 403);
}
export async function saveArchiveConsent(album: ArchiveAlbum, studentKey: string, body: Record<string, unknown>) {
  const { scopeKey, notice } = archiveConsentScope(album);
  if (body.scopeKey !== scopeKey || body.version !== PHOTO_CONSENT_VERSION) throw new ArchiveError("동의 내용 또는 열람기간이 변경되었습니다. 다시 열어 확인해 주세요.", 409);
  if (typeof body.publication !== "boolean" || typeof body.viewing !== "boolean" || typeof body.guardianDeclared !== "boolean" || (body.publication && !body.guardianDeclared)) throw new ArchiveError("보호자 여부와 각 동의 항목을 확인해 주세요.");
  const [previous] = await latestArchiveConsents([album.id], studentKey);
  // Repeated identical decisions are idempotent; explicit changes are kept as new events.
  if (previous?.scope_hash === scopeKey && previous.publication === body.publication && previous.viewing === body.viewing && previous.guardian_declared === body.guardianDeclared) return archiveConsentStatus(album, previous);
  const result = await getSupabaseServer().from("student_photo_consent_events").insert({ id: randomUUID(), album_id: album.id, student_key: studentKey,
    publication: body.publication, viewing: body.viewing, guardian_declared: body.guardianDeclared,
    policy_version: PHOTO_CONSENT_VERSION, scope_hash: scopeKey, expires_on: notice.expiresOn, notice });
  storage(result.error);
  const [saved] = await latestArchiveConsents([album.id], studentKey);
  if (!saved) throw new ArchiveError("동의 기록 저장을 확인하지 못했습니다. 다시 시도해 주세요.", 503);
  return archiveConsentStatus(album, saved);
}
export async function teacherArchiveConsents(album: ArchiveAlbum): Promise<TeacherPhotoConsent[]> {
  const records = await latestArchiveConsents([album.id]);
  const byKey = new Map(records.map(record => [record.student_key, record]));
  return [...new Set([...album.member_keys, ...byKey.keys()])].map(studentKey => ({ studentKey, ...archiveConsentStatus(album, byKey.get(studentKey)) }));
}
