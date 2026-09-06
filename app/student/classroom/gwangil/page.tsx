"use client";

import SchoolMonsterClassPortal from "../../components/SchoolMonsterClassPortal";
import {
  GWANGIL_CLASSROOMS,
  GWANGIL_SCHOOL_DISPLAY_NAME,
} from "../../data/classroomData";

export default function GwangilClassroomEntryPage() {
  return (
    <SchoolMonsterClassPortal
      schoolSlug="gwangil"
      schoolDisplayName={GWANGIL_SCHOOL_DISPLAY_NAME}
      classrooms={GWANGIL_CLASSROOMS}
      onChangeSchool={() => {
        window.location.href = "/student/history";
      }}
    />
  );
}
