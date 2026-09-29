import "server-only";
import { createHash } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
export const ATC_COLLECTION = "teacher_atc_confirmations";
const SETTINGS_COLLECTION = "teacher_atc_mail_settings";
const PROFILE_COLLECTION = "teacher_document_profiles";
export const defaultAtcMailSettings = {
  to: "atc_school@ssem.re.kr",
  bcc: "loveghkql@naver.com",
  subjectTemplate: "{연도} ATC SCHOOL 전담 에듀케이터 참여 확인서_{학교명}_{해당월}_{강사명}",
  bodyTemplate: "안녕하세요.\n\n{학교명} ATC SCHOOL 전담 에듀케이터 {강사명}입니다.\n\n{해당월} 참여확인서를 첨부하여 제출드립니다.\n\n감사합니다.",
};

export type AtcMailSettings = typeof defaultAtcMailSettings;
const clean = (value: unknown, max = 200) => typeof value === "string" ? value.trim().slice(0, max) : "";

export function validateAtcMailSettings(value: Record<string, unknown>): AtcMailSettings {
  const settings = {
    to: clean(value.to, 254), bcc: clean(value.bcc, 254),
    subjectTemplate: clean(value.subjectTemplate, 400),
    bodyTemplate: typeof value.bodyTemplate === "string" ? value.bodyTemplate.trim().slice(0, 4000) : "",
  };
  const email = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
  if (!email.test(settings.to) || !email.test(settings.bcc) || !settings.subjectTemplate || !settings.bodyTemplate) {
    throw new Error("invalid_mail_settings");
  }
  return settings;
}

export async function getAtcMailSettings(uid: string): Promise<AtcMailSettings> {
  const { db } = getFirebaseAdmin();
  const snap = await db.collection(SETTINGS_COLLECTION).doc(uid).get();
  return { ...defaultAtcMailSettings, ...(snap.data() || {}) };
}

export const getAtcMailSettingsRef = (uid: string) => getFirebaseAdmin().db.collection(SETTINGS_COLLECTION).doc(uid);

export type AtcMailDocument = {
  ref: FirebaseFirestore.DocumentReference;
  confirmation: FirebaseFirestore.DocumentData;
  profile: FirebaseFirestore.DocumentData;
  revision: string;
};

export async function getAtcMailDocument(uid: string, id: string): Promise<AtcMailDocument> {
  if (!id || id.length > 400 || !id.startsWith(`${uid}__`)) throw new Error("confirmation_not_found");
  const { db } = getFirebaseAdmin();
  const ref = db.collection(ATC_COLLECTION).doc(id);
  const [snap, profileSnap] = await Promise.all([ref.get(), db.collection(PROFILE_COLLECTION).doc(uid).get()]);
  const confirmation = snap.data();
  const profile = profileSnap.data() || {};
  if (!confirmation || confirmation.teacherUid !== uid) throw new Error("confirmation_not_found");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(clean(confirmation.yearMonth)) ||
      !clean(confirmation.schoolName) || !clean(profile.name) || !clean(confirmation.schoolVerifierName) ||
      !clean(confirmation.schoolSignatureDataUrl, 350_000).startsWith("data:image/png;base64,") ||
      !clean(confirmation.educatorSignatureDataUrlSnapshot, 350_000).startsWith("data:image/png;base64,") ||
      !clean(confirmation.schoolSignedAt) || Number.isNaN(Date.parse(confirmation.schoolSignedAt)) ||
      !clean(confirmation.operationPeriodStart) || !clean(confirmation.operationPeriodEnd) ||
      !Array.isArray(confirmation.scheduleSnapshot) || confirmation.scheduleSnapshot.length === 0) {
    throw new Error("incomplete_confirmation");
  }
  const revision = snap.updateTime?.toDate().toISOString() || "";
  return { ref, confirmation, profile, revision };
}

export function makeAtcMailInfo(doc: AtcMailDocument, settings: AtcMailSettings) {
  const { confirmation, profile } = doc;
  const year = String(confirmation.yearMonth).slice(0, 4);
  const month = `${Number(String(confirmation.yearMonth).slice(5))}월`;
  const rawSchoolName = String(confirmation.schoolName).trim();
  const schoolName = rawSchoolName.endsWith("초") ? `${rawSchoolName.slice(0, -1)}초등학교` : rawSchoolName;
  const fields: Record<string, string> = { 연도: year, 학교명: schoolName, 해당월: month, 강사명: String(profile.name).trim() };
  const render = (template: string) => template.replace(/\{(연도|학교명|해당월|강사명)\}/g, (_match, key: string) => fields[key]);
  const subject = render(settings.subjectTemplate);
  const filename = `${subject.replace(/[\\/:*?"<>|\r\n]/g, "-")}.pdf`;
  return { to: settings.to, bcc: settings.bcc, subject, body: render(settings.bodyTemplate), filename,
    sentAt: clean(confirmation.mailSentAt), mailStatus: clean(confirmation.mailStatus), revision: doc.revision };
}

export const mailFingerprint = (info: ReturnType<typeof makeAtcMailInfo>) =>
  createHash("sha256").update(JSON.stringify(info)).digest("hex");
