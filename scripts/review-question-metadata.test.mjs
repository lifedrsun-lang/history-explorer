import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeReviewBookNumber, buildReviewDistributionIndex, matchesReviewDistribution } from '../lib/reviewQuestionMetadata.ts';
import { matchesReviewQuestionFilters, resetReviewQuestionFilters } from '../lib/reviewQuestionFilters.ts';

test('numeric issue aliases share one category without changing special labels or unrelated titles', () => {
  assert.deepEqual(['8','08','8호','08호',' 008 호 '].map(normalizeReviewBookNumber), Array(5).fill('08호'));
  for (const text of ['특별/고려', '고려 8호', '08-2', '']) assert.equal(normalizeReviewBookNumber(text), text);
  assert.equal(normalizeReviewBookNumber('17호'), '17호');
  assert.ok(matchesReviewQuestionFilters({ questionType:'exam', examLevel:'basic', bookNumber:'8호', lesson:'1차시' }, { ...resetReviewQuestionFilters('exam'), book:'08호' }));
});

test('history joins by question ID, includes inactive assignments, removes duplicate IDs and keeps schools and classes separate', () => {
  const entries = [
    { id:'old', school:'가학교', teachingClass:'A반', title:'이전 과제', createdAt:'2026-10-01T00:00:00Z', isActive:false, questionIds:['q1','q1',''] },
    { id:'new', school:'나학교', teachingClass:'B반', title:'새 과제', createdAt:'2026-10-20T00:00:00Z', isActive:true, questionIds:['q1','q2'] },
  ];
  const before = JSON.stringify(entries);
  const index = buildReviewDistributionIndex(entries);
  assert.equal(index.q1.length, 2);
  assert.equal(index.q1[0].assignmentId, 'new');
  assert.equal(index.q2.length, 1);
  assert.equal(index[''], undefined);
  assert.ok(matchesReviewDistribution(index.q1, '가학교', 'sent', 'A반'));
  assert.ok(matchesReviewDistribution(index.q1, '가학교', 'unsent', 'B반'));
  assert.ok(matchesReviewDistribution(index.q2, '가학교', 'unsent'));
  assert.ok(!matchesReviewDistribution(index.q1, '가학교', 'unsent', 'A반'));
  assert.ok(matchesReviewDistribution([], 'all', 'unsent'));
  assert.ok(!matchesReviewDistribution([], 'all', 'sent'));
  assert.equal(JSON.stringify(entries), before);
});
