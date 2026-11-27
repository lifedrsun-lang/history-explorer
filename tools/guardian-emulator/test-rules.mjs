import fs from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";

const rules = fs.readFileSync(new URL("./firestore.rules.local", import.meta.url), "utf8");
const teacherUid = [...new Set([...rules.matchAll(/request\.auth\.uid\s*==\s*(["'])([^"'\\]+)\1/g)].map((match) => match[2]))][0];
if (!teacherUid) throw new Error("Approved teacher UID literal was not found in the backed-up Ruleset.");

const protectedCollections = [
  "school_entry_codes",
  "school_entry_code_limits",
  "guardian_school_configs",
  "guardian_student_access",
  "guardian_sessions",
  "guardian_absence_notices",
  "guardian_login_limits",
];
const deniedUids = [
  null,
  "synthetic-student-a",
  "synthetic-student-b",
  "synthetic-guardian-a",
  "synthetic-guardian-b",
  "synthetic-teacher-denied",
  teacherUid,
];

const environment = await initializeTestEnvironment({
  projectId: "demo-sunlab-guardian",
  firestore: { host: "127.0.0.1", port: 8080, rules },
});
let directDenied = 0;
let adminBypass = 0;
let presentationTeacherAllowed = 0;
let presentationOutsiderDenied = 0;
let existingStudentsAnonymousAllowed = 0;

try {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const name of protectedCollections) {
      for (const id of ["read-target", "update-target", "delete-target", "child-a", "child-b"]) {
        await setDoc(doc(db, name, id), { ownerId: id.endsWith("a") ? "synthetic-student-a" : "synthetic-student-b", value: 1 });
      }
    }
    await setDoc(doc(db, "presentations", "sample"), { value: 1 });
    await setDoc(doc(db, "students", "public-risk"), { value: 1 });
  });

  for (const uid of deniedUids) {
    const db = uid ? environment.authenticatedContext(uid).firestore() : environment.unauthenticatedContext().firestore();
    for (const name of protectedCollections) {
      await assertFails(getDoc(doc(db, name, "read-target"))); directDenied += 1;
      await assertFails(getDocs(collection(db, name))); directDenied += 1;
      await assertFails(setDoc(doc(db, name, `create-${uid || "anonymous"}`), { value: 1 })); directDenied += 1;
      await assertFails(updateDoc(doc(db, name, "update-target"), { value: 2 })); directDenied += 1;
      await assertFails(deleteDoc(doc(db, name, "delete-target"))); directDenied += 1;
    }
  }

  const guardianA = environment.authenticatedContext("synthetic-guardian-a").firestore();
  const guardianB = environment.authenticatedContext("synthetic-guardian-b").firestore();
  await assertFails(getDoc(doc(guardianA, "guardian_student_access", "child-b"))); directDenied += 1;
  await assertFails(getDoc(doc(guardianB, "guardian_absence_notices", "child-a"))); directDenied += 1;

  const teacher = environment.authenticatedContext(teacherUid).firestore();
  const outsider = environment.authenticatedContext("synthetic-teacher-denied").firestore();
  await assertSucceeds(getDoc(doc(teacher, "presentations", "sample"))); presentationTeacherAllowed += 1;
  await assertSucceeds(setDoc(doc(teacher, "presentations", "teacher-write"), { value: 1 })); presentationTeacherAllowed += 1;
  await assertSucceeds(updateDoc(doc(teacher, "presentations", "sample"), { value: 2 })); presentationTeacherAllowed += 1;
  await assertSucceeds(deleteDoc(doc(teacher, "presentations", "teacher-write"))); presentationTeacherAllowed += 1;
  await assertFails(getDoc(doc(outsider, "presentations", "sample"))); presentationOutsiderDenied += 1;
  await assertFails(setDoc(doc(outsider, "presentations", "outsider-write"), { value: 1 })); presentationOutsiderDenied += 1;

  const anonymous = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(anonymous, "students", "public-risk"))); existingStudentsAnonymousAllowed += 1;
  await assertSucceeds(getDocs(collection(anonymous, "students"))); existingStudentsAnonymousAllowed += 1;
  await assertSucceeds(setDoc(doc(anonymous, "students", "anonymous-write"), { value: 1 })); existingStudentsAnonymousAllowed += 1;
  await assertSucceeds(updateDoc(doc(anonymous, "students", "public-risk"), { value: 2 })); existingStudentsAnonymousAllowed += 1;
  await assertSucceeds(deleteDoc(doc(anonymous, "students", "anonymous-write"))); existingStudentsAnonymousAllowed += 1;

  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const name of protectedCollections) {
      const reference = doc(db, name, "admin-cycle");
      await setDoc(reference, { value: 1 }); adminBypass += 1;
      await getDoc(reference); adminBypass += 1;
      await updateDoc(reference, { value: 2 }); adminBypass += 1;
      await deleteDoc(reference); adminBypass += 1;
    }
  });

  console.log("GUARDIAN_EMULATOR_RESULT=" + JSON.stringify({
    collections: protectedCollections.length,
    directDeniedAssertions: directDenied,
    crossChildAssertions: 2,
    adminBypassAssertions: adminBypass,
    presentationTeacherAllowed,
    presentationOutsiderDenied,
    existingStudentsAnonymousAllowed,
    teacherUidExposed: false,
    result: "pass-with-existing-students-critical-risk",
  }));
} finally {
  await environment.cleanup();
}
