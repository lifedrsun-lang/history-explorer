"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const SUNLAB_BOOK_PASSWORD = "1136";

export default function SunLabBookPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.trim() === SUNLAB_BOOK_PASSWORD) {
      setUnlocked(true);
      setPassword("");
      return;
    }

    alert("비밀번호가 틀렸습니다.");
  };

  if (!unlocked) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 px-4 py-8 text-slate-800">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md items-center justify-center">
          <div className="w-full rounded-[32px] border border-white/80 bg-white/95 p-7 shadow-xl">
            <div className="text-center">
              <div className="text-4xl">📚</div>
              <h1 className="mt-3 text-3xl font-black text-slate-800">SUN LAB Book</h1>
              <p className="mt-2 text-sm font-bold text-slate-500">입장 비밀번호를 입력해 주세요.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호"
                className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-xl font-black tracking-[0.3em] text-slate-800 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-sky-400 py-4 text-lg font-black text-white shadow-sm transition hover:bg-sky-500"
              >
                입장하기
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/student/history"
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
              >
                메인으로
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 px-4 py-8 text-slate-800">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <div className="text-4xl">📚</div>
          <h1 className="mt-2 text-3xl font-black text-slate-800">SUN LAB Book</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">원하는 공간을 선택해 주세요.</p>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 rounded-[32px] border border-white/80 bg-white/80 p-3 shadow-sm sm:p-4">
          <div className="flex min-h-[150px] items-center justify-center rounded-3xl border border-sky-100 bg-white p-4 text-center shadow-sm">
            <div>
              <div className="text-4xl">📖</div>
              <div className="mt-3 text-xl font-black text-slate-800">도서관</div>
            </div>
          </div>

          <div className="flex min-h-[150px] items-center justify-center rounded-3xl border border-sky-100 bg-white p-4 text-center shadow-sm">
            <div>
              <div className="text-4xl">🍁</div>
              <div className="mt-3 text-xl font-black text-slate-800">헬로메이플</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/student/history"
            className="rounded-full border border-slate-200 bg-white/60 px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-white"
          >
            메인으로
          </Link>
        </div>
      </div>
    </div>
  );
}
