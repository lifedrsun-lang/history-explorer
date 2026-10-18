// Explicit operator job only. Never imported by the web app or normal build.
// Source scans stay in a service-authenticated Supabase function, outside this public repository.
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { JOB, sha256, validateManifest, planImport, documentId, sourceKey, documentHash, snapshotRows, summary, fail } from './review-import-core.mjs';

const mode = process.argv[2];
const log = (stage, data) => console.log('REVIEW_IMPORT ' + JSON.stringify({job:JOB,stage,...data}));
const env = name => process.env[name] || fail('missing_' + name);

async function main() {
  if (!['--dry-run','--apply','--verify','--audit'].includes(mode)) fail('explicit_mode_required');
  if (env('FIREBASE_ADMIN_PROJECT_ID') !== 'history-quest-b8e96' ||
      new URL(env('SUPABASE_URL')).hostname !== 'yiowkxfvageewcmczsip.supabase.co') fail('wrong_project');
  if (mode === '--apply' && process.env.VERCEL_ENV !== 'production') fail('apply_requires_production');
  const app = initializeApp({credential:cert({projectId:env('FIREBASE_ADMIN_PROJECT_ID'),
    clientEmail:env('FIREBASE_ADMIN_CLIENT_EMAIL'),privateKey:env('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g,'\n')})});
  const db = getFirestore(app);
  const supabase = createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const bucket = supabase.storage.from(env('SUPABASE_ASSIGNMENT_BUCKET'));
  const unauthenticated = await fetch(`${env('SUPABASE_URL')}/functions/v1/review-import-ancient-culture`, {method:'POST',body:JSON.stringify({job:JOB}),headers:{'content-type':'application/json'}});
  if (unauthenticated.status !== 401) fail('private_manifest_auth_check_failed');
  log('private_source_protected',{unauthenticatedStatus:unauthenticated.status});
  const {data,error} = await supabase.functions.invoke('review-import-ancient-culture', {body:{job:JOB}});
  if (error) {
    log('source_fetch_failed',{status:error.context?.status || null,keyFormat:env('SUPABASE_SERVICE_ROLE_KEY').startsWith('eyJ')?'jwt':'secret'});
    fail('private_manifest_unavailable');
  }
  const manifest = validateManifest(data);
  for (const q of manifest.questions) {
    const metadata = await sharp(Buffer.from(q.imageBase64,'base64')).metadata();
    if (metadata.format !== 'jpeg' || metadata.width < 500 || metadata.height < 500) fail('invalid_image_dimensions');
  }
  log('source_validated',{questions:6,images:6,manifestSha256:sha256(JSON.stringify(manifest))});
  const bank = db.collection('reviewQuestions');
  const before = snapshotRows(await bank.get());
  const plan = planImport(manifest.questions,before);
  log('plan',{mode,bankCount:before.length,questions:summary(plan)});
  if (mode === '--audit') {
    const assignmentRows = snapshotRows(await db.collection('reviewAssignments').get());
    let totalMatchingRecords = 0;
    for (const item of plan) {
      const ids = item.ids || (item.id ? [item.id] : []);
      const records = [];
      for (const id of ids) {
        const record = before.find(d=>d.id === id);
        const d = record.data;
        let imageAvailable = false, imageMatchesPrepared = false;
        try { const bytes = await readImage(d.imageStoragePath); imageAvailable = true; imageMatchesPrepared = sha256(bytes) === item.q.imageSha256; } catch {}
        const references = assignmentRows.reduce((count,a)=>count+(a.data.questions||[]).filter(q=>q.questionId === id).length,0);
        records.push({id,bookNumber:d.bookNumber,lesson:d.lesson||'',answer:Number(d.correctIndex)+1,
          answerMatchesSource:Number(d.correctIndex)===item.q.payload.correctIndex,
          bookMatchesSource:d.bookNumber===item.q.payload.bookNumber,
          promptMatchesSource:d.prompt===item.q.payload.prompt,
          optionsMatchSource:JSON.stringify(d.options)===JSON.stringify(item.q.payload.options),
          imageAvailable,imageMatchesPrepared,assignmentReferences:references,
          sourceFileRecorded:Boolean(d.sourceFile || String(d.explanation||'').includes(item.q.sourceFile)),
          importedByThisJob:d.importJob===JOB,
          createdAt:d.createdAt?.toDate?.().toISOString()||null,updatedAt:d.updatedAt?.toDate?.().toISOString()||null});
      }
      totalMatchingRecords += records.length;
      log('source_audit',{sourceQuestion:item.q.sourceQuestion,recordCount:records.length,records});
    }
    log('audit_complete',{bankCount:before.length,totalMatchingRecords,duplicatedSources:plan.filter(x=>x.ids?.length>1).map(x=>x.q.sourceQuestion),assignmentCount:assignmentRows.length,writes:0,finalVerificationPassed:!plan.some(x=>x.action==='conflict')});
    return;
  }
  if (plan.some(x=>x.action === 'conflict')) fail('existing_question_conflict');
  // Verify every reused image can be downloaded and decoded before any writes.
  async function readImage(path) {
    const {data:blob,error:downloadError} = await bucket.download(path);
    if (downloadError || !blob) fail('stored_image_unreadable');
    const bytes = Buffer.from(await blob.arrayBuffer());
    const metadata = await sharp(bytes).metadata();
    if (!metadata.width || !metadata.height) fail('stored_image_invalid');
    const {data:signed,error:signError} = await bucket.createSignedUrl(path,120);
    if (signError || !signed?.signedUrl) fail('image_signed_url_failed');
    const response = await fetch(signed.signedUrl);
    if (!response.ok || sha256(Buffer.from(await response.arrayBuffer())) !== sha256(bytes)) fail('image_signed_display_failed');
    return bytes;
  }
  for (const item of plan.filter(x=>x.action === 'reuse')) await readImage(item.existing.imageStoragePath);
  if (mode === '--dry-run') { log('dry_run_passed',{writes:0,creates:plan.filter(x=>x.action==='create').length,reuses:plan.filter(x=>x.action==='reuse').length}); return; }
  if (mode === '--verify' && plan.some(x=>x.action === 'create')) fail('questions_still_missing');
  // Capture checksums only in memory. Never log student records or credentials.
  const protectedBefore = new Map();
  if (mode === '--apply') {
    const collections = await db.listCollections();
    for (const collection of collections.filter(c=>c.id !== 'reviewQuestions')) {
      const rows = snapshotRows(await collection.get());
      protectedBefore.set(collection.id, new Map(rows.map(d=>[d.id,documentHash(d.data)])));
    }
    for (const item of plan.filter(x=>x.action === 'create')) {
      const q = item.q;
      const path = `review-questions/imports/${JOB}/${documentId(q)}-${q.imageSha256}.jpg`;
      const bytes = Buffer.from(q.imageBase64,'base64');
      const {error:uploadError} = await bucket.upload(path,bytes,{contentType:'image/jpeg',upsert:false,cacheControl:'3600'});
      if (uploadError && !['409','Duplicate'].includes(String(uploadError.statusCode)) && !/already exists|duplicate/i.test(uploadError.message)) fail('image_upload_failed');
      if (sha256(await readImage(path)) !== q.imageSha256) fail('uploaded_image_mismatch');
      q.storagePath = path;
    }
    const result = await db.runTransaction(async transaction => {
      const current = snapshotRows(await transaction.get(bank));
      const freshPlan = planImport(manifest.questions,current);
      if (freshPlan.some(x=>x.action === 'conflict')) fail('concurrent_question_conflict');
      const created = [];
      for (const item of freshPlan.filter(x=>x.action === 'create')) {
        const q = item.q;
        if (!q.storagePath) fail('concurrent_question_deletion');
        transaction.create(bank.doc(documentId(q)),{schemaVersion:3,...q.payload,
          imageOriginalName:`ancient-culture-question-${q.sourceQuestion}.jpg`,imageStoragePath:q.storagePath,
          sourceFile:q.sourceFile,sourcePage:q.sourcePage,sourceQuestion:q.sourceQuestion,
          sourceImportKey:sourceKey(q.payload),sourceImageSha256:q.imageSha256,importJob:JOB,
          classificationTemporary:q.classificationTemporary,
          createdBy:`system:${JOB}`,updatedBy:`system:${JOB}`,
          createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
        created.push(documentId(q));
      }
      return {created,reused:freshPlan.filter(x=>x.action==='reuse').map(x=>x.id)};
    });
    log('transaction_committed',result);
  }
  const after = snapshotRows(await bank.get());
  const finalPlan = planImport(manifest.questions,after);
  if (finalPlan.some(x=>x.action !== 'reuse')) fail('post_import_content_check_failed');
  let verifiedImages = 0;
  for (const item of finalPlan) {
    const bytes = await readImage(item.existing.imageStoragePath);
    if (item.existing.importJob === JOB && sha256(bytes) !== item.q.imageSha256) fail('post_import_image_mismatch');
    verifiedImages++;
  }
  const oldBankUnchanged = before.every(old => after.some(d=>d.id===old.id && documentHash(d.data)===documentHash(old.data)));
  if (!oldBankUnchanged) fail('preexisting_bank_changed_during_job');
  const protectedChecks = [];
  for (const [name,oldRows] of protectedBefore) {
    const current = snapshotRows(await db.collection(name).get());
    const unchanged = oldRows.size === current.length && current.every(d=>oldRows.get(d.id)===documentHash(d.data));
    protectedChecks.push({collection:name,beforeCount:oldRows.size,afterCount:current.length,unchanged});
  }
  const assignments = snapshotRows(await db.collection('reviewAssignments').get());
  const importedIds = new Set(finalPlan.filter(x=>x.existing.importJob===JOB).map(x=>x.id));
  const publishedNewQuestionReferences = assignments.reduce((count,a)=> count + (a.data.questions||[]).filter(q=>importedIds.has(q.questionId)).length,0);
  const allSourceIds = new Set(finalPlan.map(x=>x.id));
  const allSourceAssignmentReferences = assignments.reduce((count,a)=>count+(a.data.questions||[]).filter(q=>allSourceIds.has(q.questionId)).length,0);
  log('distribution_verified',{allSourceAssignmentReferences,newSourceAssignmentReferences:publishedNewQuestionReferences,reviewAssignmentCount:assignments.length});
  log('verified',{bankBefore:before.length,bankAfter:after.length,newlyCreated:after.length-before.length,
    availableQuestions:finalPlan.length,byBook:{'06호':2,'07호':1,'08호':3},
    verifiedImages,verifiedSignedImages:verifiedImages,oldBankUnchanged,protectedCollectionCount:protectedChecks.length,protectedCollectionsUnchanged:protectedChecks.every(x=>x.unchanged),
    publishedNewQuestionReferences,assignmentWrites:0,studentWrites:0,questions:summary(finalPlan)});
  if (protectedChecks.some(x=>!x.unchanged)) fail('operational_data_changed_during_job');
  if (publishedNewQuestionReferences !== 0) fail('unexpected_new_question_distribution');
  log('complete',{mode});
}

main().catch(error=>{log('aborted',{reason:error.importReason || 'unexpected_backend_error',code:String(error.code||error.name||'error')});process.exitCode=1;});
