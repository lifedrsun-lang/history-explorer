"use client";

import { useState } from "react";

import GaebongClassPortal from "../components/GaebongClassPortal";
import { GAEBONG_SCHOOL_CODE } from "../data/classroomData";

export default function GaebongClassroomEntryPage() {
  const [schoolCode, setSchoolCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const verifySchoolCode = () => {
    if (
      schoolCode.trim().toUpperCase() ===
      GAEBONG_SCHOOL_CODE.toUpperCase()
    ) {
      setIsVerified(true);
      setErrorMessage("");
      return;
    }

    setErrorMessage("학교코드를 다시 확인해 주세요.");
  };

  if (isVerified) {
    return (
      <GaebongClassPortal
        onChangeSchool={() => {
          window.location.href = "/student/history";
        }}
      />
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 px-4 text-slate-800">
      <div className="w-full max-w-md rounded-[32px] border border-white/80 bg-white/95 p-7 shadow-xl">
        <div className="text-center">
          <div className="text-4xl">🏫</div>
          <h1 className="mt-3 text-2xl font-black text-slate-800">
            서울 개봉초 반 수업방
          </h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
            SUN LAB에서 들어올 때만 학교코드를 입력해요.<br />
            수업시간 QR은 코드 없이 바로 반으로 연결됩니다.
          </p>
        </div>

        <label className="mt-6 block text-sm font-black text-slate-700">
          학교코드
          <input
            type="text"
            value={schoolCode}
            onChange={(event) => {
              setSchoolCode(event.target.value);
              setErrorMessage("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                verifySchoolCode();
              }
            }}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="학교코드 입력"
            className="mt-2 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-xl font-black uppercase tracking-[0.2em] text-slate-800 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />
        </label>

        <button
          type="button"
          onClick={verifySchoolCode}
          className="mt-4 w-full rounded-2xl bg-sky-500 py-4 text-lg font-black text-white shadow-sm transition hover:bg-sky-600"
        >
          반 선택하기
        </button>

        {errorMessage && (
          <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-black text-rose-600">
            {errorMessage}
          </div>
        )}

        <a
          href="/student/history"
          className="mt-3 block w-full rounded-2xl border border-slate-200 bg-white py-3 text-center text-sm font-black text-slate-500"
        >
          학교 목록으로
        </a>
      </div>
    </div>
  );
}
