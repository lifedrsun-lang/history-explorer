import ManagedSchoolClassroomEntry from "../../components/ManagedSchoolClassroomEntry";
import {
  GWANGIL_CLASSROOMS,
  GWANGIL_SCHOOL_DISPLAY_NAME,
} from "../../data/classroomData";

export default function GwangilClassroomEntryPage() {
  return (
    <ManagedSchoolClassroomEntry
      schoolSlug="gwangil"
      fallbackDisplayName={GWANGIL_SCHOOL_DISPLAY_NAME}
      fallbackClassrooms={GWANGIL_CLASSROOMS}
    />
  );
}
