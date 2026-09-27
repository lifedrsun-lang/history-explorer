import assert from "node:assert/strict";

import {
  Q2_ORPHAN_LINKS,
  buildQ2OrphanRelinkPlan,
  canonicalizeQ2OrphanReferences,
} from "../lib/q2OrphanRelink.ts";

const students = Q2_ORPHAN_LINKS.map((link) => ({
  id: link.studentId,
  data: {
    name: link.currentName,
    school: "화성 새솔초",
    grade: `${link.grade}학년`,
    class: `${link.schoolClass}반`,
    enrollmentTerms: ["2026-Q2"],
  },
}));

const feeChecks = Object.fromEntries(
  Q2_ORPHAN_LINKS.map((link, index) => [
    link.legacyId,
    [index === 0, index === 1, index === 2],
  ])
);
const feeWeeks = Object.fromEntries(
  Q2_ORPHAN_LINKS.map((link, index) => [
    link.legacyId,
    { T1: [true, index === 0, false, false] },
  ])
);
const snapshots = Q2_ORPHAN_LINKS.map((link) => ({
  id: link.legacyId,
  name: link.legacyName,
  school: "새솔초",
  grade: `${link.grade}학년`,
  schoolClass: `${link.schoolClass}반`,
  enrollmentStatus: "ended",
  phone: "",
}));

const fixture = {
  students,
  feeContracts: [
    {
      id: "fee-saesol",
      data: {
        schoolName: "새솔초",
        quarterParticipation: { Q2: feeChecks },
        quarterWeekParticipation: { Q2: feeWeeks },
        quarterStudentSnapshots: { Q2: snapshots },
      },
    },
  ],
  textbookRecords: [
    {
      id: "textbook-saesol-q2",
      data: {
        schoolName: "화성 새솔초",
        quarter: "Q2",
        receipts: feeChecks,
        studentIds: Q2_ORPHAN_LINKS.map((link) => link.legacyId),
        studentSnapshots: snapshots,
      },
    },
  ],
};

const beforeCanonical = JSON.stringify(
  canonicalizeQ2OrphanReferences({
    feeContracts: fixture.feeContracts,
    textbookRecords: fixture.textbookRecords,
  })
);
const plan = buildQ2OrphanRelinkPlan(fixture);
assert.equal(plan.ready, true);
assert.equal(plan.changedMappingCount, 3);
assert.equal(plan.changedDocumentCount, 2);
assert.equal(plan.updates.length, 2);
assert.deepEqual(
  plan.mappings.map((mapping) => mapping.status),
  ["will_relink", "will_relink", "will_relink"]
);

const applyUpdates = (documents, collection) => {
  const updates = new Map(
    plan.updates
      .filter((update) => update.collection === collection)
      .map((update) => [update.id, update.fields])
  );
  return documents.map((document) => ({
    ...document,
    data: updates.has(document.id)
      ? { ...document.data, ...updates.get(document.id) }
      : document.data,
  }));
};

const afterFixture = {
  students,
  feeContracts: applyUpdates(fixture.feeContracts, "teacher_fee_contracts"),
  textbookRecords: applyUpdates(
    fixture.textbookRecords,
    "teacher_textbook_receipts"
  ),
};
const afterCanonical = JSON.stringify(
  canonicalizeQ2OrphanReferences({
    feeContracts: afterFixture.feeContracts,
    textbookRecords: afterFixture.textbookRecords,
  })
);
assert.equal(afterCanonical, beforeCanonical);

const secondPlan = buildQ2OrphanRelinkPlan(afterFixture);
assert.equal(secondPlan.ready, true);
assert.equal(secondPlan.changedMappingCount, 0);
assert.equal(secondPlan.changedDocumentCount, 0);
assert.deepEqual(
  secondPlan.mappings.map((mapping) => mapping.status),
  ["already_linked", "already_linked", "already_linked"]
);

for (const link of Q2_ORPHAN_LINKS) {
  const feeData = afterFixture.feeContracts[0].data;
  const textbookData = afterFixture.textbookRecords[0].data;
  assert.deepEqual(
    feeData.quarterParticipation.Q2[link.studentId],
    feeChecks[link.legacyId]
  );
  assert.deepEqual(textbookData.receipts[link.studentId], feeChecks[link.legacyId]);
  assert.equal(
    feeData.quarterStudentSnapshots.Q2.find(
      (student) => student.id === link.studentId
    ).name,
    link.currentName
  );
}

console.log("Q2 orphan relink verification passed");
