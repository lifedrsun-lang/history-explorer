"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import { TEACHER_DASHBOARD_SUMMARY_REFRESH_EVENT } from "@/lib/teacherDashboard";

const menuItems = [
  {
    href: "/teacher/schedule",
    icon: "📅",
    title: "교사일정",
    description: "학교별 안내·제출·행정 일정을 타임라인으로 관리",
    className: "border-rose-200 bg-rose-50 text-rose-900",
  },
  {
    href: "/teacher/students?status=active",
    icon: "🟢",
    title: "수강생",
    description: "전체·A반·B반 조회, 출석·진도·코인·교재·학생수정",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  {
    href: "/teacher/presentations",
    icon: "📽️",
    title: "수업자료",
    description: "PPT·수업자료 링크를 등록하고 수업용 자료를 관리",
    className: "border-sky-200 bg-sky-50 text-sky-900",
  },
  {
    href: "/teacher/presentations?section=archive",
    icon: "📁",
    title: "자료실",
    description: "내 공부자료·퍼실리테이터·보드게임 자료를 카드별로 보관",
    className: "border-rose-200 bg-rose-50 text-rose-900",
  },
  {
    href: "/teacher/presentations/review",
    icon: "📝",
    title: "복습문제",
    description: "문제 만들기·배포·결과를 나누어 관리",
    className: "border-blue-200 bg-blue-50 text-blue-900",
  },
  {
    href: "/teacher/assignments",
    icon: "📸",
    title: "과제관리",
    description: "과제 등록, 제출 확인, 승인·다시 해오기 관리",
    className: "border-violet-200 bg-violet-50 text-violet-900",
  },
  {
    href: "/teacher/coin-exchanges",
    icon: "🎁",
    title: "은엽전 교환",
    description: "학생의 상품권 교환 신청을 확인하고 완료·취소 처리",
    className: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
  },
  {
    href: "/teacher/fees",
    icon: "💰",
    title: "수강료",
    description: "방과후 학생별 참여월과 계약강의 차시별 강사료 계산",
    className: "border-teal-200 bg-teal-50 text-teal-900",
  },
  {
    href: "/teacher/students?status=paused",
    icon: "🟡",
    title: "수강생(쉬는중)",
    description: "쉬는 학생과 기존 숨김 학생 검색, 수강이력·재수강 관리",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
];

type DashboardSummary = {
  pendingCoinExchangeCount: number;
  pendingAssignmentCount: number;
  recentReviewCompletionCount: number;
};

const EMPTY_SUMMARY: DashboardSummary = {
  pendingCoinExchangeCount: 0,
  pendingAssignmentCount: 0,
  recentReviewCompletionCount: 0,
};

export default function TeacherDashboardGate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);

  const loadSummary = useCallback(async (currentUser: User) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/teacher/dashboard-summary", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setSummary(EMPTY_SUMMARY);
        return;
      }

      const data = await response.json();

      setSummary({
        pendingCoinExchangeCount: Math.max(
          0,
          Number(data?.pendingCoinExchangeCount || 0)
        ),
        pendingAssignmentCount: Math.max(
          0,
          Number(data?.pendingAssignmentCount || 0)
        ),
        recentReviewCompletionCount: Math.max(
          0,
          Number(data?.recentReviewCompletionCount || 0)
        ),
      });
    } catch {
      setSummary(EMPTY_SUMMARY);
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setAuthorized(Boolean(currentUser));
      setUser(currentUser);

      if (!currentUser) {
        setSummary(EMPTY_SUMMARY);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const refreshSummary = () => {
      void loadSummary(user);
    };

    if (pathname === "/teacher") {
      refreshSummary();
    }

    window.addEventListener(
      TEACHER_DASHBOARD_SUMMARY_REFRESH_EVENT,
      refreshSummary
    );

    return () => {
      window.removeEventListener(
        TEACHER_DASHBOARD_SUMMARY_REFRESH_EVENT,
        refreshSummary
      );
    };
  }, [loadSummary, pathname, user]);

  const getAlertCount = (href: string) => {
    if (href === "/teacher/assignments") {
      return summary.pendingAssignmentCount;
    }

    if (href === "/teacher/presentations/review") {
      return summary.recentReviewCompletionCount;
    }

    if (href === "/teacher/coin-exchanges") {
      return summary.pendingCoinExchangeCount;
    }

    return 0;
  };

  if (pathname !== "/teacher" || !authorized) {
    return null;
  }

  if (searchParams.get("manage") === "1") {
    return (
      <Link
        href="/teacher"
        className="fixed left-4 top-4 z-[80] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-lg"
      >
        ← 교사용 홈
      </Link>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[28px] bg-white p-5 shadow-xl sm:rounded-[32px] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
            <div>
              <div className="text-xs font-black text-slate-400 sm:text-sm">
                SUN LAB TEACHER
              </div>
              <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-4xl">
                🏫 SUN LAB 교사 관리실
              </h1>
              <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500 sm:mt-2 sm:text-sm">
                수강생과 수업 운영을 한곳에서 관리해요.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 sm:px-4 sm:text-sm"
              >
                🏝 맵으로
              </Link>
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 sm:px-4 sm:text-sm"
              >
                로그아웃
              </button>
            </div>
          </div>

          {summary.pendingCoinExchangeCount > 0 && (
            <Link
              href="/teacher/coin-exchanges"
              className="mt-4 flex items-center justify-between rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm font-black text-fuchsia-800"
            >
              <span>🔔 은엽전 교환 신청이 들어왔어요.</span>
              <span className="rounded-full bg-fuchsia-600 px-3 py-1 text-xs text-white">
                대기 {summary.pendingCoinExchangeCount}건
              </span>
            </Link>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4 md:grid-cols-2">
          {menuItems.map((item) => {
            const alertCount = getAlertCount(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative rounded-[24px] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:rounded-[30px] sm:p-6 ${item.className}`}
              >
                {alertCount > 0 && (
                  <div className="absolute right-3 top-3 flex min-h-7 min-w-7 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-black text-white shadow-sm">
                    {alertCount}
                  </div>
                )}
                <div className="text-3xl sm:text-4xl">{item.icon}</div>
                <div className="mt-2 text-base font-black leading-tight sm:mt-4 sm:text-2xl">
                  {item.title}
                </div>
                <div className="mt-2 hidden text-sm font-bold leading-relaxed opacity-70 sm:block">
                  {item.description}
                </div>
                <div className="mt-3 text-xs font-black opacity-80 sm:mt-5 sm:text-sm">
                  들어가기 →
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 hidden rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-relaxed text-slate-500 shadow-sm sm:block">
          수강중 학생의 출석·진도·코인·교재·학생 수정은 수강생 화면에서 바로 처리할 수 있습니다.
        </div>
      </div>
    </div>
  );
}
