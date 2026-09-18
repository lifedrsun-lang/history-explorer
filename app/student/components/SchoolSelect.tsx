import Link from "next/link";
import {
  AFTER_SCHOOL_SCHOOLS,
  matchesAfterSchoolSchool,
  type AfterSchoolStatus,
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

type SchoolCardStatus = AfterSchoolStatus;

const STATUS_ORDER: Record<SchoolCardStatus, number> = {
  active: 0,
  paused: 1,
  completed: 2,
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
      const status: SchoolCardStatus = contractSchool?.completed
        ? "completed"
        : afterSchool?.status || "active";

      return { school, contractSchool, status, index };
    })
    .sort(
      (left, right) =>
        STATUS_ORDER[left.status] - STATUS_ORDER[right.status] || left.index - right.index
    );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 text-slate-800 px-3 py-6 sm:px-4 sm:py-8">
      <div className="max-w-xl mx-auto">
        <div className="text-2xl sm:text-3xl font-bold mb-5 sm:mb-6 text-center text-slate-800">🏫 학교/수업 장소 선택</div>
        <div className="grid grid-cols-2 gap-3 rounded-[32px] border border-white/80 bg-white/80 p-3 sm:p-4 shadow-sm">
          <Link
            href="/student/book"
            className="flex h-full min-h-[112px] w-full items-center justify-center rounded-3xl border border-[#5f4318] p-4 text-center transition hover:shadow-lg"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #35230c 0%, #664718 18%, #a47e38 37%, #cfb578 49%, #896527 64%, #533812 82%, #2f1e09 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255, 255, 255, 0.38), inset 0 -1px 0 rgba(35, 22, 6, 0.5), 0 4px 12px rgba(61, 42, 13, 0.22)",
            }}
          >
            <div className="text-lg font-black leading-snug tracking-[0.1em] text-black sm:text-xl">
              SUN LAB
            </div>
          </Link>

          {schoolCards.map(({ school, contractSchool, status }) => {
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
            const isCompleted = status === "completed";
            const isPaused = status === "paused";
            const statusLabel = isCompleted ? "종강" : isPaused ? "휴강" : null;
            const cardClassName = `block h-full min-h-[112px] w-full rounded-3xl border p-4 text-center text-slate-700 shadow-sm transition ${
              isCompleted
                ? "border-slate-200 bg-white hover:bg-slate-50"
                : isPaused
                  ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                : "border-sky-200 bg-sky-50 hover:bg-sky-100"
            }`;
            const cardBody = (
              <div className="flex h-full flex-col">
                {statusLabel && (
                  <div className={`self-start rounded-full border px-2.5 py-1 text-[11px] font-black ${
                    isPaused
                      ? "border-amber-300 bg-amber-100 text-amber-700"
                      : "border-slate-300 bg-slate-100 text-slate-600"
                  }`}>
                    {statusLabel}
                  </div>
                )}
                <div className="flex flex-1 flex-col items-center justify-center">
                  <div className="text-base sm:text-lg font-black leading-snug text-slate-800">{cardInfo.title}</div>
                  <div className={`mt-2 text-xs sm:text-sm font-bold ${
                    isCompleted ? "text-slate-500" : isPaused ? "text-amber-700" : "text-sky-700"
                  }`}>📍 {contractSchool?.location || cardInfo.location}</div>
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
