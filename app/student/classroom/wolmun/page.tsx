import ManagedSchoolClassroomEntry from "../../components/ManagedSchoolClassroomEntry";
import {
  WOLMUN_CLASSROOMS,
  WOLMUN_SCHOOL_DISPLAY_NAME,
} from "../../data/classroomData";

export default function WolmunClassroomEntryPage() {
  return (
    <ManagedSchoolClassroomEntry
      schoolSlug="wolmun"
      fallbackDisplayName={WOLMUN_SCHOOL_DISPLAY_NAME}
      fallbackClassrooms={WOLMUN_CLASSROOMS}
    />
  );
}
