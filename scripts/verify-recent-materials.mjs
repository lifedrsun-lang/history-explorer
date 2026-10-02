import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { Timestamp } = require("firebase-admin/firestore");
const load = (path, mocks = {}) => {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { module: compiledModule, exports: compiledModule.exports,
    require: (name) => name in mocks ? mocks[name] : require(name), Response, console, Error, SyntaxError });
  return compiledModule.exports;
};

const recent = load("lib/presentations/recentMaterials.ts");
const cards = Array.from({ length: 6 }, (_, i) => ({ key: `named:history:card:${i}`, title: `자료 ${i}` }));
const order = JSON.stringify(cards);
const keys = ["deleted", ...cards.map((card) => card.key).reverse(), cards[0].key];
assert.deepEqual(Array.from(recent.getRecentMaterials(cards, keys, (card) => card.key), (card) => card.title), ["자료 5", "자료 4", "자료 3", "자료 2"]);
assert.equal(JSON.stringify(cards), order);
cards[5].title = "수정된 이름";
assert.equal(recent.getRecentMaterials(cards, keys, (card) => card.key)[0].title, "수정된 이름");
assert.equal(recent.getRecentMaterials(cards.slice(0, 5), keys, (card) => card.key)[0].key, cards[4].key);

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const Layout = load("app/teacher/presentations/ResourceLibraryLayout.tsx", { "@/lib/presentations/recentMaterials": recent }).default;
const props = { items: cards, getSummary: (card) => ({ ...card, category: "역사" }), renderDetail: (card) => card.title };
assert.equal(renderToStaticMarkup(React.createElement(Layout, props)).includes("data-recent-materials"), false);
const html = renderToStaticMarkup(React.createElement(Layout, { ...props, recentKeys: keys }));
assert.equal((html.match(/data-resource-card=/g) || []).length, 10); // Four shortcuts plus all six cards.
assert.ok(html.includes("최근 사용한 자료") && html.includes("전체 자료"));
assert.ok(!html.includes("즐겨찾기") && !html.includes("☆"));

const histories = new Map();
let clock = 0;
const marker = Symbol("serverTimestamp");
const db = { collection: (collection) => {
  assert.equal(collection, "teacher_recent_materials");
  return { doc: (uid) => ({ collection: (subcollection) => {
    assert.equal(subcollection, "cards");
    const entries = histories.get(uid) || new Map();
    histories.set(uid, entries);
    return { doc: (id) => ({ set: async (data) => {
      assert.equal(data.lastOpenedAt, marker);
      entries.set(id, { ...data, lastOpenedAt: Timestamp.fromMillis(++clock) });
    } }), orderBy: (field, direction) => {
      assert.equal(field, "lastOpenedAt"); assert.equal(direction, "desc");
      return { get: async () => ({ docs: [...entries.values()].sort((a, b) => b.lastOpenedAt.toMillis() - a.lastOpenedAt.toMillis()).map((data) => ({ data: () => data })) }) };
    } };
  } }) };
} };
const route = load("app/api/teacher/recent-materials/route.ts", {
  "firebase-admin/firestore": { Timestamp, FieldValue: { serverTimestamp: () => marker } },
  "@/lib/firebaseAdmin": { getFirebaseAdmin: () => ({ db }) },
  "@/lib/presentations/catalog": load("lib/presentations/catalog.ts"),
  "@/lib/assignmentServer": {
    verifyTeacherRequest: async (request) => {
      const token = request.headers.get("authorization");
      if (!token) throw new Error("teacher_auth_required");
      return { uid: token.slice(7) };
    },
    jsonError: (error, status = 400) => Response.json({ error }, { status }),
    handleRouteError: (error) => { throw error; },
  },
});
const request = (uid, body) => new Request("https://example.test/api/teacher/recent-materials", {
  method: body === undefined ? "GET" : "POST", headers: uid ? { Authorization: `Bearer ${uid}` } : {},
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
assert.equal((await route.GET(request())).status, 401);
assert.equal((await route.POST(request("account-a", { cardKey: "invalid" }))).status, 400);
for (const card of cards) assert.equal((await route.POST(request("account-a", { cardKey: card.key, uid: "account-b" }))).status, 200);
let response = await route.GET(request("account-a"));
assert.equal(response.headers.get("cache-control"), "private, no-store");
assert.equal((await response.json()).materials[0].cardKey, cards[5].key);
assert.equal((await (await route.GET(request("account-b"))).json()).materials.length, 0);
await route.POST(request("account-a", { cardKey: cards[0].key }));
const data = await (await route.GET(request("account-a"))).json();
assert.equal(data.materials.length, 6);
assert.equal(data.materials[0].cardKey, cards[0].key);
assert.equal(data.materials[0].openedAt, 7);
console.log("PASS: latest four, no duplicates, original order, rename/deletion, empty region, shared card UI, account isolation, auth/input validation, server timestamps, re-open ordering, no-store responses");
