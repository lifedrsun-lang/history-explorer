import test from 'node:test';
import assert from 'node:assert/strict';
import {JOB,sha256,validateManifest,planImport,documentId,documentHash} from './review-import-core.mjs';

const imageBase64 = Buffer.alloc(2000,123).toString('base64');
const make = () => ({job:JOB,questions:[['06호',2,54,4],['08호',3,69,7],['08호',2,47,7],['08호',0,67,9],['06호',2,66,8],['07호',0,64,6]].map(([b,a,r,n],i)=>({
 sourceQuestion:i+1,sourcePage:8+Math.floor(i/2),sourceFile:'private-source.pdf',
 imageBase64,imageSha256:sha256(Buffer.from(imageBase64,'base64')),
 payload:{questionType:'exam',examLevel:'basic',bookNumber:b,examRound:String(r),examQuestionNumber:String(n),
 prompt:`Question ${i+1}`,options:['one','two','three','four'],correctIndex:a}
}))});
const row = q => ({id:documentId(q),data:{...q.payload,imageStoragePath:'private/image.jpg'}});

test('validates the fixed six-item mapping and corrected source answer',()=>{
 assert.equal(validateManifest(make()).questions.length,6);
 const m=make();m.questions[5].payload.correctIndex=3;
 assert.throws(()=>validateManifest(m),/invalid_question/);
});
test('rejects corrupted source images before any upload',()=>{
 const m=make();m.questions[0].imageBase64+='AAAA';
 assert.throws(()=>validateManifest(m),/image_digest_mismatch/);
});
test('recognizes the existing legacy question and preserves its lesson',()=>{
 const m=make(),q=m.questions[4];
 const existing=row(q);existing.id='legacy';delete existing.data.examLevel;delete existing.data.examRound;delete existing.data.examQuestionNumber;
 existing.data.topic='기본 제66회 8번';existing.data.lesson='4차시';
 const p=planImport(m.questions,[existing]);
 assert.equal(p.filter(x=>x.action==='create').length,5);
 assert.equal(p[4].action,'reuse');assert.equal(p[4].existing.lesson,'4차시');
});
test('repeating the job reuses all records and creates none',()=>{
 const m=make(),p=planImport(m.questions,m.questions.map(row));
 assert.ok(p.every(x=>x.action==='reuse'));
});
test('a source in a different book is reported without cloning or changing it',()=>{
 const m=make(),r=row(m.questions[0]);r.data.bookNumber='08호';
 assert.equal(planImport(m.questions,[r])[0].reason,'existing_book_differs');
});
test('wrong answers, missing images and multiple copies are conflicts',()=>{
 const m=make(),r=row(m.questions[0]);r.data.correctIndex=0;
 assert.equal(planImport(m.questions,[r])[0].reason,'existing_answer_differs');
 r.data.correctIndex=2;delete r.data.imageStoragePath;
 assert.equal(planImport(m.questions,[r])[0].reason,'existing_image_missing');
 assert.equal(planImport(m.questions,[r,{...r,id:'second'}])[0].reason,'multiple_existing_matches');
});
test('uncertain text-only duplicates stop for review',()=>{
 const m=make(),q=m.questions[0];const r={id:'unknown-source',data:{prompt:q.payload.prompt,options:q.payload.options}};
 assert.equal(planImport(m.questions,[r])[0].reason,'possible_text_duplicate');
});
test('content hashes ignore key order and detect changed records',()=>{
 assert.equal(documentHash({a:1,b:{x:2,y:3}}),documentHash({b:{y:3,x:2},a:1}));
 assert.notEqual(documentHash({answer:2}),documentHash({answer:3}));
});
