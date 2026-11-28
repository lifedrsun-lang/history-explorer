#!/usr/bin/env node

const crypto = require("node:crypto");

// Output is limited to counts and UID hash prefixes; identity fields and credentials are never logged.
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const allowMissing = process.argv.includes("--allow-missing");
const requiredEnv = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "STUDENT_DATA_TEACHER_UIDS",
];
const missingEnv = requiredEnv.filter((key) => !String(process.env[key] || "").trim());

if (missingEnv.length > 0) {
  if (allowMissing) {
    console.log(JSON.stringify({ status: "skipped", missingEnvironmentVariableCount: missingEnv.length }));
    process.exit(0);
  }
  console.error(JSON.stringify({ status: "failed", missingEnvironmentVariableCount: missingEnv.length }));
  process.exit(1);
}

const parseUidList = (value) =>
  [...new Set(String(value).split(",").map((item) => item.trim()).filter(Boolean))];
const teacherUids = parseUidList(process.env.STUDENT_DATA_TEACHER_UIDS);
const validUid = /^[A-Za-z0-9_-]{20,128}$/;

if (teacherUids.length === 0 || teacherUids.some((uid) => !validUid.test(uid))) {
  console.error(JSON.stringify({ status: "failed", reason: "invalid_uid_allowlist" }));
  process.exit(1);
}

const normalizePrivateKey = (value) => String(value).replace(/\\n/g, "\n");
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    }),
  });
}

const exactMatch = (left, right) => {
  const normalizedRight = parseUidList(right || "");
  if (normalizedRight.length === 0) return null;
  return JSON.stringify([...left].sort()) === JSON.stringify(normalizedRight.sort());
};

const verify = async () => {
  const result = await getAuth().getUsers(teacherUids.map((uid) => ({ uid })));
  const disabledCount = result.users.filter((user) => user.disabled).length;
  const report = {
    status: result.notFound.length === 0 && disabledCount === 0 ? "passed" : "failed",
    configuredCount: teacherUids.length,
    authFoundCount: result.users.length,
    authMissingCount: result.notFound.length,
    disabledCount,
    uidHashPrefixes: teacherUids.map((uid) =>
      crypto.createHash("sha256").update(uid).digest("hex").slice(0, 12)
    ),
    referenceMatches: {
      studentAuth: exactMatch(teacherUids, process.env.STUDENT_AUTH_TEACHER_UIDS),
      guardian: exactMatch(teacherUids, process.env.GUARDIAN_TEACHER_UIDS),
      schoolEntry: exactMatch(teacherUids, process.env.SCHOOL_ENTRY_TEACHER_UIDS),
    },
  };

  console.log(JSON.stringify(report));
  if (report.status !== "passed") process.exitCode = 1;
};

verify().catch((error) => {
  console.error(JSON.stringify({ status: "failed", errorCode: error?.code || "auth_lookup_failed" }));
  process.exitCode = 1;
});

