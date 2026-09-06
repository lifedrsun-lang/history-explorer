"use client";

import SchoolMonsterClassPortal from "../../components/SchoolMonsterClassPortal";
import {
  WOLMUN_CLASSROOMS,
  WOLMUN_SCHOOL_DISPLAY_NAME,
} from "../../data/classroomData";

export default function WolmunClassroomEntryPage() {
  return (
    <SchoolMonsterClassPortal
      schoolSlug="wolmun"
      schoolDisplayName={WOLMUN_SCHOOL_DISPLAY_NAME}
      classrooms={WOLMUN_CLASSROOMS}
      onChangeSchool={() => {
        window.location.href = "/student/history";
      }}
    />
  );
}
