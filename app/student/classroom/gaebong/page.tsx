import ManagedSchoolClassroomEntry from "../../components/ManagedSchoolClassroomEntry";
import {
  GAEBONG_CLASSROOMS,
  GAEBONG_SCHOOL_DISPLAY_NAME,
} from "../../data/classroomData";

export default function GaebongClassroomEntryPage() {
  return (
    <ManagedSchoolClassroomEntry
      schoolSlug="gaebong"
      fallbackDisplayName={GAEBONG_SCHOOL_DISPLAY_NAME}
      fallbackClassrooms={GAEBONG_CLASSROOMS}
    />
  );
}
