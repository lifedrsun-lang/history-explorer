import ManagedSchoolClassroomEntry from "../../components/ManagedSchoolClassroomEntry";
import {
  WONJONG_CLASSROOMS,
  WONJONG_SCHOOL_DISPLAY_NAME,
} from "../../data/classroomData";

export default function WonjongClassroomEntryPage() {
  return (
    <ManagedSchoolClassroomEntry
      schoolSlug="wonjong"
      fallbackDisplayName={WONJONG_SCHOOL_DISPLAY_NAME}
      fallbackClassrooms={WONJONG_CLASSROOMS}
    />
  );
}
