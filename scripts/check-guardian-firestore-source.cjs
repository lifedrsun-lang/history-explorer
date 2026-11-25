const { createHash, createSign } = require("node:crypto");

if (process.env.GUARDIAN_RULES_SOURCE_CHECK !== "true") {
  console.log("Guardian deployed Firestore rules source audit skipped (GUARDIAN_RULES_SOURCE_CHECK is not true).");
  process.exit(0);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey) throw new Error("Firebase Admin read-only rules audit credentials are unavailable.");

const collections = [
  "school_entry_codes",
  "school_entry_code_limits",
  "guardian_school_configs",
  "guardian_student_access",
  "guardian_sessions",
  "guardian_absence_notices",
  "guardian_login_limits",
];

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).end().sign(privateKey).toString("base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== "string") throw new Error(`Firebase rules audit token request failed (HTTP ${response.status}).`);
  return payload.access_token;
}

async function firebaseGet(token, resource) {
  const response = await fetch(`https://firebaserules.googleapis.com/v1/${resource}`, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const status = typeof payload?.error?.status === "string" ? payload.error.status : "unknown";
    throw new Error(`Firebase Rules API read failed (HTTP ${response.status}, ${status}).`);
  }
  return payload;
}

function ruleMatches(content) {
  const lines = content.split(/\r?\n/);
  const broad = [];
  let offset = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("match /") && trimmed.includes("{")) {
      const openInLine = line.lastIndexOf("{");
      const pattern = line.slice(line.indexOf("match ") + 6, openInLine).trim();
      const onlyWildcards = pattern.replace(/\{[^}]+\}/g, "").replaceAll("/", "").trim() === "";
      if (pattern.includes("=**") || onlyWildcards) {
        const start = offset + openInLine;
        let depth = 0, end = start;
        for (; end < content.length; end += 1) {
          if (content[end] === "{") depth += 1;
          else if (content[end] === "}") { depth -= 1; if (depth === 0) { end += 1; break; } }
        }
        const block = content.slice(start, end);
        const allows = [...block.matchAll(/allow\s+([^:]+):\s*if\s+([^;]+);/g)].map((match) => {
          const compact = match[2].replace(/[()\s]/g, "");
          const functionCall = /(^|[!&|=,])([A-Za-z_]\w*)\(/.test(compact);
          let classification = "other-unverified";
          if (compact === "true") classification = "public";
          else if (compact === "false") classification = "deny";
          else if (compact.includes("request.auth.uid")) classification = "uid-or-identity-restricted";
          else if (compact.includes("request.auth!=null") && !functionCall) classification = "any-authenticated";
          else if (functionCall) classification = "function-gated-unverified";
          else if (compact.includes("request.auth")) classification = "auth-condition-unverified";
          return { operations: match[1].replace(/\s/g, ""), classification };
        });
        const active = allows.filter((allow) => allow.classification !== "deny");
        if (active.length) broad.push({ pattern, allows: active });
      }
    }
    offset += line.length + 1;
  }
  return broad;
}

(async () => {
  const token = await accessToken();
  let release;
  try { release = await firebaseGet(token, `projects/${projectId}/releases/cloud.firestore`); }
  catch { release = await firebaseGet(token, `projects/${projectId}/releases/cloud.firestore/(default)`); }
  if (typeof release.rulesetName !== "string") throw new Error("Active Firestore release has no ruleset reference.");
  const ruleset = await firebaseGet(token, release.rulesetName);
  const files = Array.isArray(ruleset?.source?.files) ? ruleset.source.files : [];
  const contents = files.map((file) => typeof file.content === "string" ? file.content : "").filter(Boolean);
  if (!contents.length) throw new Error("Active Firestore rules source is empty.");
  const combined = contents.join("\n");
  const broad = ruleMatches(combined);
  const explicit = collections.filter((collection) => combined.includes(`match /${collection}/`));
  const digest = createHash("sha256").update(combined).digest("hex").slice(0, 16);
  const broadSummary = broad.map(({ pattern, allows }) =>
    `${pattern}[${allows.map(({ operations, classification }) => `${operations}:${classification}`).join("|")}]`
  ).join(",");
  console.log(`Guardian deployed Firestore rules source audit summary: files=${files.length}, lines=${combined.split(/\r?\n/).length}, sha256=${digest}, explicitGuardianMatches=${explicit.length}/7, permissiveBroadMatches=${broad.length}, broadClassifications=${broadSummary || "none"}.`);
  if (broad.length) throw new Error("Active Firestore rules contain all-document allow rules; guardian feature activation remains blocked.");
  console.log("Guardian deployed Firestore rules source audit passed.");
})().catch((error) => {
  console.error(error instanceof Error ? error.message : "Guardian deployed Firestore rules source audit failed.");
  process.exit(1);
});
