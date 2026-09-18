import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AFTER_SCHOOL_SCHOOLS,
  getAfterSchoolSchool,
} from "@/lib/afterSchool";

export function generateStaticParams() {
  return AFTER_SCHOOL_SCHOOLS.map((school) => ({ school: school.slug }));
}

export default async function AfterSchoolSchoolPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolSlug } = await params;
  const school = getAfterSchoolSchool(schoolSlug);

  if (!school) notFound();

  const studentManagementHref = `/teacher/students?status=active&school=${encodeURIComponent(school.name)}`;

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[28px] bg-white p-5 shadow-xl sm:rounded-[32px] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.18em] text-sky-600">AFTER SCHOOL</div>
              <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
                🏫 {school.shortName}
              </h1>
              <p className="mt-2 text-sm font-bold text-slate-500">{school.location}</p>
            </div>
            <Link
              href="/teacher/manage/after-school"
              className="w-fit rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"
            >
              ← 학교 선택
            </Link>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
          <Link
            href={studentManagementHref}
            className="rounded-[28px] border border-blue-200 bg-blue-50 p-5 text-blue-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-7"
          >
            <div className="text-4xl">👧</div>
            <h2 className="mt-4 text-2xl font-black">수강생 관리</h2>
            <p className="mt-2 text-sm font-bold leading-relaxed text-blue-700">
              기존 화면에서 학생 정보·과제·복습문제·미션·진도와 상태를 확인합니다.
            </p>
            <div className="mt-6 text-sm font-black">기존 관리 화면 열기 →</div>
          </Link>

          <Link
            href={`/teacher/after-school/${school.slug}/coins`}
            className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-7"
          >
            <div className="text-4xl">🪙</div>
            <h2 className="mt-4 text-2xl font-black">코인 지급</h2>
            <p className="mt-2 text-sm font-bold leading-relaxed text-amber-700">
              수강중 학생을 반별로 보고 보너스·과제·퀴즈 코인을 바로 지급합니다.
            </p>
            <div className="mt-6 text-sm font-black">수업용 지급 화면 열기 →</div>
          </Link>
        </section>
      </div>
    </main>
  );
}
