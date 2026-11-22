"use client";

import Link from "next/link";
import { useState } from "react";
import { DAILY_READING_DAY_COUNT, DAILY_READING_SERIES } from "@/lib/dailyReading";

const series = DAILY_READING_SERIES[0];
const books = series.books;

export default function StudentDailyReadingPage() {
  const [selectedBookId, setSelectedBookId] = useState(books[0].id);
  const selectedBook = books.find((book) => book.id === selectedBookId) || books[0];

  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-emerald-50 p-3 pb-14 text-slate-800 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/student/book" className="inline-block rounded-full bg-white/80 px-4 py-2 text-sm font-black text-slate-600">
          ← SUN LAB
        </Link>

        <header className="rounded-[28px] bg-gradient-to-r from-sky-700 to-teal-700 p-5 text-white shadow-lg sm:p-7">
          <p className="text-xs font-black tracking-widest text-sky-100">SUN LAB · DAILY READING</p>
          <h1 className="mt-2 text-3xl font-black">📚 1일 1독해</h1>
          <p className="mt-2 text-sm font-bold text-sky-50">주제별 교재를 선택하고 하루 한 편씩 읽어 보는 공간이에요.</p>
          <span className="mt-4 inline-flex rounded-full bg-white/20 px-3 py-1.5 text-xs font-black">
            화면 준비 완료 · 학습 기능은 준비 중
          </span>
        </header>

        <section className="rounded-[26px] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-black">교재 선택</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">주제별 시리즈 · {series.title}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {books.map((book) => {
              const selected = book.id === selectedBookId;
              return (
                <button
                  key={book.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedBookId(book.id)}
                  className={`rounded-2xl border-2 p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${selected
                    ? "border-teal-500 bg-teal-50 shadow-sm"
                    : "border-slate-100 bg-slate-50 hover:border-teal-200"}`}
                >
                  <span className="text-3xl" aria-hidden="true">{book.icon}</span>
                  <span className="mt-2 block text-lg font-black">{book.title}</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">29일 구성 · 준비 중</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[26px] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black">{selectedBook.icon} {selectedBook.title}</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">1일차부터 29일차까지</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">
              학습자료 미등록
            </span>
          </div>
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold leading-relaxed text-amber-900">
            지금은 기본 화면만 준비했어요. 문제와 정답이 등록되기 전까지 일차별 학습 버튼은 선택할 수 없어요.
          </p>
          <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-7">
            {Array.from({ length: DAILY_READING_DAY_COUNT }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                disabled
                aria-label={day + "일차 학습 준비 중"}
                className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-1 py-2 text-slate-400 opacity-80"
              >
                <span aria-hidden="true" className="text-xs">🔒</span>
                <span className="text-xs font-black sm:text-sm">{day}일</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-xs font-bold text-slate-500">교재별 학습 진도와 보상 기능은 추후 연결할 예정이에요.</p>
        </section>

        <div className="rounded-2xl border border-dashed border-teal-200 bg-white/70 p-4 text-center text-sm font-bold text-slate-500">
          다른 1일 1독해 시리즈는 필요할 때 순서대로 추가돼요.
        </div>
      </div>
    </main>
  );
}
