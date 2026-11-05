export type HistoryTimelineMaterialAccess = {
  studyBasic: boolean;
  studyAdvanced: boolean;
  exam: boolean;
};

export const TEACHER_TIMELINE_MATERIAL_ACCESS: HistoryTimelineMaterialAccess = {
  studyBasic: true,
  studyAdvanced: true,
  exam: true,
};

// 일반 별꼼역사 수강생은 기출 자료만 교사가 명시적으로 허용할 수 있다.
// 별별한국사 학습자료 권한은 학생 이름이 아니라 SUN LAB 회원 프로필의
// 명시적 계정 플래그로만 부여한다.
export function getByeolkkumTimelineMaterialAccess(student: Record<string, unknown>): HistoryTimelineMaterialAccess {
  return {
    studyBasic: false,
    studyAdvanced: false,
    exam: student.timelineExamAccess === true,
  };
}

export function getSunLabTimelineMaterialAccess(profile: Record<string, unknown>): HistoryTimelineMaterialAccess {
  return {
    studyBasic: profile.timelineStudyBasicAccess === true,
    studyAdvanced: profile.timelineStudyAdvancedAccess === true,
    exam: profile.timelineExamAccess === true,
  };
}
