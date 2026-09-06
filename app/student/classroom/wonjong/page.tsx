"use client";

import WonjongClassPortal from "../../components/WonjongClassPortal";

export default function WonjongClassroomEntryPage() {
  return (
    <WonjongClassPortal
      onChangeSchool={() => {
        window.location.href = "/student/history";
      }}
    />
  );
}
