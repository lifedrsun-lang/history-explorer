import type { ReactNode } from "react";
import Link from "next/link";
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
      <Link
        href="/teacher/atc-confirmations"
        className="fixed bottom-4 left-4 z-[60] rounded-2xl border border-blue-200 bg-white/95 px-3 py-2 text-xs font-black text-blue-700 shadow-lg backdrop-blur"
      >
        🧾 ATC 참여확인서
      </Link>
      <Suspense fallback={null}>
        <TeacherDashboardGate />
        <TeacherActivityRefreshControl />
      </Suspense>
    </TeacherSessionBoundary>
  );
}
