import Link from "next/link";
import {
  getSchoolLoginCard,
  isGaebongSchool,
} from "../data/schoolInfo";

type Props = {
  schools: string[];
  onSelect: (school: string) => void;
};

export default function SchoolSelect({
  schools,
  onSelect,
}: Props) {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 text-slate-800 px-3 py-6 sm:px-4 sm:py-8">
      <div className="max-w-xl mx-auto">
        <div className="text-2xl sm:text-3xl font-bold mb-5 sm:mb-6 text-center text-slate-800">
          🏫 학교/수업 장소 선택
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-[32px] border border-white/80 bg-white/80 p-3 sm:p-4 shadow-sm">
          {schools.map((school) => {
            const cardInfo = getSchoolLoginCard(school);
            const cardClassName =
              "block h-full min-h-[112px] w-full bg-white border border-sky-100 rounded-3xl p-4 text-left text-slate-700 shadow-sm transition hover:bg-sky-50";

            if (isGaebongSchool(school)) {
              return (
                <Link
                  key={school}
                  href="/student/classroom"
                  className={cardClassName}
                >
                  <div className="flex h-full flex-col">
                    <div className="text-base sm:text-lg font-black leading-snug text-slate-800">
                      {cardInfo.title}
                    </div>
                    <div className="mt-2 text-xs sm:text-sm font-bold text-sky-700">
                      📍 {cardInfo.location}
                    </div>
                    <span className="mt-auto self-start rounded-full bg-orange-100 px-2 py-1 text-[10px] sm:text-[11px] font-black text-orange-700">
                      반 수업방
                    </span>
                  </div>
                </Link>
              );
            }

            return (
              <button
                key={school}
                onClick={() => onSelect(school)}
                className={cardClassName}
              >
                <div className="flex h-full flex-col">
                  <div className="text-base sm:text-lg font-black leading-snug text-slate-800">
                    {cardInfo.title}
                  </div>

                  <div className="mt-2 text-xs sm:text-sm font-bold text-sky-700">
                    📍 {cardInfo.location}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/teacher"
            className="rounded-full border border-slate-200 bg-white/50 px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-slate-700"
          >
            교사용 접속
          </Link>
        </div>
      </div>
    </div>
  );
}
