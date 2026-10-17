import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getContractSchool } from "@/lib/contractSchoolsServer";

function resetDocument(slug: string, classroomId: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100 ||
      !/^[1-6]-(?:[1-9]|[12][0-9]|30)$/.test(classroomId)) {
    throw new Error("invalid_classroom");
  }
  // A separate document prevents a stale school-settings save from overwriting
  // this signal. Only the server writes it; public responses omit the actor.
  return getFirebaseAdmin().db.collection("classroom_lockout_resets")
    .doc(`${slug}__${classroomId}`);
}

export async function readClassroomLockoutReset(slug: string, classroomId: string) {
  const snapshot = await resetDocument(slug, classroomId).get();
  return { resetAt: snapshot.data()?.resetAt?.toMillis?.() || 0, serverNow: Date.now() };
}

export async function resetClassroomLockout(slug: string, classroomId: string, teacherUid: string) {
  const ref = resetDocument(slug, classroomId);
  const school = await getContractSchool(slug, { includeUnpublished: true });
  if (!school?.classrooms.some((classroom) => classroom.id === classroomId)) {
    throw new Error("classroom_not_found");
  }
  await ref.set({ resetAt: FieldValue.serverTimestamp(), resetBy: teacherUid });
  return { reset: true };
}
