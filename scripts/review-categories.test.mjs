import test from "node:test";
import assert from "node:assert/strict";
import { matchesReviewCategory, parseReviewCategory } from "../lib/reviewCategories.ts";
test("three categories are mutually exclusive and unclassified exams remain in legacy view", () => {
  const rows = [{questionType:"textbook", examLevel:""}, {questionType:"exam", examLevel:"basic"}, {questionType:"exam", examLevel:"advanced"}, {questionType:"exam", examLevel:""}];
  for (const [index, category] of ["textbook","basic","advanced"].entries()) {
    assert.deepEqual(rows.filter(q => matchesReviewCategory(q, category)), [rows[index]]);
  }
  assert.equal(rows.filter(q => matchesReviewCategory(q, "all")).length, 4);
  assert.equal(parseReviewCategory("unknown"), "all");
});
