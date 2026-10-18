import { mkdir, writeFile } from 'node:fs/promises';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import { JOB, validateManifest, planImport, documentHash, snapshotRows, fail } from '../scripts/review-import-core.mjs';
import { buildSourcePatch } from './source-patch.mjs';

const targetId='eoxgEmPjBl8bcWo9kHFA';
const mode=process.argv[2];
const log=(stage,data)=>console.log('REVIEW_PROVENANCE '+JSON.stringify({stage,...data}));
const env=name=>process.env[name]||fail('missing_'+name);
async function main(){
 if(!['--dry-run','--apply'].includes(mode))fail('explicit_mode_required');
 if(env('VERCEL_ENV')!=='preview')fail('preview_operator_only');
 if(env('FIREBASE_ADMIN_PROJECT_ID')!=='history-quest-b8e96'||new URL(env('SUPABASE_URL')).hostname!=='yiowkxfvageewcmczsip.supabase.co')fail('wrong_project');
 const db=getFirestore(initializeApp({credential:cert({projectId:env('FIREBASE_ADMIN_PROJECT_ID'),clientEmail:env('FIREBASE_ADMIN_CLIENT_EMAIL'),privateKey:env('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g,'\n')})}));
 const supabase=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await supabase.functions.invoke('review-import-ancient-culture',{body:{job:JOB}});
 if(error)fail('private_source_unavailable');
 const manifest=validateManifest(data),source=manifest.questions.find(q=>q.sourceQuestion===5);
 const bank=db.collection('reviewQuestions'),before=snapshotRows(await bank.get());
 const plan=planImport(manifest.questions,before);
 if(plan.some(item=>item.action!=='reuse')||plan[4].id!==targetId)fail('bank_identity_conflict');
 const original=before.find(row=>row.id===targetId).data;
 const patch=buildSourcePatch(original,source);
 log('planned',{mode,targetId,bankCount:before.length,fields:Object.keys(patch),sourceFile:source.sourceFile,sourcePage:source.sourcePage,sourceQuestion:source.sourceQuestion});
 const protectedBefore=new Map();
 let applied=false;
 if(mode==='--apply'){
  for(const collection of (await db.listCollections()).filter(c=>c.id!=='reviewQuestions')){
   const rows=snapshotRows(await collection.get());
   protectedBefore.set(collection.id,new Map(rows.map(d=>[d.id,documentHash(d.data)])));
  }
  applied=await db.runTransaction(async transaction=>{
   const current=await transaction.get(bank.doc(targetId));
   if(!current.exists)fail('target_missing');
   const row=current.data();
   for(const key of ['prompt','options','correctIndex','bookNumber','lesson','imageStoragePath'])
    if(documentHash({value:row[key]??null})!==documentHash({value:original[key]??null}))fail('target_changed_concurrently');
   const currentPatch=buildSourcePatch(row,source);
   if(!Object.keys(currentPatch).length)return false;
   transaction.update(bank.doc(targetId),{...currentPatch,updatedBy:'system:review-source-provenance-20261018',updatedAt:FieldValue.serverTimestamp()});
   return true;
  });
 }
 const after=snapshotRows(await bank.get()),target=after.find(row=>row.id===targetId)?.data;
 if(!target)fail('target_missing_after');
 const unchangedOtherBank=before.filter(row=>row.id!==targetId).every(row=>after.some(item=>item.id===row.id&&documentHash(item.data)===documentHash(row.data)));
 const allowedChanges=new Set(['sourceFile','sourcePage','sourceQuestion','explanation','updatedBy','updatedAt']);
 const unchangedTargetContent=Object.keys(original).filter(key=>!allowedChanges.has(key)).every(key=>documentHash({value:target[key]})===documentHash({value:original[key]}));
 const originalExplanationPreserved=String(target.explanation||'').startsWith(String(original.explanation||''));
 const protectedChecks=[];
 for(const [name,oldRows]of protectedBefore){
  const rows=snapshotRows(await db.collection(name).get());
  protectedChecks.push({collection:name,count:rows.length,unchanged:rows.length===oldRows.size&&rows.every(row=>oldRows.get(row.id)===documentHash(row.data))});
 }
 const assignments=snapshotRows(await db.collection('reviewAssignments').get());
 const existingQuestionAssignmentReferences=assignments.reduce((n,row)=>n+(row.data.questions||[]).filter(q=>q.questionId===targetId).length,0);
 const allSources=planImport(manifest.questions,after);
 const importedIds=new Set(allSources.filter(item=>item.existing?.importJob===JOB).map(item=>item.id));
 const newQuestionAssignmentReferences=assignments.reduce((n,row)=>n+(row.data.questions||[]).filter(q=>importedIds.has(q.questionId)).length,0);
 const sourceComplete=target.sourceFile===source.sourceFile&&target.sourcePage===source.sourcePage&&target.sourceQuestion===5&&String(target.explanation||'').includes(source.sourceFile);
 const safe=before.length===after.length&&unchangedOtherBank&&unchangedTargetContent&&originalExplanationPreserved&&protectedChecks.every(item=>item.unchanged)&&newQuestionAssignmentReferences===0;
 if(!safe)fail('preservation_check_failed');
 if(mode==='--apply'&&!sourceComplete)fail('source_not_saved');
 log('verified',{mode,recordsUpdated:applied?1:0,bankBefore:before.length,bankAfter:after.length,sourceComplete,unchangedOtherBank,unchangedTargetContent,originalExplanationPreserved,protectedCollections:protectedChecks.length,protectedCollectionsUnchanged:protectedChecks.every(item=>item.unchanged),existingQuestionAssignmentReferences,newQuestionAssignmentReferences,studentCount:protectedChecks.find(item=>item.collection==='students')?.count??null,assignmentWrites:0,studentWrites:0,questionsCreated:0,questionsDeleted:0});
 await mkdir('operator-result',{recursive:true});
 await writeFile('operator-result/index.html','<!doctype html><html lang="en"><title>Operator validation</title><p>Operator validation completed. See authenticated build logs for details.</p></html>');
 log('complete',{mode});
}
main().catch(error=>{log('aborted',{reason:error.importReason||'backend_error',code:String(error.code||error.name||'error')});process.exitCode=1;});
