import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import {
  AFTER_SCHOOL_SCHOOLS,
  AFTER_SCHOOL_STATUS_COLLECTION,
  getAfterSchoolSchool,
  isAfterSchoolStatus,
  type AfterSchoolStatus,
  type AfterSchoolStatusMap,
} from "@/lib/afterSchool";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

type StoredAfterSchoolStatus = {
  status?: unknown;
};

export const getAfterSchoolStatuses = async (): Promise<AfterSchoolStatusMap> => {
  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection(AFTER_SCHOOL_STATUS_COLLECTION).get();
  const statuses: AfterSchoolStatusMap = Object.fromEntries(
    AFTER_SCHOOL_SCHOOLS.map((school) => [school.slug, school.status])
  );

  snapshot.forEach((document) => {
    if (!getAfterSchoolSchool(document.id)) return;
    const storedStatus = (document.data() as StoredAfterSchoolStatus).status;
    if (isAfterSchoolStatus(storedStatus)) {
      statuses[document.id] = storedStatus;
    }
  });

  return statuses;
};

export const updateAfterSchoolStatus = async (
  slugValue: unknown,
  statusValue: unknown,
  teacherUid: string
): Promise<{ slug: string; status: AfterSchoolStatus }> => {
  const slug = String(slugValue || "").trim();
  const school = getAfterSchoolSchool(slug);

  if (!school) throw new Error("after_school_not_found");
  if (!isAfterSchoolStatus(statusValue)) throw new Error("invalid_status");

  const { db } = getFirebaseAdmin();
  await db.collection(AFTER_SCHOOL_STATUS_COLLECTION).doc(slug).set(
    {
      status: statusValue,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: teacherUid,
    },
    { merge: true }
  );

  return { slug, status: statusValue };
};
