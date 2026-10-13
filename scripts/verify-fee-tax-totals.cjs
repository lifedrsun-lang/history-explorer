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
  console.log('PASS: legacy reconciliation, preservation, fees GET/PATCH/reload, annual tax consistency and manual zero deductions');
})().catch((error) => { console.error(error); process.exitCode = 1; });
