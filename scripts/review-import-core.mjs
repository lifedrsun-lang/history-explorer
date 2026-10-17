import { createHash } from 'node:crypto';

export const JOB = 'ancient-culture-20261017';
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const clean = (value) => String(value ?? '').normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase();
export const book = (value) => String(value ?? '').replace(/[^0-9]/g, '').padStart(2, '0') + '호';
export const sourceKey = (p) => `khx-${p.examLevel}-${Number(p.examRound)}-${Number(p.examQuestionNumber)}`;
export const documentId = (q) => `import-${sourceKey(q.payload)}`;
export function fail(reason) { const error = new Error(reason); error.importReason = reason; throw error; }

export function validateManifest(manifest) {
  if (manifest.job !== JOB || manifest.questions?.length !== 6) fail('invalid_manifest');
  const expected = [['06호',2],['08호',3],['08호',2],['08호',0],['06호',2],['07호',0]];
  const keys = new Set();
  for (const [i, q] of manifest.questions.entries()) {
    const p = q.payload;
    if (q.sourceQuestion !== i + 1 || p.questionType !== 'exam' || p.examLevel !== 'basic' ||
        p.bookNumber !== expected[i][0] || p.correctIndex !== expected[i][1] ||
        !p.prompt?.trim() || p.options?.length !== 4 || p.options.some(x => !x?.trim()) ||
        !p.examRound?.match(/^\d+$/) || !p.examQuestionNumber?.match(/^\d+$/) ||
        !q.sourceFile || !q.sourcePage || !q.imageBase64 || !q.imageSha256?.match(/^[a-f0-9]{64}$/)) fail('invalid_question');
    const bytes = Buffer.from(q.imageBase64, 'base64');
    if (bytes.length < 1000 || bytes.length > 10 * 1024 * 1024 || bytes.toString('base64') !== q.imageBase64 || sha256(bytes) !== q.imageSha256) fail('image_digest_mismatch');
    if (keys.has(sourceKey(p))) fail('duplicate_manifest_source');
    keys.add(sourceKey(p));
  }
  return manifest;
}

function identity(data) {
  if (data.sourceImportKey) return data.sourceImportKey;
  if (data.examLevel && data.examRound && data.examQuestionNumber) return sourceKey(data);
  // Older questions stored the exam identity only in their topic.
  const match = String(data.topic ?? '').match(/(기본|심화)\s*(?:제\s*)?(\d+)\s*회\s*(\d+)\s*번/);
  return match ? `khx-${match[1] === '기본' ? 'basic' : 'advanced'}-${Number(match[2])}-${Number(match[3])}` : '';
}

export function planImport(questions, documents) {
  return questions.map(q => {
    const p = q.payload;
    const sameText = d => clean(d.prompt) === clean(p.prompt) &&
      d.options?.length === 4 && d.options.every((x, i) => clean(x) === clean(p.options[i]));
    const exact = documents.filter(d => identity(d.data) === sourceKey(p));
    // An identity-free text match needs human review; never silently duplicate it.
    const possible = documents.filter(d => !identity(d.data) && sameText(d.data));
    const matches = exact.length ? exact : possible;
    if (matches.length > 1) return { q, action:'conflict', reason:'multiple_existing_matches', ids:matches.map(d=>d.id) };
    if (!matches.length) {
      if (documents.some(d => d.id === documentId(q))) return { q,action:'conflict',reason:'reserved_id_collision',ids:[documentId(q)] };
      return { q, action:'create', id:documentId(q) };
    }
    const existing = matches[0];
    const d = existing.data;
    const reason = !exact.length ? 'possible_text_duplicate' : !sameText(d) ? 'existing_content_differs' :
      Number(d.correctIndex) !== p.correctIndex ? 'existing_answer_differs' :
      book(d.bookNumber) !== p.bookNumber ? 'existing_book_differs' :
      !d.imageStoragePath ? 'existing_image_missing' : '';
    return {q, action:reason ? 'conflict' : 'reuse', reason, id:existing.id, existing:d};
  });
}

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value.toJSON === 'function') return stable(value.toJSON());
  return Object.fromEntries(Object.keys(value).sort().map(key => [key,stable(value[key])]));
}
export const documentHash = (data) => sha256(JSON.stringify(stable(data)));
export const snapshotRows = (snapshot) => snapshot.docs.map(d => ({id:d.id,data:d.data()}));
export const summary = (plan) => plan.map(x => ({sourceQuestion:x.q.sourceQuestion, bookNumber:x.q.payload.bookNumber,
  answer:x.q.payload.correctIndex + 1, action:x.action, questionId:x.id, reason:x.reason, ids:x.ids}));
