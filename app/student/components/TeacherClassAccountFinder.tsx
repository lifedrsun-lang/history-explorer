"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";

import { auth } from "@/lib/firebase";
import type { GaebongClassroom } from "../data/classroomData";

type ClassroomAccount = {
  classNumber: number;
  nickname: string;
  accountId: string;
  temporaryPassword: string;
};

type Props = {
  classroom: GaebongClassroom;
};

const SESSION_KEY = "gaebong-g6-c2-class-accounts";
const HIGHLIGHT_MS = 4500;

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseClassAccountsCsv = (text: string): ClassroomAccount[] => {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV 파일에 학생 계정 정보가 없습니다.");
  }

  const headers = parseCsvLine(lines[0]);
  const numberIndex = headers.indexOf("학급 번호");
  const nicknameIndex = headers.indexOf("닉네임");
  const accountIdIndex = headers.indexOf("학급 아이디");
  const passwordIndex = headers.indexOf("임시 비밀번호");

  if ([numberIndex, nicknameIndex, accountIdIndex, passwordIndex].some((index) => index < 0)) {
    throw new Error("CSV 열 이름을 확인해 주세요. 학급 번호·닉네임·학급 아이디·임시 비밀번호가 필요합니다.");
  }

  const accounts = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const classNumber = Number(values[numberIndex]);
    const nickname = String(values[nicknameIndex] || "").trim();
    const accountId = String(values[accountIdIndex] || "").trim();
    const temporaryPassword = String(values[passwordIndex] || "").trim();

    if (
      !Number.isInteger(classNumber) ||
      classNumber < 1 ||
      classNumber > 99 ||
      !nickname ||
      !accountId ||
      !temporaryPassword
    ) {
      throw new Error(`CSV ${classNumber || "?"}번 학생 정보를 확인해 주세요.`);
    }

    return {
      classNumber,
      nickname,
      accountId,
      temporaryPassword,
    };
  });

  const uniqueNumbers = new Set(accounts.map((account) => account.classNumber));

  if (uniqueNumbers.size !== accounts.length) {
    throw new Error("CSV에 같은 학급 번호가 중복되어 있습니다.");
  }

  return accounts.sort((a, b) => a.classNumber - b.classNumber);
};

export default function TeacherClassAccountFinder({ classroom }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<ClassroomAccount[]>([]);
  const [searchNumber, setSearchNumber] = useState("");
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isSupportedClass = classroom.grade === 6 && classroom.classNumber === 2;

  useEffect(() => {
    if (!isSupportedClass) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, [isSupportedClass]);

  useEffect(() => {
    if (!user || !isSupportedClass) {
      setAccounts([]);
      return;
    }

    try {
      const saved = sessionStorage.getItem(SESSION_KEY);

      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        setAccounts(parsed);
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [isSupportedClass, user]);

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

  const handleFile = async (file?: File) => {
    if (!file) {
      return;
    }

    setErrorMessage("");
    setNotice("");

    try {
      const text = await file.text();
      const parsed = parseClassAccountsCsv(text);

      setAccounts(parsed);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
      setNotice(`${parsed.length}명 계정표를 불러왔어요. 이제 번호로 바로 찾을 수 있어요.`);
      setSearchNumber("");
      setVisiblePasswords(new Set());
    } catch (error) {
      setAccounts([]);
      sessionStorage.removeItem(SESSION_KEY);
      setErrorMessage(
        error instanceof Error ? error.message : "CSV 파일을 읽지 못했습니다."
      );
    } finally {
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
      rowRefs.current[classNumber]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
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

  const clearAccounts = () => {
    setAccounts([]);
    setSearchNumber("");
    setHighlightedNumber(null);
    setVisiblePasswords(new Set());
    setNotice("이 탭에서 불러온 계정표를 지웠어요.");
    sessionStorage.removeItem(SESSION_KEY);
  };

  if (!isSupportedClass || !user) {
    return null;
  }

  return (
    <section className="rounded-[28px] border-2 border-rose-100 bg-white/95 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-black text-rose-500">🔐 교사 전용</div>
          <h2 className="mt-1 text-xl font-black text-slate-800">학생 계정 찾기</h2>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            아이가 학급 번호를 말하면 번호만 입력해 바로 찾아주세요.
          </p>
        </div>
        <span className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-600">
          개봉초 6-2
        </span>
      </div>

      {accounts.length === 0 ? (
        <div className="mt-4 rounded-[22px] border border-dashed border-rose-200 bg-rose-50/70 p-4 text-center">
          <div className="text-3xl">📋</div>
          <div className="mt-2 text-sm font-black text-slate-700">6-2 계정표 CSV를 불러와 주세요</div>
          <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
            계정표는 서버에 저장하지 않고 현재 브라우저 탭에서만 사용해요.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 rounded-2xl bg-rose-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-rose-600 active:scale-[0.99]"
          >
            CSV 계정표 불러오기
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
            <span className="text-[11px] font-black text-slate-400">{accounts.length}명 불러옴</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-black text-sky-600"
              >
                CSV 다시 불러오기
              </button>
              <button
                type="button"
                onClick={clearAccounts}
                className="text-[11px] font-black text-slate-400"
              >
                계정표 지우기
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
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

      {accounts.length > 0 && (
        <div className="mt-4 space-y-2">
          {accounts.map((account) => {
            const isHighlighted = highlightedNumber === account.classNumber;
            const isPasswordVisible = visiblePasswords.has(account.classNumber);

            return (
              <div
                key={account.classNumber}
                ref={(element) => {
                  rowRefs.current[account.classNumber] = element;
                }}
                className={`rounded-[22px] border p-3 transition-all duration-300 ${
                  isHighlighted
                    ? "border-red-500 bg-red-50 shadow-[0_0_0_4px_rgba(239,68,68,0.16)]"
                    : "border-slate-100 bg-slate-50/80"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${
                        isHighlighted ? "bg-red-500 text-white" : "bg-white text-slate-700"
                      }`}
                    >
                      {account.classNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-black text-slate-400">닉네임</div>
                      <div className="truncate font-mono text-sm font-black text-slate-800">
                        {account.nickname}
                      </div>
                    </div>
                  </div>
                  {isHighlighted && (
                    <span className="shrink-0 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black text-white">
                      찾았어요!
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-2">
                  <div className="rounded-2xl bg-white px-3 py-2.5">
                    <div className="text-[10px] font-black text-slate-400">학급 아이디</div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="min-w-0 flex-1 break-all text-xs font-black text-slate-700">
                        {account.accountId}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyText("아이디", account.accountId)}
                        className="shrink-0 rounded-xl bg-sky-50 px-2.5 py-1.5 text-[10px] font-black text-sky-700"
                      >
                        복사
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white px-3 py-2.5">
                    <div className="text-[10px] font-black text-slate-400">임시 비밀번호</div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="min-w-0 flex-1 text-sm font-black tracking-[0.18em] text-slate-700">
                        {isPasswordVisible ? account.temporaryPassword : "••••••"}
                      </code>
                      <button
                        type="button"
                        onClick={() => togglePassword(account.classNumber)}
                        className="shrink-0 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[10px] font-black text-amber-700"
                      >
                        {isPasswordVisible ? "가리기" : "보기"}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText("비밀번호", account.temporaryPassword)}
                        className="shrink-0 rounded-xl bg-sky-50 px-2.5 py-1.5 text-[10px] font-black text-sky-700"
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
      )}
    </section>
  );
}
