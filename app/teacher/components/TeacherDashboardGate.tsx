"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

const menuItems = [
  {
    href: "/teacher/students?status=active",
    icon: "🟢",
    title: "수강생(수강중)",
    description: "전체·A반·B반 조회, 출석·진도·코인·교재·학생수정",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  {
    href: "/teacher/students?status=paused",
    icon: "🟡",
    title: "수강생(쉬는중)",
    description: "쉬는 학생과 기존 숨김 학생 검색, 수강이력·재수강 관리",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  {
    href: "/teacher/presentations",
    icon: "📽️",
    title: "수업자료 관리",
    description: "PPT·수업자료 링크를 등록하고 수업용 자료를 관리",
    className: "border-sky-200 bg-sky-50 text-sky-900",
  },
  {
    href: "/teacher/presentations/review",
    icon: "📝",
    title: "복습문제",
    description: "수업 복습문제를 확인하고 문제은행을 관리",
    className: "border-blue-200 bg-blue-50 text-blue-900",
  },
  {
    href: "/teacher/assignments",
    icon: "📸",
    title: "과제 관리",
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
];

export default function TeacherDashboardGate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState(false);
  const [pendingExchangeCount, setPendingExchangeCount] = useState(0);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setAuthorized(Boolean(user));

      if (!user) {
        setPendingExchangeCount(0);
        return;
      }

      void user
        .getIdToken()
        .then((token) =>
          fetch("/api/teacher/coin-exchanges", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        )
        .then(async (response) => {
          if (!response.ok) {
            return null;
          }

          return response.json();
        })
        .then((data) => {
          const requests = Array.isArray(data?.requests) ? data.requests : [];
          setPendingExchangeCount(
            requests.filter((item: { status?: string }) => item?.status === "pending").length
          );
        })
        .catch(() => {
          setPendingExchangeCount(0);
        });
    });
  }, []);

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
              <div className="text-xs font-black text-slate-400 sm:text-sm">TEACHER HOME</div>
              <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-4xl">
                🏫 역사 탐험 관리소
              </h1>
              <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500 sm:mt-2 sm:text-sm">
                오늘 필요한 관리 메뉴를 선택해 주세요.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/" className="rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 sm:px-4 sm:text-sm">
                🏝 맵으로
              </Link>
              <Link href="/teacher?fees=1" className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 sm:px-4 sm:text-sm">
                💰 강사료
              </Link>
              <button type="button" onClick={() => signOut(auth)} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 sm:px-4 sm:text-sm">
                로그아웃
              </button>
            </div>
          </div>

          {pendingExchangeCount > 0 && (
            <Link
              href="/teacher/coin-exchanges"
              className="mt-4 flex items-center justify-between rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm font-black text-fuchsia-800"
            >
              <span>🔔 은엽전 교환 신청이 들어왔어요.</span>
              <span className="rounded-full bg-fuchsia-600 px-3 py-1 text-xs text-white">
                대기 {pendingExchangeCount}건
              </span>
            </Link>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4 md:grid-cols-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative rounded-[24px] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:rounded-[30px] sm:p-6 ${item.className}`}
            >
              {item.href === "/teacher/coin-exchanges" && pendingExchangeCount > 0 && (
                <div className="absolute right-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-black text-white shadow-sm">
                  {pendingExchangeCount}
                </div>
              )}
              <div className="text-3xl sm:text-4xl">{item.icon}</div>
              <div className="mt-2 text-base font-black leading-tight sm:mt-4 sm:text-2xl">{item.title}</div>
              <div className="mt-2 hidden text-sm font-bold leading-relaxed opacity-70 sm:block">{item.description}</div>
              <div className="mt-3 text-xs font-black opacity-80 sm:mt-5 sm:text-sm">들어가기 →</div>
            </Link>
          ))}
        </div>

        <div className="mt-4 hidden rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-relaxed text-slate-500 shadow-sm sm:block">
          수강중 학생의 출석·진도·코인·교재·학생 수정은 수강생 화면에서 바로 처리할 수 있습니다.
        </div>
      </div>
    </div>
  );
}
