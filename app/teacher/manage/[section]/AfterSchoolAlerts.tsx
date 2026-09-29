"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import { TEACHER_DASHBOARD_SUMMARY_REFRESH_EVENT } from "@/lib/teacherDashboard";

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

export default function AfterSchoolAlerts() {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);

  const loadSummary = useCallback(async (currentUser: User) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/teacher/dashboard-summary", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setSummary(EMPTY_SUMMARY);
        return;
      }

      const data = await response.json();
      setSummary({
        pendingCoinExchangeCount: Math.max(0, Number(data?.pendingCoinExchangeCount || 0)),
        pendingAssignmentCount: Math.max(0, Number(data?.pendingAssignmentCount || 0)),
        recentReviewCompletionCount: Math.max(0, Number(data?.recentReviewCompletionCount || 0)),
      });
    } catch {
      setSummary(EMPTY_SUMMARY);
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) void loadSummary(currentUser);
      else setSummary(EMPTY_SUMMARY);
    });
  }, [loadSummary]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => void loadSummary(user);
    window.addEventListener(TEACHER_DASHBOARD_SUMMARY_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(TEACHER_DASHBOARD_SUMMARY_REFRESH_EVENT, refresh);
  }, [loadSummary, user]);

  const alerts = [
    {
      count: summary.pendingAssignmentCount,
      label: "검토 대기 과제",
      detail: "학생이 제출했고 아직 검토가 필요한 과제",
      href: "/teacher/assignments",
    },
    {
      count: summary.pendingCoinExchangeCount,
      label: "은엽전 교환 대기",
      detail: "학생이 신청했고 아직 처리하지 않은 상품 교환",
      href: "/teacher/coin-exchanges",
    },
    {
      count: summary.recentReviewCompletionCount,
      label: "최근 복습 완료",
      detail: "최근 7일 안에 완료된 복습 기록 · 미확인 알림은 아님",
      href: "/teacher/presentations/review",
    },
  ].filter((alert) => alert.count > 0);

  if (alerts.length === 0) return null;

  return (
    <section className="mt-4 rounded-[24px] border border-red-100 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
      <div className="flex items-center gap-2">
        <span className="text-xl">🔔</span>
        <h2 className="text-base font-black text-slate-900 sm:text-lg">현재 알림</h2>
      </div>
      <p className="mt-1 text-xs font-bold text-slate-500">
        교사용 홈의 숫자 대신, 알림이 생긴 이유를 여기에서 확인할 수 있어요.
      </p>
      <div className="mt-3 grid gap-2">
        {alerts.map((alert) => (
          <a
            key={alert.label}
            href={alert.href}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <div>
              <div className="text-sm font-black text-slate-800">{alert.label}</div>
              <div className="mt-0.5 text-xs font-bold text-slate-500">{alert.detail}</div>
            </div>
            <span className="shrink-0 rounded-full bg-red-500 px-2.5 py-1 text-xs font-black text-white">
              {alert.count}건
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
