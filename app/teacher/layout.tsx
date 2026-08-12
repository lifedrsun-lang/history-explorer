import type { ReactNode } from "react";
import { Suspense } from "react";

import TeacherDashboardGate from "./components/TeacherDashboardGate";
import TeacherFeePanel from "./components/TeacherFeePanel";

export default function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <TeacherDashboardGate />
        <TeacherFeePanel />
      </Suspense>
    </>
  );
}
