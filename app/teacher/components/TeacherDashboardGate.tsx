"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import { TEACHER_DASHBOARD_SUMMARY_REFRESH_EVENT } from "@/lib/teacherDashboard";

const managementSections = [
  {
    key: "after-school",
    href: "/teacher/manage/after-school",
    icon: "🌙",
    title: "방과후 관리",
    description: "수강생·출석·진도·과제·복습·수강료 관리",
    className: "border-blue-200 bg-blue-50 text-blue-900",
  },
  {
    key: "sun-lab",
    href: "/teacher/manage/sun-lab",
    icon: "☀️",
    title: "SUN LAB 관리",
    description: "선랩 수강생·헬로메이플 미션·도서관 관리",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  {
    key: "materials",
    href: "/teacher/manage/materials",
    icon: "📂",
    title: "자료 관리",
    description: "수업자료·자료실·복습문제 콘텐츠 관리",
    className: "border-violet-200 bg-violet-50 text-violet-900",
  },
  {
    key: "operations",
    href: "/teacher/manage/operations",
    icon: "⚙️",
    title: "일정 · 운영",
    description: "교사일정·수입·정산·공통 운영 관리",
    className: "border-rose-200 bg-rose-50 text-rose-900",
  },
] as const;

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
      if (!currentUser) setSummary(EMPTY_SUMMARY);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const refreshSummary = () => {
      void loadSummary(user);
    };

    if (pathname === "/teacher") refreshSummary();

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

  const getAlertCount = (key: (typeof managementSections)[number]["key"]) => {
    if (key === "after-school") {
      return (
        summary.pendingAssignmentCount +
        summary.pendingCoinExchangeCount +
        summary.recentReviewCompletionCount
      );
    }

    if (key === "materials") {
      return summary.recentReviewCompletionCount;
    }

    return 0;
  };

  if (pathname !== "/teacher" || !authorized) return null;

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
                🏫 교사 관리실
              </h1>
              <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500 sm:mt-2 sm:text-sm">
                운영 종류를 먼저 선택한 뒤 필요한 관리 기능으로 들어갑니다.
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

        <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4">
          {managementSections.map((section) => {
            const alertCount = getAlertCount(section.key);

            return (
              <Link
                key={section.key}
                href={section.href}
                className={`group relative rounded-[24px] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:rounded-[30px] sm:p-6 ${section.className}`}
              >
                {alertCount > 0 && (
                  <div className="absolute right-3 top-3 flex min-h-7 min-w-7 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-black text-white shadow-sm">
                    {alertCount}
                  </div>
                )}
                <div className="text-3xl sm:text-4xl">{section.icon}</div>
                <div className="mt-2 text-base font-black leading-tight sm:mt-4 sm:text-2xl">
                  {section.title}
                </div>
                <div className="mt-2 hidden text-sm font-bold leading-relaxed opacity-70 sm:block">
                  {section.description}
                </div>
                <div className="mt-3 text-xs font-black opacity-80 sm:mt-5 sm:text-sm">
                  관리하기 →
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs font-bold leading-relaxed text-slate-500 shadow-sm sm:text-sm">
          계약학교 관리는 이번 개편에서 제외하고 기존 기능을 그대로 유지했습니다. 별도 관리 영역은 다음 단계에서 추가할 수 있습니다.
        </div>
      </div>
    </div>
  );
}
