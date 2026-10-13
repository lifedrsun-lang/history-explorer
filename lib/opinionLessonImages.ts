export type OpinionLessonImage = { id:string; topic:string; href:string; createdAt:string };
export type OpinionLessonImageTarget = { schoolSlug:string; classroomId:string; lessonId:string; lessonNumber:number };
export const OPINION_IMAGE_MAX_BYTES = 3_500_000;
