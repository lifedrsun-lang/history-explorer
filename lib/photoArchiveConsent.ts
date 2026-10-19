export const PHOTO_CONSENT_VERSION = "2026-10-19.v1";
export const PHOTO_PUBLICATION_LABEL = "저는 이 학생의 법정대리인이며, 해당 분기 수업 활동사진에 나온 자녀의 모습을 같은 학교·수업 반·분기 수강생과 보호자에게 공개하는 데 동의합니다.";
export const PHOTO_VIEWING_LABEL = "사진은 수업 추억 확인 목적으로만 열람하고, 다른 학생의 사진을 외부에 공유·게시하지 않겠습니다.";
export type PhotoConsentStatus = {
  status: "pending" | "accepted" | "declined" | "renewal";
  scopeKey: string;
  version: string;
  decidedAt: string | null;
  expiresOn: string;
  recordedExpiresOn: string | null;
  publication: boolean;
  viewing: boolean;
  publicationDeclined: boolean;
};
export type TeacherPhotoConsent = PhotoConsentStatus & { studentKey: string };
