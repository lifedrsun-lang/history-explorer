import ManagedSchoolClassroomEntry from "../../components/ManagedSchoolClassroomEntry";
import { SHINSANGDO_CLASSROOMS } from "@/lib/contractSchools";

export default function ShinsangdoClassroomEntryPage() {
  return (
    <ManagedSchoolClassroomEntry
      schoolSlug="shinsangdo"
      fallbackDisplayName="서울 신상도초"
      fallbackClassrooms={SHINSANGDO_CLASSROOMS}
    />
  );
}
