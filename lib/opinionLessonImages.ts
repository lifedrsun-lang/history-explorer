export type OpinionLessonImage = { id:string; topic:string; href:string; createdAt:string };
export type OpinionLessonImageTarget = { schoolSlug:string; classroomId:string; lessonId:string; lessonNumber:number };
export const OPINION_IMAGE_MAX_BYTES = 3_500_000;

// One image record is shared by all active classrooms within the same contract school.
export const SHARED_LESSON_IMAGE_CLASSROOM_ID = "__all__";
