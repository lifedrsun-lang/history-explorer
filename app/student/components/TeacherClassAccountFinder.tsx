"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";

import { auth } from "@/lib/firebase";
import {
  parseClassroomAccountCsv,
  type ClassroomAccount,
} from "@/lib/classroomAccountRoster";
import {
  GAEBONG_SCHOOL_NAME,
  isGaebongGrade6Class,
} from "@/lib/gaebongClassroom";
import type { GaebongClassroom } from "../data/classroomData";

type Props = {
  classroom: GaebongClassroom;
};

type AccessState = "checking" | "authorized" | "hidden";

const HIGHLIGHT_MS = 4500;
const COLLAPSED_ACCOUNT_COUNT = 5;

const getRosterUrl = (classroom: GaebongClassroom) => {
  const params = new URLSearchParams({
    school: GAEBONG_SCHOOL_NAME,
    grade: String(classroom.grade),
    classNumber: String(classroom.classNumber),
  });

  return `/api/teacher/class-account-roster?${params.toString()}`;
};

const readResponseBody = async (response: Response) => {
  return (await response.json().catch(() => ({}))) as {
    accounts?: ClassroomAccount[];
    error?: string;
  };
};

export default function TeacherClassAccountFinder({ classroom }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [accounts, setAccounts] = useState<ClassroomAccount[]>([]);
  const [searchNumber, setSearchNumber] = useState("");
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isTemporaryRoster, setIsTemporaryRoster] = useState(false);
  const [isRosterExpanded, setIsRosterExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isSupportedClass = isGaebongGrade6Class(
    classroom.grade,
    classroom.classNumber
  );

  useEffect(() => {
    if (!isSupportedClass) {
      return;
    }

    let activeRequest: AbortController | null = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      activeRequest?.abort();
      setUser(currentUser);
      setAccounts([]);
      setIsTemporaryRoster(false);
      setIsRosterExpanded(false);
      setVisiblePasswords(new Set());
      setNotice("");
      setErrorMessage("");

      if (!currentUser) {
        setAccessState("hidden");
        return;
      }

      const controller = new AbortController();
      activeRequest = controller;
      setAccessState("checking");

      void (async () => {
        try {
          const token = await currentUser.getIdToken();
          setAccessState("authorized");
          const response = await fetch(getRosterUrl(classroom), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          });

          if (response.status === 401 || response.status === 403) {
            setAccessState("hidden");
            return;
          }

          const body = await readResponseBody(response);

          if (!response.ok) {
            throw new Error(body.error || "저장된 계정표를 불러오지 못했습니다.");
          }

          const loadedAccounts = Array.isArray(body.accounts) ? body.accounts : [];
          setAccounts(loadedAccounts);
          setIsTemporaryRoster(false);
          setIsRosterExpanded(false);

          if (loadedAccounts.length > 0) {
            setNotice(`${loadedAccounts.length}명 계정표를 자동으로 불러왔어요.`);
          }
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "저장된 계정표를 불러오지 못했습니다."
          );
        }
      })();
    });

    return () => {
      activeRequest?.abort();
      unsubscribe();
    };
  }, [classroom, isSupportedClass]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const accountNumbers = useMemo(
    () => new Set(accounts.map((account) => account.classNumber)),
    [accounts]
  );

  const displayedAccounts = useMemo(() => {
    if (isRosterExpanded || accounts.length <= COLLAPSED_ACCOUNT_COUNT) {
      return accounts;
    }

    const firstAccounts = accounts.slice(0, COLLAPSED_ACCOUNT_COUNT);

    if (!highlightedNumber) {
      return firstAccounts;
    }

    const highlightedAccount = accounts.find(
      (account) => account.classNumber === highlightedNumber
    );

    if (
      !highlightedAccount ||
      firstAccounts.some((account) => account.classNumber === highlightedNumber)
    ) {
      return firstAccounts;
    }

    return [
      ...firstAccounts.slice(0, COLLAPSED_ACCOUNT_COUNT - 1),
      highlightedAccount,
    ];
  }, [accounts, highlightedNumber, isRosterExpanded]);

  const handleFile = async (file?: File) => {
    if (!file || !user) {
      return;
    }

    setUploading(true);
    setErrorMessage("");
    setNotice("");

    try {
      parseClassroomAccountCsv(await file.text());
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.set("school", GAEBONG_SCHOOL_NAME);
      formData.set("grade", String(classroom.grade));
      formData.set("classNumber", String(classroom.classNumber));
      formData.set("file", file);

      const response = await fetch("/api/teacher/class-account-roster", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        setAccessState("hidden");
        setAccounts([]);
        return;
      }

      const body = await readResponseBody(response);

      if (!response.ok) {
        throw new Error(body.error || "계정표를 저장하지 못했습니다.");
      }

      const savedAccounts = Array.isArray(body.accounts) ? body.accounts : [];
      setAccounts(savedAccounts);
      setIsTemporaryRoster(false);
      setIsRosterExpanded(false);
      setSearchNumber("");
      setHighlightedNumber(null);
      setVisiblePasswords(new Set());
      setNotice(`${savedAccounts.length}명 계정표로 교체했어요.`);
    } catch (error) {
      try {
        const localAccounts = parseClassroomAccountCsv(await file.text());
        setAccounts(localAccounts);
        setIsTemporaryRoster(true);
        setIsRosterExpanded(false);
        setSearchNumber("");
        setHighlightedNumber(null);
        setVisiblePasswords(new Set());
        setErrorMessage("서버 저장은 실패했지만 이 화면에서는 바로 사용할 수 있어요.");
        setNotice(`${localAccounts.length}명 계정표를 임시로 불러왔어요.`);
      } catch {
        const message = error instanceof Error ? error.message : "";
        setErrorMessage(
          message === "invalid_account_csv_headers"
            ? "CSV 열 이름을 확인해 주세요. 학급 번호·닉네임·학급 아이디·임시 비밀번호가 필요합니다."
            : "CSV 학생 계정 정보를 확인해 주세요."
        );
      }
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const findAccount = () => {
    const classNumber = Number(searchNumber.trim());

    if (!Number.isInteger(classNumber) || !accountNumbers.has(classNumber)) {
      setErrorMessage("계정표에 있는 학급 번호를 입력해 주세요.");
      return;
    }

    setErrorMessage("");
    setNotice(`${classNumber}번 학생을 찾았어요.`);
    setHighlightedNumber(classNumber);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        rowRefs.current[classNumber]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    });

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = setTimeout(() => {
      setHighlightedNumber(null);
      highlightTimerRef.current = null;
    }, HIGHLIGHT_MS);
  };

  const togglePassword = (classNumber: number) => {
    setVisiblePasswords((current) => {
      const next = new Set(current);

      if (next.has(classNumber)) {
        next.delete(classNumber);
      } else {
        next.add(classNumber);
      }

      return next;
    });
  };

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} 복사 완료`);
    } catch {
      setNotice("복사하지 못했습니다. 값을 길게 눌러 복사해 주세요.");
    }
  };

  if (!isSupportedClass || accessState !== "authorized") {
    return null;
  }

  return (
    <section className="rounded-[28px] border-2 border-rose-100 bg-white/95 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-black text-rose-500">🔐 교사 전용</div>
          <h2 className="mt-1 text-xl font-black text-slate-800">학생 계정 찾기</h2>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            번호를 검색하면 전체 계정표에서 바로 찾아요.
          </p>
        </div>
        <span className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-600">
          개봉초 {classroom.grade}-{classroom.classNumber}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {accounts.length === 0 ? (
        <div className="mt-4 rounded-[22px] border border-dashed border-rose-200 bg-rose-50/70 p-4 text-center">
          <div className="text-3xl">📋</div>
          <div className="mt-2 text-sm font-black text-slate-700">
            저장된 {classroom.grade}-{classroom.classNumber} 계정표가 없습니다
          </div>
          <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
            최초 한 번 등록하면 다음 교사 로그인부터 자동으로 불러와요.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-3 rounded-2xl bg-rose-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-rose-600 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
          >
            {uploading ? "저장 중..." : "계정표 등록"}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2 rounded-[22px] bg-rose-50 p-2">
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
                if (event.key === "Enter") {
                  findAccount();
                }
              }}
              placeholder="학급 번호 입력"
              className="min-w-0 flex-1 rounded-2xl border border-rose-100 bg-white px-4 py-3 text-center text-lg font-black text-slate-800 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
              aria-label="학급 번호 검색"
            />
            <button
              type="button"
              onClick={findAccount}
              className="shrink-0 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-rose-600"
            >
              찾기
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-black text-slate-400">
              {accounts.length}명 자동 불러옴 · 기본 {Math.min(COLLAPSED_ACCOUNT_COUNT, accounts.length)}명 표시
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-[11px] font-black text-sky-600 disabled:cursor-wait disabled:opacity-60"
            >
              {uploading ? "교체 중..." : "계정표 교체"}
            </button>
          </div>
        </>
      )}

      {errorMessage && (
        <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-black text-rose-600">
          {errorMessage}
        </div>
      )}

      {notice && (
        <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-2.5 text-center text-xs font-black text-emerald-700">
          {notice}
        </div>
      )}

      {isTemporaryRoster && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-black leading-5 text-amber-800">
          긴급 임시 모드: 현재 화면에서 검색·복사는 가능하지만 새로고침하면 다시 CSV를 등록해야 해요.
        </div>
      )}

      {accounts.length > 0 && (
        <div className="mt-4">
          <div className="space-y-2">
            {displayedAccounts.map((account) => {
              const isHighlighted = highlightedNumber === account.classNumber;
              const isPasswordVisible = visiblePasswords.has(account.classNumber);

              return (
                <div
                  key={account.classNumber}
                  ref={(element) => {
                    rowRefs.current[account.classNumber] = element;
                  }}
                  className={`rounded-[20px] border p-3 transition-all duration-300 ${
                    isHighlighted
                      ? "border-red-500 bg-red-50 shadow-[0_0_0_4px_rgba(239,68,68,0.16)]"
                      : "border-slate-100 bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-sm font-black text-slate-800">
                      <span className={isHighlighted ? "text-red-600" : "text-slate-700"}>
                        {account.classNumber}번
                      </span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-mono">{account.nickname}</span>
                    </div>
                    {isHighlighted && (
                      <span className="shrink-0 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black text-white">
                        찾았어요!
                      </span>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-1.5">
                    <div className="min-w-0 rounded-2xl bg-white px-2.5 py-2">
                      <div className="text-[9px] font-black text-slate-400">학급 아이디</div>
                      <div className="mt-1 flex min-w-0 items-center gap-1">
                        <code
                          className="min-w-0 flex-1 truncate text-[10px] font-black text-slate-700 sm:text-xs"
                          title={account.accountId}
                        >
                          {account.accountId}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyText("아이디", account.accountId)}
                          className="shrink-0 rounded-lg bg-sky-50 px-2 py-1 text-[9px] font-black text-sky-700"
                        >
                          복사
                        </button>
                      </div>
                    </div>

                    <div className="min-w-0 rounded-2xl bg-white px-2 py-2">
                      <div className="text-[9px] font-black text-slate-400">임시 비밀번호</div>
                      <div className="mt-1 flex min-w-0 items-center gap-0.5">
                        <code className="min-w-0 flex-1 truncate text-[10px] font-black tracking-wide text-slate-700 sm:text-xs">
                          {isPasswordVisible ? account.temporaryPassword : "••••••"}
                        </code>
                        <button
                          type="button"
                          onClick={() => togglePassword(account.classNumber)}
                          className="shrink-0 rounded-lg bg-amber-50 px-1.5 py-1 text-[9px] font-black text-amber-700"
                        >
                          {isPasswordVisible ? "가림" : "보기"}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyText("비밀번호", account.temporaryPassword)}
                          className="shrink-0 rounded-lg bg-sky-50 px-1.5 py-1 text-[9px] font-black text-sky-700"
                        >
                          복사
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {accounts.length > COLLAPSED_ACCOUNT_COUNT && (
            <button
              type="button"
              onClick={() => {
                setIsRosterExpanded((current) => !current);
                setHighlightedNumber(null);
              }}
              className="mt-3 w-full rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-600 transition hover:bg-rose-100"
            >
              {isRosterExpanded
                ? `▲ ${COLLAPSED_ACCOUNT_COUNT}명만 보기`
                : `▼ 전체 ${accounts.length}명 보기`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
