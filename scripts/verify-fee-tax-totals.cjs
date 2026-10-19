/* eslint-disable @typescript-eslint/no-require-imports -- Isolated settlement/API regression harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, Response, Request, URL, console, require(name) {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  } }, { filename: file });
  return exports;
}

const settlement = load('lib/feeSettlement.ts');
const legacy = {
  grossAmount: 720000, receivedAmount: 696240, receivedDate: '2026-10-08',
  taxAmount: 0, insuranceFee: 0, industryCode: '940903', taxMetaConfirmed: true,
};
const recovered = settlement.sanitizeFeeSettlement(legacy);
assert.equal(recovered.calculationVersion, 1);
assert.equal(recovered.incomeTax, 21600);
assert.equal(recovered.residentTax, 2160);
assert.equal(recovered.taxAmount, 23760);
assert.equal(recovered.insuranceFee, 0);
assert.equal(recovered.receivedAmount, 696240);
assert.equal(recovered.receivedDate, '2026-10-08');
assert.equal(recovered.industryCode, '940903');
assert.equal(recovered.taxMetaConfirmed, true);
assert.equal(legacy.taxAmount, 0, 'Read normalization must not mutate the original record');
assert.equal(JSON.stringify(settlement.sanitizeFeeSettlement(recovered)), JSON.stringify(recovered), 'Repeated reads must be stable');
assert.equal(settlement.sanitizeFeeSettlement({ ...legacy, receivedAmount: 720000 }).calculationVersion, undefined, 'No deduction must not invent taxes');
assert.equal(settlement.sanitizeFeeSettlement({ ...legacy, receivedAmount: 700000 }).calculationVersion, undefined, 'A mismatched net must remain unconverted');
assert.equal(settlement.sanitizeFeeSettlement({ ...legacy, receivedAmount: undefined }).calculationVersion, undefined, 'Unpaid records must remain unconverted');
assert.equal(settlement.sanitizeFeeSettlement({ ...legacy, taxAmount: 20000 }).taxAmount, 20000, 'Historical nonzero taxes must be preserved');
assert.equal(settlement.sanitizeFeeSettlement({ ...legacy, insuranceFee: 3000 }).insuranceFee, 3000, 'Historical insurance must be preserved');
const manualZero = settlement.sanitizeFeeSettlement({
  ...legacy, calculationVersion: 1, manualFields: ['grossAmount', 'incomeTax', 'residentTax'], incomeTax: 0, residentTax: 0,
});
assert.equal(manualZero.taxAmount, 0, 'An explicit manual zero must be preserved');

const incomeTax = load('lib/incomeTax.ts');
let saved = { type: 'contract', schoolName: '회귀검증 학교', title: '테스트 수업', settlements: { '2026-09': legacy } };
let writes = 0;
const snapshot = () => ({ empty: false, docs: [{ id: 'contract-test', data: () => saved }] });
const db = { collection(name) {
  if (name === 'teacher_fee_contracts') return { get: async () => snapshot(), doc: () => ({
    get: async () => ({ exists: true, id: 'contract-test', data: () => saved }),
    update: async (updates) => { writes++; saved = { ...saved, ...updates }; },
  }) };
  if (name === 'students') return { get: async () => ({ docs: [] }) };
  if (name === 'teacher_income_tax_estimates') return { doc: () => ({ get: async () => ({ data: () => ({}) }) }) };
  throw new Error(`Unexpected collection ${name}`);
} };
const dependencies = {
  'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'test-timestamp' } },
  '@/lib/assignmentServer': {
    verifyTeacherRequest: async () => ({ uid: 'teacher-test' }),
    handleRouteError: (error) => { throw error; }, jsonError: (message, status) => Response.json({ error: message }, { status }),
  },
  '@/lib/firebaseAdmin': { getFirebaseAdmin: () => ({ db }) },
  '@/lib/feeSettlement': settlement,
  '@/lib/incomeTax': incomeTax,
  '@/lib/studentRoster': { AFTER_SCHOOL_ACADEMIC_YEAR: 2026 },
};
const fees = load('app/api/teacher/fees/route.ts', dependencies);
const tax = load('app/api/teacher/income-tax/route.ts', dependencies);

// Execute the page's actual cumulative totals function against the API response.
const page = fs.readFileSync(path.join(root, 'app/teacher/fees/page.tsx'), 'utf8');
const totalsSource = page.slice(page.indexOf('  const getContractSettlementTotals ='), page.indexOf('  const paymentContracts ='));
const totalsCode = ts.transpileModule(`${totalsSource}\nexports.totals = getContractSettlementTotals;`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const totalsContext = {
  exports: {}, ...settlement, getSettlementUnits: () => [{ key: '2026-09', expectedAmount: 720000 }],
};
vm.runInNewContext(totalsCode, totalsContext);

(async () => {
  const request = new Request('https://test.local/api/teacher/fees');
  const response = await fees.GET(request);
  assert.equal(response.status, 200);
  const payload = await response.json();
  const entry = payload.contracts[0].settlements['2026-09'];
  assert.equal(entry.taxAmount, 23760, 'The fees API must supply recovered taxes to the UI and totals');
  assert.equal(entry.calculationVersion, 1, 'The UI must not label included deductions as an unapplied preview');
  const totals = totalsContext.exports.totals(payload.contracts[0]);
  assert.equal(totals.tax, 23760);
  assert.equal(totals.incomeTax, 21600);
  assert.equal(totals.residentTax, 2160);
  assert.equal(totals.received, 696240);
  assert.equal(totals.legacyTax, 0, 'Recovered taxes must not be counted again as legacy aggregates');
  assert.equal(writes, 0, 'Read-only requests must not backfill the database');
  const annualRequest = new Request('https://test.local/api/teacher/income-tax?year=2026');
  const annual = await (await tax.GET(annualRequest)).json();
  assert.equal(annual.records.length, 1);
  assert.equal(annual.records[0].incomeTax, entry.incomeTax);
  assert.equal(annual.records[0].localTax, entry.residentTax);
  assert.equal(annual.records[0].taxWasEstimated, true, 'Automatically reconstructed deductions must retain their estimated status');
  const patchResponse = await fees.PATCH(new Request(request.url, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'contract-test', settlements: payload.contracts[0].settlements }),
  }));
  assert.equal(patchResponse.status, 200);
  assert.equal(writes, 1);
  assert.equal(saved.settlements['2026-09'].taxAmount, 23760, 'The normal save path must retain recovered taxes');
  const reread = await (await fees.GET(request)).json();
  assert.equal(reread.contracts[0].settlements['2026-09'].taxAmount, 23760);
  saved = { ...saved, settlements: { '2026-09': manualZero } };
  const zeroAnnual = await (await tax.GET(annualRequest)).json();
  assert.equal(zeroAnnual.records[0].incomeTax, 0);
  assert.equal(zeroAnnual.records[0].localTax, 0);

  // The parent legacy entry is retained as a backup, never double counted.
  const split = {
    ...recovered,
    installments: [
      { id: 'original', calculationVersion: 1, manualFields: ['grossAmount'], grossAmount: 400000,
        receivedAmount: 386800, receivedDate: '2026-09-25', taxYear: 2026 },
      { id: 'second', calculationVersion: 1, manualFields: ['grossAmount'], grossAmount: 320000,
        receivedAmount: 309440, receivedDate: '2026-10-10', taxYear: 2026 },
    ],
  };
  const splitNormalized = settlement.sanitizeFeeSettlement(split);
  assert.equal(splitNormalized.installments.length, 2);
  assert.equal(splitNormalized.grossAmount, 720000, 'Preserve the parent for rollback');
  assert.equal(splitNormalized.receivedAmount, 696240, 'Preserve the parent net amount');
  assert.equal(settlement.getFeePaymentEntries(splitNormalized, 720000).length, 2);
  assert.equal(settlement.getFeePaymentEntries(splitNormalized, 720000).reduce((sum, item) => sum + item.incomeTax, 0), 21600);
  assert.equal(settlement.getFeePaymentEntries(splitNormalized, 720000).reduce((sum, item) => sum + item.residentTax, 0), 2160);
  assert.equal(splitNormalized.installments[0].grossAmount + splitNormalized.installments[1].grossAmount, 720000);
  const malformed = settlement.sanitizeFeeSettlement({
    ...split,
    installments: [
      { id: 'valid', receivedDate: '2026-10-10', grossAmount: 1000, installments: [{ id: 'nested', grossAmount: 9999 }] },
      { id: 'valid', receivedDate: '2026-10-11', grossAmount: 2000 },
      { id: 'bad.id', grossAmount: 5000 },
    ],
  });
  assert.equal(malformed.installments.length, 1, 'Drop duplicate/invalid child ids');
  assert.equal(malformed.installments[0].installments, undefined, 'Drop recursive child payment arrays');

  saved = { ...saved, settlements: { '2026-09': split } };
  const splitFees = await (await fees.GET(request)).json();
  const splitTotals = totalsContext.exports.totals(splitFees.contracts[0]);
  assert.equal(splitTotals.received, 696240, 'Do not sum the legacy parent and children');
  assert.equal(splitTotals.statementGross, 720000);
  assert.equal(splitTotals.tax, 23760);
  assert.equal(splitTotals.incomeTax, 21600);
  assert.equal(splitTotals.residentTax, 2160);
  assert.equal(splitTotals.unpaid, 0);
  const splitAnnual = await (await tax.GET(annualRequest)).json();
  assert.equal(splitAnnual.records.length, 2, 'Create one annual tax record per installment');
  assert.equal(splitAnnual.records.reduce((sum, record) => sum + record.grossAmount, 0), 720000);
  assert.equal(splitAnnual.records.reduce((sum, record) => sum + record.incomeTax, 0), 21600);
  assert.equal(splitAnnual.records.reduce((sum, record) => sum + record.localTax, 0), 2160);
  assert.equal(new Set(splitAnnual.records.map((record) => record.id)).size, 2);
  assert.equal(splitAnnual.records[0].paymentMonth, 9);
  assert.equal(splitAnnual.records[1].paymentMonth, 10);

  const splitPatch = await fees.PATCH(new Request(request.url, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'contract-test', settlements: splitFees.contracts[0].settlements }),
  }));
  assert.equal(splitPatch.status, 200);
  assert.equal(saved.settlements['2026-09'].installments.length, 2);
  const splitReread = await (await fees.GET(request)).json();
  assert.equal(splitReread.contracts[0].settlements['2026-09'].installments[1].receivedAmount, 309440);
  saved = { ...saved, settlements: { '2026-09': { ...split, installments: [split.installments[0]] } } };
  const partialTotals = totalsContext.exports.totals((await (await fees.GET(request)).json()).contracts[0]);
  assert.equal(partialTotals.unpaid, 320000, 'Partially received gross remains unpaid, not insurance');

  // Deleting the final child MUST NOT resurrect the parent's legacy amounts.
  // Include old aggregate fields to exercise the fallback edge case.
  saved = {
    ...saved,
    allowanceAmount: 720000, receivedDate: '2026-10-08',
    taxAmount: 23760, insuranceFee: 0,
    settlements: { '2026-09': { ...split, installments: [] } },
  };
  const emptySplit = await (await fees.GET(request)).json();
  assert.equal(emptySplit.contracts[0].settlements['2026-09'].installments.length, 0,
    'The split marker must survive normalization even when empty');
  const noPayments = totalsContext.exports.totals(emptySplit.contracts[0]);
  assert.equal(noPayments.received, 0, 'Deleted child must not resurrect the original net amount');
  assert.equal(noPayments.statementGross, 0, 'Deleted child must not resurrect the original gross amount');
  assert.equal(noPayments.tax, 0, 'Deleted child must not resurrect the old tax amount');
  assert.equal(noPayments.insurance, 0);
  assert.equal(noPayments.unpaid, 720000, 'Deleted installment becomes unpaid, not removed expected income');
  const emptyAnnual = await (await tax.GET(annualRequest)).json();
  assert.equal(emptyAnnual.records.length, 0, 'Deleted child must disappear from annual income-tax records');

  const deletePatch = await fees.PATCH(new Request(request.url, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'contract-test', settlements: emptySplit.contracts[0].settlements }),
  }));
  assert.equal(deletePatch.status, 200, 'The empty split list must be persisted');
  assert.equal(saved.settlements['2026-09'].installments.length, 0);
  const emptyReread = await (await fees.GET(request)).json();
  assert.equal(emptyReread.contracts[0].settlements['2026-09'].installments.length, 0);
  assert.equal(totalsContext.exports.totals(emptyReread.contracts[0]).received, 0);
  assert.equal((await (await tax.GET(annualRequest)).json()).records.length, 0);

  // Re-adding a new installment after clearing should not bring the deleted rows back.
  saved = { ...saved, settlements: { '2026-09': {
    ...split, installments: [{ id: 'new-1', calculationVersion: 1,
      manualFields: ['grossAmount'], grossAmount: 200000,
      receivedAmount: 193400, receivedDate: '2026-11-10', taxYear: 2026 }],
  } } };
  const readded = (await (await tax.GET(annualRequest)).json()).records;
  assert.equal(readded.length, 1);
  assert.equal(readded[0].grossAmount, 200000);
  assert.equal(readded[0].paymentMonth, 11);
  assert.equal(readded[0].settlementKey, '2026-09');

  const panel = fs.readFileSync(path.join(root, 'app/teacher/components/FeeSplitPaymentsPanel.tsx'), 'utf8');
  const feePage = fs.readFileSync(path.join(root, 'app/teacher/fees/page.tsx'), 'utf8');
  assert.ok(panel.includes('onRemove(item.id)'), 'Each child has a delete action');
  assert.ok(!panel.includes('items.length > 1 && <button'), 'Delete must appear for the last child');
  assert.ok(feePage.includes('installments: []'), 'Clear-all must retain an empty split list');
  assert.ok(!feePage.includes('stored.installments.length <= 1) return'), 'Delete handler must allow the final child');

  console.log('PASS: legacy preservation, split payment add/delete, final child and clear-all, no fallback resurrection, annual tax records, re-add, and persistence');
})().catch((error) => { console.error(error); process.exitCode = 1; });
