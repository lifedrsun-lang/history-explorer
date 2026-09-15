import type { Metadata } from "next";
import Link from "next/link";

import ClassroomTimer from "../components/ClassroomTimer";

export const metadata: Metadata = {
  title: "40분 수업 타이머 | SUN LAB",
  description: "20분, 10분, 10분으로 자동 전환되는 SUN LAB 수업 타이머",
};

export default function TeacherTimerPage() {
  return (
    <main className="min-h-[100dvh] bg-[#eef2f7] p-3 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-3 flex items-center justify-between gap-3 sm:mb-5">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-slate-400">CLASS TOOL</p>
            <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-3xl">
              ⏱️ 40분 수업 타이머
            </h1>
          </div>

          <Link
            href="/teacher/manage/operations"
            className="shrink-0 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm sm:px-4 sm:text-sm"
          >
            ← 일정 · 운영
          </Link>
        </header>

        <ClassroomTimer />
      </div>
    </main>
  );
}
