const fs = require("node:fs");
const path = require("node:path");

if (process.env.GUARDIAN_RULES_LIVE_CHECK !== "true") {
  console.log("Guardian live Firestore rules probe skipped (GUARDIAN_RULES_LIVE_CHECK is not true).");
  process.exit(0);
}

const source = fs.readFileSync(path.join(__dirname, "..", "lib", "firebase.ts"), "utf8");
const projectId = source.match(/projectId:\s*"([^"]+)"/)?.[1];
if (!projectId) throw new Error("Firebase public project configuration is unavailable.");

const collections = [
  "school_entry_codes",
  "school_entry_code_limits",
  "guardian_school_configs",
  "guardian_student_access",
  "guardian_sessions",
  "guardian_absence_notices",
  "guardian_login_limits",
];
const denied = (status) => status === 401 || status === 403;
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`;
const probeId = "__guardian_rule_probe__";

async function checkCollection(collectionId) {
  const getUrl = `${base}/documents/${collectionId}/${probeId}`;
  const getResponse = await fetch(getUrl, { headers: { Accept: "application/json" } });
  if (!denied(getResponse.status)) {
    const diagnostic = await getResponse.json().catch(() => ({}));
    const statusName = typeof diagnostic?.error?.status === "string" ? diagnostic.error.status : "unknown";
    const message = typeof diagnostic?.error?.message === "string" ? diagnostic.error.message.slice(0, 300) : "no diagnostic message";
    throw new Error(`${collectionId}: anonymous direct get was not denied (HTTP ${getResponse.status}, ${statusName}: ${message}).`);
  }

  const referenceValue = `projects/${projectId}/databases/(default)/documents/${collectionId}/${probeId}`;
  const queryResponse = await fetch(`${base}/documents:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: "__name__" },
            op: "EQUAL",
            value: { referenceValue },
          },
        },
        limit: 1,
      },
    }),
  });
  if (!denied(queryResponse.status)) {
    throw new Error(`${collectionId}: anonymous direct list/query was not denied (HTTP ${queryResponse.status}).`);
  }
  return { collectionId, get: getResponse.status, list: queryResponse.status };
}

(async () => {
  const results = [];
  for (const collectionId of collections) results.push(await checkCollection(collectionId));
  console.log(`Guardian live Firestore rules probe passed: ${results.length} collections; anonymous get/list denied.`);
})().catch((error) => {
  console.error(error instanceof Error ? error.message : "Guardian live Firestore rules probe failed.");
  process.exit(1);
});
