"use client";

import { useState } from "react";

import type { ClassroomAccount } from "@/lib/classroomAccountRoster";
import type { GaebongClassroom } from "../data/classroomData";

type Props = {
  classroom: GaebongClassroom;
};

type AccountResponse = {
  account?: ClassroomAccount;
  error?: string;
};

export default function StudentClassAccountFinder({ classroom }: Props) {
  const [searchNumber, setSearchNumber] = useState("");
  const [account, setAccount] = useState<ClassroomAccount | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const findAccount = async () => {
    const studentNumber = Number(searchNumber.trim());

    if (
      !Number.isInteger(studentNumber) ||
      studentNumber < 1 ||
      studentNumber > 99
    ) {
      setAccount(null);
      setErrorMessage("학급 번호를 정확히 입력해 주세요.");
      return;
    }

    setIsSearching(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/classroom/${encodeURIComponent(classroom.directToken)}/account`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentNumber }),
          cache: "no-store",
        }
      );
      const body = (await response.json().catch(() => ({}))) as AccountResponse;

      if (!response.ok || !body.account) {
        setAccount(null);
        setErrorMessage(
          body.error || "해당 번호의 계정을 찾을 수 없어요."
        );
        return;
      }

      setAccount(body.account);
    } catch {
      setAccount(null);
      setErrorMessage("계정을 찾지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchNumber("");
    setAccount(null);
    setErrorMessage("");
  };

  return (
    <section className="rounded-[28px] border-2 border-emerald-100 bg-white/95 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-black text-emerald-500">🔎 학생용</div>
          <h2 className="mt-1 text-xl font-black text-slate-800">내 계정 찾기</h2>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            선생님이 알려주신 학급 번호를 입력해 주세요.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">
          개봉초 {classroom.grade}-{classroom.classNumber}
        </span>
      </div>

      <div className="mt-4 flex gap-2 rounded-[22px] bg-emerald-50 p-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={searchNumber}
          onChange={(event) => {
            setSearchNumber(event.target.value.replace(/\D/g, "").slice(0, 2));
            setErrorMessage("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !isSearching) {
              void findAccount();
            }
          }}
          placeholder="예: 17"
          aria-label="학급 번호"
          className="min-w-0 flex-1 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-center text-lg font-black text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
        />
        <button
          type="button"
          onClick={() => void findAccount()}
          disabled={isSearching}
          className="shrink-0 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60"
        >
          {isSearching ? "찾는 중..." : "계정 찾기"}
        </button>
      </div>

      {errorMessage && (
        <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-black text-rose-600">
          {errorMessage}
        </div>
      )}

      {account && (
        <div className="mt-4 rounded-[22px] border-2 border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-black text-emerald-700">
              {account.classNumber}번 친구
            </h3>
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-black text-emerald-700 shadow-sm"
            >
              검색 해제
            </button>
          </div>

          <dl className="mt-3 space-y-2">
            <div className="rounded-2xl bg-white px-4 py-3">
              <dt className="text-[10px] font-black text-slate-400">닉네임</dt>
              <dd className="mt-1 break-all font-mono text-sm font-black text-slate-800">
                {account.nickname}
              </dd>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <dt className="text-[10px] font-black text-slate-400">학급 아이디</dt>
              <dd className="mt-1 break-all font-mono text-sm font-black text-slate-800">
                {account.accountId}
              </dd>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <dt className="text-[10px] font-black text-slate-400">임시 비밀번호</dt>
              <dd className="mt-1 break-all font-mono text-sm font-black tracking-wide text-slate-800">
                {account.temporaryPassword}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
