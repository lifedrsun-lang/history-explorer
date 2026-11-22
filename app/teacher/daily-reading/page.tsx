import Link from "next/link";
import { DAILY_READING_DAY_COUNT, DAILY_READING_SERIES } from "@/lib/dailyReading";
import { FOLKTALES_ACTIVE_DAYS, FOLKTALES_CARDS, FIVE_DAY_REVIEW_ENDS, vocabularyCardsForDay, vocabularyCardsForFiveDayReview } from "@/lib/dailyReadingVocabulary";

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
            전래동화편 1~15일차 어휘 카드 46개가 학습용으로 등록되어 있습니다.
            오답 다음 날 복습과 5일 단위 총복습은 학생 화면에서 진행합니다.
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
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                      {book.id === "folktales" ? "1~15일차 공개" : "준비 중"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {book.id === "folktales" ? "어휘 " + FOLKTALES_CARDS.length + "개 · 학생별 학습 기록" : "1~29일차 · 자료 미등록"}
                  </p>
                  <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {Array.from({length:DAILY_READING_DAY_COUNT},(_,i)=>i+1).map(day=>(
                      <button key={day} disabled type="button"
                        aria-label={book.title + " " + day + "일차 " + (book.id === "folktales" && FOLKTALES_ACTIVE_DAYS.includes(day) ? "학생 학습 가능" : "미등록")}
                        className={"cursor-default rounded-lg border py-2 text-xs font-black " +
                          (book.id === "folktales" && FOLKTALES_ACTIVE_DAYS.includes(day)
                            ? "border-teal-200 bg-teal-50 text-teal-800" :
                            "border-slate-200 bg-white text-slate-400")}>
                        {day}일{book.id === "folktales" && FOLKTALES_ACTIVE_DAYS.includes(day) ?
                          <span className="block text-[10px]">{vocabularyCardsForDay(day).length}개</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs font-bold text-slate-500">
              교사용 편집·추가 버튼은 아직 비활성화되어 있습니다. 전래동화 16~29일차와 보물편은 준비 중입니다.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {FIVE_DAY_REVIEW_ENDS.map(end => <div key={end} className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-center text-xs font-black text-indigo-800">
                {end - 4}~{end}일 총복습
                <span className="mt-1 block text-sm">{vocabularyCardsForFiveDayReview(end).length}개 어휘</span>
              </div>)}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
