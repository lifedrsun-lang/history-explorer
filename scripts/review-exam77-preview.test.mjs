import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const cases = [
  ["production", "reviewQuestionsPreview77_20261019", false],
  ["preview", "reviewQuestions", false],
  ["preview", "arbitraryCollection", false],
  ["preview", "reviewQuestionsPreview77_20261019", true],
  ["development", "reviewQuestionsPreview77_20261019", false],
];
for (const [environment, collection, expected] of cases) {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", 'import {isReviewQuestionPreview, reviewQuestionsCollection} from "./lib/reviewQuestionPreview.ts"; console.log(JSON.stringify({preview:isReviewQuestionPreview,collection:reviewQuestionsCollection}));'], { encoding:"utf8", env:{...process.env, VERCEL_ENV:environment,REVIEW_QUESTIONS_COLLECTION:collection} });
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout),{preview:expected,collection:expected?"reviewQuestionsPreview77_20261019":"reviewQuestions"});
}
const questions = JSON.parse(readFileSync(new URL("./data/exam77-preview.json", import.meta.url)));
const answers = [3,4,4,3,3,2,4,1,1,2,2,4,1,4,1,1,4,3,1,1,2,1,2,3,4,2,4,4,1,2,1,2,2,2,1,3,3,4,4,3,1,2,4,3,2,4,3,3,4,1];
assert.equal(questions.length,50);
assert.equal(new Set(questions.map(q=>[q.examLevel,q.examRound,Number(q.examQuestionNumber)].join(":"))).size,50);
for (const [i,q] of questions.entries()) {
  assert.equal(q.correctIndex,answers[i]-1);
  assert.equal(q.options.length,4);
  assert(q.options.every(Boolean));
  assert(q.imageStoragePath.startsWith("review-questions-preview/exam77-20261019/"));
  assert.equal(q.previewOnly,true);
  if(q.classificationReviewStatus!=="verified") assert(!q.textbookPages);
}
assert.equal(questions.filter(q=>q.bookNumber.startsWith("특별/")).length,18);
assert.equal(questions[25].bookNumber,"특별/고려");
assert.equal(questions[37].bookNumber,"특별/현대");
assert.equal(questions[14].textbookPages,"25");
console.log("PASS: production isolation, preview allowlist, all 50 official answers, unique exam keys, classification and image paths");
