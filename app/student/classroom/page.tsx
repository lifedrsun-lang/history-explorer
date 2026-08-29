"use client";

import GaebongClassPortal from "../components/GaebongClassPortal";

export default function GaebongClassroomEntryPage() {
  return (
    <GaebongClassPortal
      onChangeSchool={() => {
        window.location.href = "/student/history";
      }}
    />
  );
}
