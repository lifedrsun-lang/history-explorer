import type { ReactNode } from "react";
import { Suspense } from "react";

import TeacherActivityRefreshControl from "./components/TeacherActivityRefreshControl";
import TeacherDashboardGate from "./components/TeacherDashboardGate";
import TeacherSessionBoundary from "./components/TeacherSessionBoundary";

export default function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TeacherSessionBoundary>
      {children}
      <Suspense fallback={null}>
        <TeacherDashboardGate />
        <TeacherActivityRefreshControl />
      </Suspense>
    </TeacherSessionBoundary>
  );
}
