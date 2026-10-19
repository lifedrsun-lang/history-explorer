export type ArchiveAlbum = {
  id: string; owner_uid: string; school: string; classroom: string; year: number; quarter: number;
  title: string; description: string; term_end_date: string; end_date_source: string;
  expires_on: string | null; published: boolean; consent_verified: boolean; consent_note: string;
  roster_verified: boolean; roster_source: string; member_keys: string[]; revision: number;
  created_at: string; updated_at: string;
};
export type ArchivePhoto = { id: string; album_id: string; caption: string; width: number; height: number; created_at: string };
export type StudentAlbum = Pick<ArchiveAlbum, "id" | "school" | "classroom" | "year" | "quarter" | "title" | "description"> & { expiresOn: string; expiresAt: number; daysLeft: number; consent?: import("./photoArchiveConsent").PhotoConsentStatus };
export class ArchiveError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function archiveId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9-]{36}$/.test(value)) throw new ArchiveError("잘못된 앨범 또는 사진입니다.");
  return value;
}
export function archiveDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new ArchiveError("실제 날짜를 확인해 주세요.");
  return value;
}
const DAY = 86_400_000;
export function archiveExpiry(album: Pick<ArchiveAlbum, "term_end_date" | "expires_on">, now = Date.now()) {
  const latestExpiry = new Date(Date.parse(archiveDate(album.term_end_date)) + 14 * DAY).toISOString().slice(0, 10);
  const manualExpiry = album.expires_on ? archiveDate(album.expires_on) : null;
  // Apply the limit on reads too, including legacy records with a later manual date.
  const expiresOn = manualExpiry && manualExpiry < latestExpiry ? manualExpiry : latestExpiry;
  // Date-only arithmetic is UTC; cutoff is the following midnight in Korea (UTC+9).
  const expiresAt = Date.parse(expiresOn + "T00:00:00+09:00") + DAY;
  const today = new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);
  return { expiresOn, expiresAt, daysLeft: Math.round((Date.parse(expiresOn) - Date.parse(today)) / DAY) };
}
export function canReadArchive(album: ArchiveAlbum, studentKey: string, enrollmentTerms: string[], now = Date.now()) {
  return album.published === true && album.consent_verified === true && album.roster_verified === true
    && album.member_keys.includes(studentKey) && enrollmentTerms.includes(`${album.year}-Q${album.quarter}`)
    && now < archiveExpiry(album, now).expiresAt;
}
export function studentAlbum(album: ArchiveAlbum, now = Date.now()): StudentAlbum {
  const { id, school, classroom, year, quarter, title, description } = album;
  return { id, school, classroom, year, quarter, title, description, ...archiveExpiry(album, now) };
}
function text(value: unknown, max: number, required = false): string {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new ArchiveError("입력 내용을 확인해 주세요.");
  return value.trim();
}
export function validateArchiveInput(body: Record<string, unknown>) {
  const year = Number(body.year), quarter = Number(body.quarter);
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) throw new ArchiveError("연도와 분기를 확인해 주세요.");
  if (!Array.isArray(body.member_keys) || body.member_keys.length > 500 || body.member_keys.some(k => typeof k !== "string" || !/^(students|student|Students|Student):[^/\s:]{1,128}$/.test(k))) throw new ArchiveError("실제 분기 수강생 명부를 확인해 주세요.");
  const member_keys = [...new Set(body.member_keys)] as string[];
  const value = {
    school: text(body.school, 150, true), classroom: text(body.classroom, 100, true), year, quarter,
    title: text(body.title, 200, true), description: text(body.description, 3000),
    term_end_date: archiveDate(body.term_end_date), end_date_source: text(body.end_date_source, 500, true),
    expires_on: body.expires_on ? archiveDate(body.expires_on) : null,
    published: body.published === true, consent_verified: body.consent_verified === true,
    consent_note: text(body.consent_note, 500), roster_verified: body.roster_verified === true,
    roster_source: text(body.roster_source, 500), member_keys,
  };
  if (value.expires_on && value.expires_on > archiveExpiry({ ...value, expires_on: null }).expiresOn) throw new ArchiveError("공개 종료일은 실제 분기 종료일 + 14일을 넘길 수 없습니다.");
  if (value.published && (!value.consent_verified || !value.consent_note || !value.roster_verified || !value.roster_source || !member_keys.length)) throw new ArchiveError("공개 전 사진 동의와 당시 학교·반 명부의 확인 기록이 필요합니다.");
  return value;
}
// Stable, irregular constellation. Appending a photo does not move earlier photos.
export function archiveLayout(ids: string[]) {
  const points: { id: string; x: number; y: number; angle: number; scale: number }[] = [];
  ids.forEach((id, i) => {
    let hash = 0; for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    const angle = i * 2.399963229728653 + (hash % 15) / 100;
    let radius = i ? 230 * Math.sqrt(i) : 0;
    let x = Math.cos(angle) * radius, y = Math.sin(angle) * radius * .8;
    while (points.some(p => Math.abs(p.x - x) < 240 && Math.abs(p.y - y) < 200)) {
      radius += 35; x = Math.cos(angle) * radius; y = Math.sin(angle) * radius * .8;
    }
    points.push({ id, x, y, angle: (hash % 13) - 6, scale: .92 + (hash % 17) / 100 });
  });
  return points;
}
