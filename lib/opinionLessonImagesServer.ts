import "server-only";
import sharp from "sharp";
import { getAssignmentBucketName,getSupabaseServer } from "@/lib/supabaseServer";
import { OPINION_IMAGE_MAX_BYTES,type OpinionLessonImageTarget } from "@/lib/opinionLessonImages";
export const OPINION_LESSON_IMAGE_TABLE="opinion_lesson_images";
export type StoredOpinionLessonImage = OpinionLessonImageTarget & {id:string;topic:string;opinionCount:number|null;contentType:string;createdBy:string;bucket:string;storagePath:string;createdAt:string};
const columns="id,school_slug,classroom_id,lesson_id,lesson_number,topic,opinion_count,content_type,created_by,bucket,storage_path,created_at";
type ImageRow={id:string;school_slug:string;classroom_id:string;lesson_id:string;lesson_number:number;topic:string;opinion_count:number|null;content_type:string;created_by:string;bucket:string;storage_path:string;created_at:string};
const fromRow=(r:ImageRow):StoredOpinionLessonImage=>({id:r.id,schoolSlug:r.school_slug,classroomId:r.classroom_id,lessonId:r.lesson_id,lessonNumber:r.lesson_number,topic:r.topic,opinionCount:r.opinion_count,contentType:r.content_type||"image/png",createdBy:r.created_by,bucket:r.bucket,storagePath:r.storage_path,createdAt:r.created_at});
export async function listOpinionLessonImages(schoolSlug:string,classroomId:string) {
  const {data,error}=await getSupabaseServer().from(OPINION_LESSON_IMAGE_TABLE).select(columns).eq("school_slug",schoolSlug).eq("classroom_id",classroomId).order("created_at",{ascending:true}).limit(500);
  if(error) throw new Error("opinion_image_storage");return (data as ImageRow[]).map(fromRow);
}
export async function getOpinionLessonImage(id:string) {
  const {data,error}=await getSupabaseServer().from(OPINION_LESSON_IMAGE_TABLE).select(columns).eq("id",id).maybeSingle();
  if(error) throw new Error("opinion_image_storage");return data?fromRow(data as ImageRow):null;
}
export async function storeOpinionLessonImage(target:OpinionLessonImageTarget,source:{id:string;topic:string;opinionCount:number;createdBy:string;bytes:Buffer}) {
  if(source.bytes.length>OPINION_IMAGE_MAX_BYTES || !source.bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error("invalid_opinion_image");
  const metadata=await sharp(source.bytes,{limitInputPixels:20_000_000}).metadata();
  if(metadata.format!=="png" || !metadata.width || !metadata.height || metadata.width>8192 || metadata.height>8192) throw new Error("invalid_opinion_image");
  return storeLessonImage(target,{...source,contentType:"image/png"});
}
export async function storeUploadedLessonImage(target:OpinionLessonImageTarget,source:{id:string;topic:string;createdBy:string;bytes:Buffer}) {
  if(!source.bytes.length || source.bytes.length>OPINION_IMAGE_MAX_BYTES) throw new Error("invalid_lesson_image");
  let bytes:Buffer;
  try {
    const image=sharp(source.bytes,{limitInputPixels:20_000_000});
    const metadata=await image.metadata();
    if(!metadata.format || !["jpeg","png","webp"].includes(metadata.format)) throw new Error("invalid_lesson_image");
    bytes=await image.rotate().resize({width:2560,height:2560,fit:"inside",withoutEnlargement:true}).webp({quality:90}).toBuffer();
  } catch {throw new Error("invalid_lesson_image");}
  if(bytes.length>OPINION_IMAGE_MAX_BYTES) throw new Error("invalid_lesson_image");
  return storeLessonImage(target,{...source,bytes,opinionCount:null,contentType:"image/webp"});
}
async function storeLessonImage(target:OpinionLessonImageTarget,source:{id:string;topic:string;opinionCount:number|null;contentType:string;createdBy:string;bytes:Buffer}) {
  const prior=await getOpinionLessonImage(source.id);
  if(prior) {
    if(prior.createdBy!==source.createdBy || prior.schoolSlug!==target.schoolSlug || prior.classroomId!==target.classroomId || prior.lessonId!==target.lessonId || prior.lessonNumber!==target.lessonNumber) throw new Error("image_target_changed");
    return prior;
  }
  const db=getSupabaseServer(),bucket=getAssignmentBucketName();
  const path=`classroom-opinions/${encodeURIComponent(target.schoolSlug)}/${encodeURIComponent(target.classroomId)}/${source.id}.${source.contentType==="image/webp"?"webp":"png"}`;
  const upload=await db.storage.from(bucket).upload(path,source.bytes,{contentType:source.contentType,upsert:false});
  if(upload.error) throw new Error("opinion_image_storage");
  const {data,error}=await db.from(OPINION_LESSON_IMAGE_TABLE).insert({id:source.id,school_slug:target.schoolSlug,classroom_id:target.classroomId,lesson_id:target.lessonId,lesson_number:target.lessonNumber,topic:source.topic,opinion_count:source.opinionCount,content_type:source.contentType,created_by:source.createdBy,bucket,storage_path:path}).select(columns).single();
  if(error) {await db.storage.from(bucket).remove([path]);throw new Error("opinion_image_storage");}
  return fromRow(data as ImageRow);
}
export async function downloadOpinionLessonImage(image:StoredOpinionLessonImage) {
  const {data,error}=await getSupabaseServer().storage.from(image.bucket).download(image.storagePath);
  if(error || !data) throw new Error("opinion_image_storage");return data;
}
export async function deleteOpinionLessonImage(image:StoredOpinionLessonImage) {
  const db=getSupabaseServer();
  // Keep metadata on a storage failure so the teacher can retry the same photo.
  const removed=await db.storage.from(image.bucket).remove([image.storagePath]);
  if(removed.error) throw new Error("opinion_image_storage");
  const {error}=await db.from(OPINION_LESSON_IMAGE_TABLE).delete().eq("id",image.id).eq("storage_path",image.storagePath);
  if(error) throw new Error("opinion_image_storage");
}

