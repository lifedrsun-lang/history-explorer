export const PHOTO_CONSENT_VERSION = "2026-10-19.v2";
export const PHOTO_PUBLICATION_LABEL = "저는 이 학생의 법정대리인이며, 해당 분기 수업 활동사진에 나온 자녀의 모습을 같은 학교·수업 반·분기 수강생과 보호자에게 공개하는 데 동의합니다.";
export const PHOTO_VIEWING_LABEL = "사진은 수업 추억 확인 및 개인 보관 목적으로 열람·다운로드하며, 다른 학생의 사진을 외부에 공유·게시하지 않겠습니다. 다운로드는 학생 계정별 사진 한 장당 3회까지 제공됩니다. 열람 종료 후에도 이미 저장한 파일은 자동 회수되지 않습니다.";
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
