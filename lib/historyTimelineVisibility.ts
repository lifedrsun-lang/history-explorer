import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

const SETTINGS_COLLECTION = "history_timeline_settings";
const SETTINGS_DOCUMENT = "global";

// 전체 공개가 꺼져도 교사가 승인한 학생 계정 한 개만 예외로 허용한다.
// 이름이 아니라 서버에서 조회한 Firestore 학생 문서의 권한 필드를 확인한다.
export const isHistoryTimelineVisibleForStudent = async (
  student: Record<string, unknown>
): Promise<boolean> => {
  if (student.timelineVisibleWhileHidden === true) return true;
  return getHistoryTimelineStudentVisible();
};

export const getHistoryTimelineStudentVisible = async (): Promise<boolean> => {
  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOCUMENT).get();
  return snapshot.data()?.studentVisible === true;
};

export const setHistoryTimelineStudentVisible = async (
  studentVisible: boolean,
  teacherUid: string
): Promise<void> => {
  const { db } = getFirebaseAdmin();
  await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOCUMENT).set(
    { studentVisible, updatedBy: teacherUid, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
};
