import Link from "next/link";
import { DAILY_READING_DAY_COUNT, DAILY_READING_SERIES } from "@/lib/dailyReading";

export default function TeacherDailyReadingPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 pb-14 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <Link href="/teacher/manage/sun-lab" className="inline-block rounded-full bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
          ← SUN LAB 관리
        </Link>
        <header className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-black tracking-widest text-teal-600">SUN LAB · 교사용</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">📚 1일 1독해 관리</h1>
          <p className="mt-2 text-sm font-bold leading-relaxed text-slate-500">
            향후 주제별 교재와 1~29일차 문제를 등록할 관리 화면의 기본 구조입니다.
            아직 등록·공개·학생 기록 기능은 연결하지 않았습니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled type="button" className="cursor-not-allowed rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-400">+ 시리즈 추가 (준비 중)</button>
            <button disabled type="button" className="cursor-not-allowed rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-400">+ 교재 추가 (준비 중)</button>
            <button disabled type="button" className="cursor-not-allowed rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-400">문제 등록 (준비 중)</button>
          </div>
        </header>
        {DAILY_READING_SERIES.map((series) => (
          <section key={series.id} className="rounded-[28px] bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-black">주제별 시리즈 · {series.title}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {series.books.map((book) => (
                <div key={book.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-black">{book.icon} {book.title}</h3>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">준비 중</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">1~29일차 · 자료 미등록</p>
                  <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {Array.from({length:DAILY_READING_DAY_COUNT},(_,i)=>i+1).map(day=>(
                      <button key={day} disabled type="button" aria-label={book.title + " " + day + "일차 미등록"}
                        className="cursor-not-allowed rounded-lg border border-slate-200 bg-white py-2 text-xs font-black text-slate-400">
                        {day}일
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs font-bold text-slate-500">
              학생에게는 2권의 기본 틀만 보이며, 모든 일차별 학습 버튼은 비활성화 상태입니다.
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
