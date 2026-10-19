/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const page = fs.readFileSync(path.join(__dirname, "../app/teacher/fees/page.tsx"), "utf8");
const tree = ts.createSourceFile("page.tsx", page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.equal(tree.parseDiagnostics.length, 0,
  "The fee page must parse as valid TSX: " + tree.parseDiagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("; "));

const renderRows = page.slice(page.indexOf("  const renderSettlementRows ="), page.indexOf("\n  if (authChecking)"));
const renderPayments = page.slice(page.indexOf("  const renderPayments ="), page.indexOf("\n  const renderAfterschool ="));
const grouping = page.slice(page.indexOf("  const paymentContracts ="), page.indexOf("  const visibleTabs:"));
assert.ok(renderRows && renderPayments && grouping, "Expected existing payment sections");

assert.match(grouping, /paymentContracts\.reduce\(\(groups, contract\)/,
  "School groups must use the actual payment contracts, not a duplicate source");
assert.match(grouping, /normalizeSchoolName\(contract\.schoolName\)/,
  "Grouping should coalesce alternate spellings of the same school");
assert.match(grouping, /groups\.get\(key\)!\.push\(contract\)/,
  "All contracts under one school must be preserved");
assert.match(renderPayments, /paymentSchoolGroups\.map\(\(school\)/);
assert.match(renderPayments, /<details key=\{school\.key\}/);
assert.match(renderPayments, /<summary className=/);
assert.match(renderPayments, /school\.contracts\.map\(\(contract\)/,
  "Existing contract cards must remain under the correct school");
assert.match(renderPayments, /getContractSettlementTotals\(contract\)\.received/,
  "Collapsed schools should show payment totals derived from the existing calculation");
assert.match(renderPayments, /\{renderSettlementRows\(contract\)\}/,
  "Nested school cards must retain payment editors");
assert.match(renderPayments, /수당 수정/, "Contract allowance edits must still be reachable");

assert.match(renderRows, /contract\.type === "afterschool"/,
  "Quarter nesting must only apply to after-school contracts");
assert.match(renderRows, /quarters\.map\(\(item\)/,
  "All four existing quarter keys must remain available");
assert.match(renderRows, /unit\.key\.startsWith\(`\$\{item\.key\}-`\)/,
  "Quarter panels should filter settlement units by quarter key");
assert.match(renderRows, /<details key=\{item\.key\}/);
assert.match(renderRows, /quarterUnits\.map\(renderSettlementUnit\)/);
assert.match(renderRows, /: units\.map\(renderSettlementUnit\)/,
  "Non-after-school records should stay monthly/ungrouped under school");
assert.match(renderRows, /renderSettlementRows/);
assert.match(renderRows, /onRemove=\{\(id\)/,
  "The existing split-payment delete handler must be preserved");
assert.match(renderRows, /onClearAll=\{\(\) =>/,
  "The existing split-payment clear handler must be preserved");
assert.match(renderRows, /units\.length === 0 && contract\.type !== "afterschool"/,
  "After-school schools with no payments must still show all four collapsed quarters");
assert.match(renderRows, /getFeePaymentEntries\(entry, unit\.expectedAmount\)/,
  "Quarter receipt summary must include installments without duplicating legacy records");

// Inspect the JSX rather than treating the presence of strings alone as proof.
const details = [];
const visit = (node) => {
  if ((ts.isJsxElement(node)) &&
      node.openingElement.tagName.getText(tree) === "details") {
    details.push(node);
    assert.equal(node.children.some((child) =>
      ts.isJsxElement(child) && child.openingElement.tagName.getText(tree) === "summary"
    ), true, "Every accordion must contain a keyboard-accessible <summary>");
  }
  ts.forEachChild(node, visit);
};
visit(tree);
assert.ok(details.length >= 2, "Both school and quarter accordion elements must exist");

console.log("PASS: school payment accordions, after-school quarter accordions, summary values, existing edit/delete controls, and valid TSX");
