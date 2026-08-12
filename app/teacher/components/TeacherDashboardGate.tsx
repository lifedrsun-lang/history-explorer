"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

const menuItems = [
  {
    href: "/teacher/students",
    icon: "👧",
    title: "수강생 관리",
    description: "수강중·쉬는중·종료, 분기별 수강이력과 학생 검색",
    className: "border-sky-200 bg-sky-50 text-sky-900",
  },
  {
    href: "/teacher/presentations",
    icon: "📽️",
    title: "수업자료 관리",
    description: "PPT·수업자료 링크를 등록하고 수업용 자료를 관리",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  {
    href: "/teacher/assignments",
    icon: "📸",
    title: "과제 관리",
    description: "과제 등록, 제출 확인, 승인·다시 해오기 관리",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  {
    href: "/teacher?fees=1",
    icon: "💰",
    title: "강사료",
    description: "현재 수강중인 학생 기준 학교·반별 예상 강사료 확인",
    className: "border-violet-200 bg-violet-50 text-violet-900",
  },
];

export default function TeacherDashboardGate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setAuthorized(Boolean(user));
    });
  }, []);

  if (
    pathname !== "/teacher" ||
    !authorized ||
    searchParams.get("manage") === "1" ||
    searchParams.get("fees") === "1"
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#f5f7fb] p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[32px] bg-white p-6 shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-black text-slate-400">
                TEACHER HOME
              </div>
              <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">
                🏫 역사 탐험 관리소
              </h1>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-500">
                오늘 필요한 관리 메뉴를 선택해 주세요.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700"
              >
                🏝 맵으로
              </Link>
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group rounded-[30px] border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${item.className}`}
            >
              <div className="text-4xl">{item.icon}</div>
              <div className="mt-4 text-2xl font-black">{item.title}</div>
              <div className="mt-2 text-sm font-bold leading-relaxed opacity-70">
                {item.description}
              </div>
              <div className="mt-5 text-sm font-black opacity-80">
                들어가기 →
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-relaxed text-slate-500 shadow-sm">
          기존 출석·진도·코인·학생 수정 기능은 그대로 보존되어 있습니다. 수강생 관리에서 필요한 경우
          <span className="font-black text-slate-700"> 상세 학생관리</span>로 들어갈 수 있습니다.
        </div>
      </div>
    </div>
  );
}
