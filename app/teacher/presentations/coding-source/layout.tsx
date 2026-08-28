"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CodingSourceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const is2026 = pathname.startsWith("/teacher/presentations/coding-source/2026");

  return (
    <>
      <div className="bg-[#f5f7fb] px-3 pt-3 md:px-5 md:pt-5">
        <div className="mx-auto max-w-7xl rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-black text-emerald-600">🍁 헬로메이플 원본 콘텐츠</p>
            <p className="mt-1 text-sm font-black text-slate-700">버전을 선택해 자료를 확인하세요.</p>
          </div>
          <nav aria-label="헬로메이플 자료실 버전 선택" className="mt-3 grid gap-2 sm:grid-cols-3">
            <Link
              href="/teacher/presentations/coding-source"
              className={`rounded-2xl px-4 py-2.5 text-center text-sm font-black transition ${
                !is2026
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              기존 버전
            </Link>
            <Link
              href="/teacher/presentations/coding-source/2026"
              className={`rounded-2xl px-4 py-2.5 text-center text-sm font-black transition ${
                is2026
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              2026 버전
            </Link>
            <Link
              href="/teacher/presentations?category=coding"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              ← 코딩 자료실
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}

