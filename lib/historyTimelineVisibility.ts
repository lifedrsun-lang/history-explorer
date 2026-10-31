import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

const SETTINGS_COLLECTION = "history_timeline_settings";
const SETTINGS_DOCUMENT = "global";

// 배포 직후에는 전체 학생 미노출이 기본값이다.
// 이 문서가 없거나 값이 명시적으로 true가 아니면 학생에게 공개하지 않는다.
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
    {
      studentVisible,
      updatedBy: teacherUid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};
