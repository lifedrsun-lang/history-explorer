// Add missing provenance without replacing any existing question content.
export function buildSourcePatch(existing, source) {
  const patch = {};
  for (const key of ['sourceFile','sourcePage','sourceQuestion']) {
    const expected = source[key];
    if (expected === undefined || expected === '') throw new Error('missing_source_value');
    if (existing[key] === undefined || existing[key] === '') patch[key] = expected;
    else if (existing[key] !== expected) throw new Error('existing_source_conflict');
  }
  const original = String(existing.explanation || '');
  if (!original.includes(source.sourceFile)) {
    patch.explanation = original + (original ? '\n\n' : '') + source.payload.explanation;
  }
  return patch;
}
