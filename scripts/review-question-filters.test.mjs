import assert from "node:assert/strict";
import test from "node:test";
import { matchesReviewQuestionFilters, resetReviewQuestionFilters, selectReviewQuestionFilter } from "../lib/reviewQuestionFilters.ts";

const questions = [
  { questionType: "textbook", examLevel: "", bookNumber: "01호", lesson: "1차시" },
  { questionType: "exam", examLevel: "basic", bookNumber: "03호", lesson: "3차시" },
  { questionType: "exam", examLevel: "advanced", bookNumber: "08호", lesson: "1차시" },
  { questionType: "exam", examLevel: "", bookNumber: "특별/고려", lesson: "" },
];
const results = filters => questions.filter(q => matchesReviewQuestionFilters(q, filters));
const stale = { questionType: "exam", examLevel: "basic", book: "08호", lesson: "4차시" };

test("selecting overall all clears a previously empty combination", () => {
  assert.equal(results(stale).length, 0);
  const next = selectReviewQuestionFilter(stale, "questionType", "all");
  assert.deepEqual(next, resetReviewQuestionFilters());
  assert.equal(results(next).length, questions.length);
});

test("exam all returns basic, advanced, legacy and special questions without textbook questions", () => {
  const next = selectReviewQuestionFilter(stale, "questionType", "exam");
  assert.equal(results(next).length, 3);
  assert.ok(results(next).every(q => q.questionType === "exam"));
});

test("book all clears an incompatible lesson", () => {
  const next = selectReviewQuestionFilter({ ...stale, book: "03호" }, "book", "all");
  assert.equal(next.lesson, "all");
  assert.equal(results(next).length, 1);
});

test("changing book clears the previous lesson", () => {
  const next = selectReviewQuestionFilter(stale, "book", "03호");
  assert.equal(results(next)[0].lesson, "3차시");
});

test("level all clears stale book and lesson and includes every exam level", () => {
  const next = selectReviewQuestionFilter(stale, "examLevel", "all");
  assert.equal(results(next).length, 3);
});

test("explicit basic filter remains effective", () => {
  const next = selectReviewQuestionFilter(resetReviewQuestionFilters("exam"), "examLevel", "basic");
  assert.equal(results(next).length, 1);
  assert.equal(results(next)[0].examLevel, "basic");
});

test("exam-wide refresh resets every narrowing filter without changing the selected type", () => {
  const next = resetReviewQuestionFilters(stale.questionType);
  assert.equal(results(next).length, 3);
  assert.deepEqual(stale, { questionType: "exam", examLevel: "basic", book: "08호", lesson: "4차시" });
});
