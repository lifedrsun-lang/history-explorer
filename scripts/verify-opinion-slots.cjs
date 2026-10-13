/* eslint-disable @typescript-eslint/no-require-imports -- Isolated routing regression checks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const req = createRequire(path.join(root, file));
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : req(name), mod, mod.exports);
  return mod.exports;
}
const opinions = load('lib/opinions.ts');
const calls = [];
const row = { topic: 'fixture', instruction: '', active: false, round_id: null, revision: 0, responses: {} };
const server = load('lib/opinionServer.ts', {
  'server-only': {},
  '@/lib/supabaseServer': { getSupabaseServer: () => ({
    from(table) { return { select() { return this; }, eq(field, value) { calls.push({ table, field, value }); return this; }, async single() { return { data: row }; } }; },
    async rpc(name, params) { calls.push({ name, params }); return { data: row }; },
  }) },
});
async function main() {
  assert.equal(opinions.opinionSlot(null), 1);
  assert.equal(opinions.opinionSlot(undefined), 1);
  assert.deepEqual(opinions.OPINION_SLOTS, [1, 2, 3, 4, 5, 6, 7, 8]);
  for (const slot of opinions.OPINION_SLOTS) {
    assert.equal(opinions.opinionSlot(slot), slot);
    assert.equal(opinions.opinionSlot(String(slot)), slot);
    assert.equal(opinions.opinionPath(slot), slot === 1 ? '/opinion' : `/opinion/${slot}`);
    await server.readOpinionRow(slot);
    assert.deepEqual(calls.pop(), { table: slot === 1 ? 'opinion_activity' : 'opinion_activity_slots', field: slot === 1 ? 'id' : 'slot', value: slot === 1 ? true : slot });
    await server.mutateOpinion('start', { slot });
    const call = calls.pop();
    assert.equal(call.name, slot === 1 ? 'opinion_mutate' : 'opinion_slot_mutate');
    assert.equal(call.params.p_slot, slot === 1 ? undefined : slot);
  }
  for (const invalid of [0, 9, -1, 2.5, '', '01', '1.0', ' 8', '8 ', true, false, {}, [], 'bad']) assert.throws(() => opinions.opinionSlot(invalid), /invalid_slot/);
  const page = load('app/opinion/[slot]/page.tsx', {
    'next/navigation': { notFound() { throw new Error('not_found'); } },
    '@/lib/opinions': opinions,
    '../OpinionStudentClient': () => null,
  });
  for (const slot of opinions.OPINION_SLOTS.slice(1)) {
    const element = await page.default({ params: Promise.resolve({ slot: String(slot) }) });
    assert.equal(element.props.slot, slot);
  }
  for (const slot of ['0', '1', '9', '08', '8.0', 'bad']) await assert.rejects(page.default({ params: Promise.resolve({ slot }) }), /not_found/);
  assert.equal(server.opinionError(new Error('invalid_slot')).status, 400);
  assert.match((await server.opinionError(new Error('invalid_slot')).json()).error, /1~8/);
  console.log('PASS: slots 1–8, unchanged legacy URLs/storage, strict invalid-slot rejection, numbered student routes and independent RPC destinations.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
