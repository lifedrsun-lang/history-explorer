import { mkdir, writeFile } from 'node:fs/promises';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { documentHash, snapshotRows } from '../scripts/review-import-core.mjs';

const log=(stage,data)=>console.log('REVIEW_IMAGE_AUDIT '+JSON.stringify({stage,...data}));
const env=name=>{if(!process.env[name])throw Error('missing_configuration');return process.env[name];};
const normalize=value=>String(value??'').replace(/\s/g,'');
async function main(){
 if(env('VERCEL_ENV')!=='preview'||env('FIREBASE_ADMIN_PROJECT_ID')!=='history-quest-b8e96'||new URL(env('SUPABASE_URL')).hostname!=='yiowkxfvageewcmczsip.supabase.co')throw Error('wrong_environment');
 const db=getFirestore(initializeApp({credential:cert({projectId:env('FIREBASE_ADMIN_PROJECT_ID'),clientEmail:env('FIREBASE_ADMIN_CLIENT_EMAIL'),privateKey:env('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g,'\n')})}));
 const bank=db.collection('reviewQuestions');
 const before=snapshotRows(await bank.get());
 const matches=before.filter(({data})=>
  (Number(data.examRound)===77&&Number(data.examQuestionNumber)===5)||
  normalize(data.topic).includes('신라의황금문화'));
 log('matched',{bankCount:before.length,targetCount:matches.length});
 if(matches.length!==1)throw Error('target_identity_ambiguous');
 const supabase=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
 for(const {id,data}of matches){
  const path=String(data.imageStoragePath||'').trim();
  const result={id,topic:data.topic,bookNumber:data.bookNumber,examLevel:data.examLevel,examRound:data.examRound,examQuestionNumber:data.examQuestionNumber,hasImageStoragePath:Boolean(path),hasImageOriginalName:Boolean(String(data.imageOriginalName||'').trim()),hasLegacyImageUrl:Boolean(data.imageUrl||data.image||data.imagePath),sourceFile:data.sourceFile||'',createdAt:data.createdAt?.toDate?.().toISOString()||null,updatedAt:data.updatedAt?.toDate?.().toISOString()||null,imageStatus:'not_registered'};
  if(path){
   const {data:signed,error}=await supabase.storage.from(env('SUPABASE_ASSIGNMENT_BUCKET')).createSignedUrl(path,300);
   if(error||!signed?.signedUrl)result.imageStatus='sign_failed';
   else {
    const response=await fetch(signed.signedUrl);
    result.imageHttpStatus=response.status;
    if(response.ok){
     try{const info=await sharp(Buffer.from(await response.arrayBuffer())).metadata();result.imageStatus='loadable';result.imageFormat=info.format;result.imageWidth=info.width;result.imageHeight=info.height;}
     catch{result.imageStatus='decode_failed';}
    }else result.imageStatus='download_failed';
   }
  }
  log('question',result);
 }
 const after=snapshotRows(await bank.get());
 const hashes=new Map(before.map(r=>[r.id,documentHash(r.data)]));
 const unchanged=after.length===before.length&&after.every(r=>hashes.get(r.id)===documentHash(r.data));
 if(!unchanged)throw Error('bank_changed_during_audit');
 log('complete',{bankUnchanged:true,questionWrites:0,studentWrites:0,assignmentWrites:0,productionDeployment:false});
 await mkdir('operator-result',{recursive:true});
 await writeFile('operator-result/index.html','<!doctype html><title>Read-only audit</title><p>Read-only audit completed. Details are in authenticated build logs.</p>');
}
main().catch(error=>{log('aborted',{reason:['wrong_environment','missing_configuration','target_identity_ambiguous','bank_changed_during_audit'].includes(error.message)?error.message:'backend_error'});process.exitCode=1;});
