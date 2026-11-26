const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const code = ts.transpileModule(fs.readFileSync("lib/atcGmailServer.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
}).outputText;
const mod = { exports: {} };
vm.runInNewContext(code, { exports: mod.exports, module: mod, Buffer, require(name) {
  if (name === "node:crypto") return require(name);
  if (["server-only", "firebase-admin/firestore", "@/lib/firebaseAdmin"].includes(name)) return {};
  throw new Error(name);
}});
const { buildAtcGmailRaw, buildAtcGmailManyRaw, atcGmailBcc, ATC_GMAIL_FROM } = mod.exports;
const info = { to: "test@example.com", subject: "테스트", body: "본문", filename: "test.pdf" };
const pdf = Buffer.from("%PDF-test");
function verify(raw, expectedBcc, attachmentType) {
  const mime = Buffer.from(raw, "base64url").toString("utf8");
  const headers = mime.split("\r\n\r\n")[0];
  const match = headers.match(/^From: =\?UTF-8\?B\?([^?]+)\?= <([^>]+)>$/m);
  assert.ok(match);
  assert.equal(Buffer.from(match[1], "base64").toString("utf8"), "이화선");
  assert.equal(match[2], ATC_GMAIL_FROM);
  assert.ok(headers.split("\r\n").includes("To: " + info.to));
  assert.ok(headers.split("\r\n").includes("Bcc: " + expectedBcc));
  assert.equal(headers.split("\r\n").filter(x => x.startsWith("Bcc:")).length, 1);
  assert.ok(mime.includes(attachmentType));
  assert.ok(mime.includes(pdf.toString("base64")));
}
verify(buildAtcGmailRaw({...info,bcc:""}, pdf), ATC_GMAIL_FROM, "application/pdf");
verify(buildAtcGmailRaw({...info,bcc:"existing@example.com"}, pdf), "existing@example.com, " + ATC_GMAIL_FROM, "application/pdf");
verify(buildAtcGmailRaw({...info,bcc:ATC_GMAIL_FROM}, pdf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), ATC_GMAIL_FROM, "spreadsheetml.sheet");
verify(buildAtcGmailManyRaw(info, [{filename:"test.pdf",contentType:"application/pdf",buffer:pdf},{filename:"test.png",contentType:"image/png",buffer:Buffer.from("png")}]), ATC_GMAIL_FROM, "image/png");
assert.equal(atcGmailBcc(ATC_GMAIL_FROM.toUpperCase()).toLowerCase(), ATC_GMAIL_FROM);
assert.equal(atcGmailBcc("existing@example.com, " + ATC_GMAIL_FROM), "existing@example.com, " + ATC_GMAIL_FROM);
console.log("PASS: sender display name, automatic BCC, existing BCC preservation, deduplication, PDF/XLSX and multiple attachments. No email sent.");
