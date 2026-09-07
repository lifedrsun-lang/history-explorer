import Link from "next/link";
import { getSchoolInfo, getSchoolLoginCard, isGaebongSchool } from "../data/schoolInfo";

type Props = { schools: string[]; onSelect: (school: string) => void };

export default function SchoolSelect({ schools, onSelect }: Props) {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 text-slate-800 px-3 py-6 sm:px-4 sm:py-8">
      <div className="max-w-xl mx-auto">
        <div className="text-2xl sm:text-3xl font-bold mb-5 sm:mb-6 text-center text-slate-800">🏫 학교/수업 장소 선택</div>
        <div className="grid grid-cols-2 gap-3 rounded-[32px] border border-white/80 bg-white/80 p-3 sm:p-4 shadow-sm">
          <Link
            href="/student/book"
            className="col-span-2 flex min-h-[112px] w-full items-center justify-center rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-sky-50 p-4 text-center text-slate-700 shadow-sm transition hover:bg-sky-50"
          >
            <div>
              <div className="text-2xl font-black text-slate-800">📚 SUN LAB Book</div>
              <div className="mt-2 text-sm font-bold text-sky-700">도서관 · 헬로메이플</div>
            </div>
          </Link>

          {schools.map((school) => {
            const cardInfo = getSchoolLoginCard(school);
            const schoolInfo = getSchoolInfo(school);
            const routeBySchool: Record<string, string> = {
              "부천 원종초등학교": "/student/classroom/wonjong",
              "광명 광일초등학교": "/student/classroom/gwangil",
              "화성 월문초등학교": "/student/classroom/wolmun",
            };
            const classroomRoute = schoolInfo ? routeBySchool[schoolInfo.name] : undefined;
            const cardClassName = "block h-full min-h-[112px] w-full bg-white border border-sky-100 rounded-3xl p-4 text-center text-slate-700 shadow-sm transition hover:bg-sky-50";
            const cardBody = (
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-base sm:text-lg font-black leading-snug text-slate-800">{cardInfo.title}</div>
                <div className="mt-2 text-xs sm:text-sm font-bold text-sky-700">📍 {cardInfo.location}</div>
              </div>
            );

            if (isGaebongSchool(school) || classroomRoute) {
              return <Link key={school} href={isGaebongSchool(school) ? "/student/classroom" : classroomRoute!} className={cardClassName}>{cardBody}</Link>;
            }

            return <button key={school} onClick={() => onSelect(school)} className={cardClassName}>{cardBody}</button>;
          })}
        </div>
        <div className="mt-6 flex justify-center"><Link href="/teacher" className="rounded-full border border-slate-200 bg-white/50 px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-slate-700">교사용 접속</Link></div>
      </div>
    </div>
  );
}
