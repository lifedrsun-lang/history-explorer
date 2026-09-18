import Link from "next/link";
import {
  AFTER_SCHOOL_SCHOOLS,
  matchesAfterSchoolSchool,
} from "@/lib/afterSchool";
import type { ContractSchoolSummary } from "@/lib/contractSchools";
import {
  getSchoolInfo,
  getSchoolLoginCard,
  isGaebongSchool,
  normalizeSchoolText,
} from "../data/schoolInfo";

type Props = {
  schools: string[];
  contractSchools?: ContractSchoolSummary[];
  onSelect: (school: string) => void;
};

export default function SchoolSelect({
  schools,
  contractSchools = [],
  onSelect,
}: Props) {
  const schoolCards = schools
    .map((school, index) => {
      const target = normalizeSchoolText(school);
      const contractSchool = contractSchools.find(
        (item) =>
          normalizeSchoolText(item.schoolName) === target ||
          normalizeSchoolText(item.displayName) === target
      );
      const afterSchool = AFTER_SCHOOL_SCHOOLS.find((item) =>
        matchesAfterSchoolSchool(school, item)
      );
      const completed =
        contractSchool?.completed === true || afterSchool?.completed === true;

      return { school, contractSchool, completed, index };
    })
    .sort(
      (left, right) =>
        Number(left.completed) - Number(right.completed) ||
        left.index - right.index
    );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 text-slate-800 px-3 py-6 sm:px-4 sm:py-8">
      <div className="max-w-xl mx-auto">
        <div className="text-2xl sm:text-3xl font-bold mb-5 sm:mb-6 text-center text-slate-800">🏫 학교/수업 장소 선택</div>
        <div className="grid grid-cols-2 gap-3 rounded-[32px] border border-white/80 bg-white/80 p-3 sm:p-4 shadow-sm">
          <Link
            href="/student/book"
            className="flex h-full min-h-[112px] w-full items-center justify-center rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-200 p-4 text-center text-slate-700 shadow-sm transition hover:from-slate-50 hover:via-white hover:to-sky-50"
          >
            <div className="text-base sm:text-lg font-black leading-snug text-slate-800">SUN LAB</div>
          </Link>

          {schoolCards.map(({ school, contractSchool, completed }) => {
            const cardInfo = getSchoolLoginCard(school);
            const schoolInfo = getSchoolInfo(school);
            const routeBySchool: Record<string, string> = {
              "부천 원종초등학교": "/student/classroom/wonjong",
              "광명 광일초등학교": "/student/classroom/gwangil",
              "화성 월문초등학교": "/student/classroom/wolmun",
            };
            const classroomRoute = contractSchool
              ? `/student/classroom/${contractSchool.slug}`
              : schoolInfo
                ? routeBySchool[schoolInfo.name]
                : undefined;
            const isCompleted = completed;
            const cardClassName = `block h-full min-h-[112px] w-full rounded-3xl border p-4 text-center text-slate-700 shadow-sm transition ${
              isCompleted
                ? "border-slate-200 bg-white hover:bg-slate-50"
                : "border-sky-200 bg-sky-50 hover:bg-sky-100"
            }`;
            const cardBody = (
              <div className="flex h-full flex-col">
                {isCompleted && (
                  <div className="self-start rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                    종강
                  </div>
                )}
                <div className="flex flex-1 flex-col items-center justify-center">
                  <div className="text-base sm:text-lg font-black leading-snug text-slate-800">{cardInfo.title}</div>
                  <div className={`mt-2 text-xs sm:text-sm font-bold ${isCompleted ? "text-slate-500" : "text-sky-700"}`}>📍 {contractSchool?.location || cardInfo.location}</div>
                </div>
              </div>
            );

            if (isGaebongSchool(school) || classroomRoute) {
              return <Link key={school} href={classroomRoute || "/student/classroom/gaebong"} className={cardClassName}>{cardBody}</Link>;
            }

            return <button key={school} onClick={() => onSelect(school)} className={cardClassName}>{cardBody}</button>;
          })}
        </div>
        <div className="mt-6 flex justify-center"><Link href="/teacher" className="rounded-full border border-slate-200 bg-white/50 px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-slate-700">교사용 접속</Link></div>
      </div>
    </div>
  );
}
