import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
function load(file, deps = {}) {
  const source = fs.readFileSync(new URL(file, root), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: (id) => {
    if (id in deps) return deps[id];
    throw new Error(`Unexpected dependency: ${id}`);
  }, Response, Request, URL, Buffer, Date, Error, console });
  return exports;
}
const educator = load("lib/atcEducator.ts");
const sig = (value) => `data:image/png;base64,${Buffer.from(value).toString("base64")}`;
const profile = { name: "이화선", phone: "01000000000", signatureDataUrl: sig("default") };
const school = { schoolName: "검증초", displayName: "검증초", assignedName: "이화선" };
const records = new Map();
const writes = [];
let tick = 0;
function snapshot(id, data) {
  return { id, exists: Boolean(data), data: () => data,
    updateTime: data ? { toDate: () => new Date(1_800_000_000_000 + tick) } : undefined };
}
const db = {
  collection(collection) {
    return {
      doc(id) { return { collection, id, get: async () => snapshot(id, collection === "teacher_document_profiles" ? profile : records.get(id)) }; },
      get: async () => ({ docs: collection === "teacher_atc_confirmations"
        ? [...records].map(([id, data]) => snapshot(id, data))
        : collection === "contract_school_configs" ? [snapshot("school", school)] : [] }),
      where() { return { get: async () => ({ docs: [snapshot("setting", { schoolName: "검증초", contactName: "학교교사" })] }) }; },
    };
  },
  async runTransaction(fn) {
    return fn({ get: (ref) => ref.get(), set(ref, data) {
      writes.push(ref.collection);
      records.set(ref.id, { ...(records.get(ref.id) || {}), ...data });
      tick += 1;
    } });
  },
};
const deps = {
  "firebase-admin/firestore": { FieldValue: { serverTimestamp: () => "timestamp" } },
  "@/lib/assignmentServer": {
    verifyTeacherRequest: async () => ({ uid: "teacher" }),
    jsonError: (error, status = 500, code) => Response.json({ error, code }, { status }),
    handleRouteError: (error) => { throw error; },
  },
  "@/lib/firebaseAdmin": { getFirebaseAdmin: () => ({ db }) },
  "@/lib/atcEducator": educator,
  "@/lib/schoolDocumentManagement": { SCHOOL_DOCUMENT_SETTINGS_COLLECTION: "teacher_school_document_settings" },
  "@/lib/contractSchools": { CONTRACT_SCHOOL_COLLECTION: "contract_school_configs", DEFAULT_CONTRACT_SCHOOLS: [] },
  "@/lib/schoolDocuments": { isSameSchoolDocument: (a, b) => a === b },
};
const route = load("app/api/teacher/atc-confirmations/route.ts", deps);
const original = JSON.stringify({ profile, school });
const draft = { yearMonth: "2026-09", schoolName: "검증초", schoolVerifierName: "학교교사",
  schoolSignatureDataUrl: sig("school"), educatorName: "이화선", educatorSignatureName: "이화선",
  educatorSignatureDataUrlSnapshot: profile.signatureDataUrl, operationPeriodStart: "2026-09-01", operationPeriodEnd: "2026-12-31",
  scheduleSnapshot: [{ eventId: "event", calendarType: "contract", date: "2026-09-18", summary: "검증초 / 1차시" }], revision: "" };
const request = (body) => new Request("https://sunlab.test/api/teacher/atc-confirmations", { method: "PUT", body: JSON.stringify(body) });
async function save(body, status = 200) {
  const response = await route.PUT(request(body));
  assert.equal(response.status, status);
  return response.json();
}
// 1: Defaults are read from existing records, with no assignment writes.
let initial = await (await route.GET(new Request("https://sunlab.test/api/teacher/atc-confirmations?yearMonth=2026-09"))).json();
assert.equal(initial.defaultEducatorName, "이화선");
assert.equal(initial.schoolDefaults[0].schoolVerifierName, "학교교사");
assert.equal(educator.resolveAtcEducatorName(undefined, initial.defaultEducatorName), "이화선");
// 2–4: A different typed name and its new signature are stored together.
const changed = { ...draft, educatorName: "김진우", educatorSignatureName: "김진우", educatorSignatureDataUrlSnapshot: sig("kim") };
let saved = (await save(changed)).confirmation;
assert.equal(saved.confirmedEducatorName, "김진우");
assert.equal(saved.educatorSignatureName, "김진우");
assert.equal(saved.educatorSignatureCompleted, true);
assert.ok(saved.educatorSignedAt);
// 5: Reloading ignores a subsequent change of the shared profile's name.
profile.name = "다른배정자";
let reloaded = await (await route.GET(new Request("https://sunlab.test/api/teacher/atc-confirmations"))).json();
assert.equal(educator.resolveAtcEducatorName(reloaded.confirmations[0], reloaded.defaultEducatorName), "김진우");
profile.name = "이화선";
// 6: The only writes have been to the confirmation collection.
assert.equal(JSON.stringify({ profile, school }), original);
assert.ok(writes.every((collection) => collection === "teacher_atc_confirmations"));
// 7: Changed name with no signature, stale signature, or mismatched signer is rejected.
const revision = saved.revision;
await save({ ...changed, revision, educatorName: "이현주", educatorSignatureName: "", educatorSignatureDataUrlSnapshot: null }, 400);
await save({ ...changed, revision, educatorName: "이현주", educatorSignatureName: "이현주" }, 400);
await save({ ...changed, revision, educatorName: "이현주", educatorSignatureDataUrlSnapshot: sig("lee") }, 400);
await save({ ...changed, revision, educatorName: "이현주", educatorSignatureName: "이현주", educatorSignatureDataUrlSnapshot: profile.signatureDataUrl }, 400);
assert.equal(records.get(saved.id).confirmedEducatorName, "김진우");
// 8: New signature replaces the confirmed identity; old school consent is invalidated.
saved = (await save({ ...changed, revision, educatorName: "이현주", educatorSignatureName: "이현주", educatorSignatureDataUrlSnapshot: sig("lee") })).confirmation;
assert.equal(saved.confirmedEducatorName, "이현주");
assert.equal(saved.schoolSignatureDataUrl, null);
assert.equal(saved.submittedAt, "");
assert.equal(educator.resolveAtcEducatorName(saved, "이화선"), "이현주");
await save({ ...changed, revision }, 409);
// Existing records without new fields still display their saved signature.
assert.equal(educator.resolveAtcEducatorSignature({ educatorSignatureDataUrlSnapshot: sig("legacy") }, "이화선", null), sig("legacy"));
assert.equal(educator.resolveAtcEducatorSignature({ ...saved, educatorSignatureCompleted: false }, "이화선", profile.signatureDataUrl), null);
assert.equal(JSON.stringify({ profile, school }), original);
console.log("PASS: ATC educator scenarios 1–8, legacy compatibility, stale-write rejection, and shared-data isolation");
