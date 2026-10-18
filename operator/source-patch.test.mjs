import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSourcePatch, buildExamMetadataPatch } from './source-patch.mjs';

const source={sourceFile:'source.pdf',sourcePage:10,sourceQuestion:5,payload:{explanation:'Source: source.pdf, page 10, question 5.'}};
test('adds provenance and preserves the entire existing explanation',()=>{
 const existing={prompt:'Original question',options:['a','b','c','d'],correctIndex:2,bookNumber:'06',explanation:'Original explanation.\nDo not replace.'};
 const before=JSON.stringify(existing),patch=buildSourcePatch(existing,source);
 assert.equal(JSON.stringify(existing),before);
 assert.equal(patch.explanation,existing.explanation+'\n\n'+source.payload.explanation);
 assert.deepEqual(Object.keys(patch).sort(),['explanation','sourceFile','sourcePage','sourceQuestion']);
});
test('repeating the repair produces no update',()=>{
 const existing={explanation:'Original'};
 const updated={...existing,...buildSourcePatch(existing,source)};
 assert.deepEqual(buildSourcePatch(updated,source),{});
});
test('conflicting existing provenance is never overwritten',()=>{
 for(const existing of [{sourceFile:'another.pdf'},{sourcePage:9},{sourceQuestion:4}])
  assert.throws(()=>buildSourcePatch(existing,source),/existing_source_conflict/);
});
test('does not duplicate a citation already in the explanation',()=>{
 const existing={explanation:'Already cites source.pdf.'};
 const patch=buildSourcePatch(existing,source);
 assert.equal(patch.explanation,undefined);
 assert.equal(patch.sourceFile,'source.pdf');
});

test('missing exam filters are populated without changing question content',()=>{
 const source={payload:{examLevel:'basic',examRound:'66',examQuestionNumber:'8'}};
 const existing={prompt:'Keep',bookNumber:'06',examLevel:'',examRound:'',examQuestionNumber:''};
 const before=JSON.stringify(existing),patch=buildExamMetadataPatch(existing,source);
 assert.deepEqual(patch,source.payload);
 assert.equal(JSON.stringify(existing),before);
 assert.deepEqual(buildExamMetadataPatch({...existing,...patch},source),{});
});
test('existing exam metadata is preserved or conflicting metadata rejects the update',()=>{
 const source={payload:{examLevel:'basic',examRound:'66',examQuestionNumber:'8'}};
 assert.deepEqual(buildExamMetadataPatch({examLevel:'basic',examRound:66,examQuestionNumber:8},source),{});
 assert.throws(()=>buildExamMetadataPatch({examLevel:'advanced'},source),/existing_exam_conflict/);
});
