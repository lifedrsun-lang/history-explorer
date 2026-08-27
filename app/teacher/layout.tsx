import type { ReactNode } from "react";
import { Suspense } from "react";

import TeacherActivityRefreshControl from "./components/TeacherActivityRefreshControl";
import TeacherDashboardGate from "./components/TeacherDashboardGate";

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
        <TeacherActivityRefreshControl />
      </Suspense>
    </>
  );
}
