/** 책 한 호에서 확인한 핵심 학습 내용을 사건에 연결한다.
 * 튜플: [교재 호수, 주제, 핵심 요점 1, 핵심 요점 2, ...]
 * 학생에게는 수강 완료한 교재의 요점만 API에서 전달한다.
 */
export type TimelineStudyNoteTuple = [issue: number, heading: string, ...points: string[]];
export type TimelineStudyNotesIndex = Record<string, TimelineStudyNoteTuple[]>;
export type TimelineStudyNote = { issue: number; heading: string; points: string[] };
