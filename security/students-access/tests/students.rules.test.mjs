import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const projectId = "sunlab-students-security-test";
const rulesPath = fileURLToPath(new URL("../firestore.rules", import.meta.url));
const studentId = "virtual-student-a";
let testEnv;

const virtualStudent = {
  name: "�����л�A",
  school: "������",
  studentNumber: "01",
  password: "not-a-real-secret",
  bronze: 3,
  silver: 1,
};

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8088,
      rules: readFileSync(rulesPath, "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "students", studentId), virtualStudent);
    await setDoc(doc(context.firestore(), "sunlab_student_sessions", "virtual-session"), {
      studentId,
      expiresAt: Date.now() + 60_000,
    });
  });
});

after(async () => {
  await testEnv?.cleanup();
});

const deniedClientCases = [
  ["anonymous", () => testEnv.unauthenticatedContext()],
  ["arbitrary Firebase user", () => testEnv.authenticatedContext("unrelated-user")],
  [
    "student-like Firebase user",
    () => testEnv.authenticatedContext(studentId, { role: "student", studentId }),
  ],
  [
    "teacher-claim Firebase user",
    () => testEnv.authenticatedContext("virtual-teacher", { role: "teacher" }),
  ],
];

for (const [label, contextFactory] of deniedClientCases) {
  test(`${label}: students get is denied`, async () => {
    const db = contextFactory().firestore();
    await assertFails(getDoc(doc(db, "students", studentId)));
  });

  test(`${label}: students list is denied`, async () => {
    const db = contextFactory().firestore();
    await assertFails(getDocs(collection(db, "students")));
  });

  test(`${label}: students create is denied`, async () => {
    const db = contextFactory().firestore();
    await assertFails(setDoc(doc(db, "students", "virtual-student-b"), virtualStudent));
  });

  test(`${label}: students update is denied`, async () => {
    const db = contextFactory().firestore();
    await assertFails(updateDoc(doc(db, "students", studentId), { bronze: 999 }));
  });

  test(`${label}: students delete is denied`, async () => {
    const db = contextFactory().firestore();
    await assertFails(deleteDoc(doc(db, "students", studentId)));
  });

  test(`${label}: session document is denied`, async () => {
    const db = contextFactory().firestore();
    await assertFails(getDoc(doc(db, "sunlab_student_sessions", "virtual-session")));
  });
}

for (const legacyCollection of ["student", "Students", "Student"]) {
  test(`legacy collection ${legacyCollection} is denied`, async () => {
    const db = testEnv.authenticatedContext("virtual-teacher", { role: "teacher" }).firestore();
    await assertFails(getDocs(collection(db, legacyCollection)));
    await assertFails(setDoc(doc(db, legacyCollection, "virtual-student"), virtualStudent));
  });
}

test("Admin SDK equivalent test context can create, read, update, and delete", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const ref = doc(context.firestore(), "students", "virtual-admin-test");
    await assertSucceeds(setDoc(ref, virtualStudent));
    const created = await assertSucceeds(getDoc(ref));
    assert.equal(created.data()?.name, virtualStudent.name);
    await assertSucceeds(updateDoc(ref, { bronze: 4 }));
    const updated = await assertSucceeds(getDoc(ref));
    assert.equal(updated.data()?.bronze, 4);
    await assertSucceeds(deleteDoc(ref));
  });
});

