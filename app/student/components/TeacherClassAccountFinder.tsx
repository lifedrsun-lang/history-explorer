"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";

import { auth } from "@/lib/firebase";
import { parseClassroomAccountCsv, type ClassroomAccount } from "@/lib/classroomAccountRoster";
import {
  getSupportedClassroomSchoolName,
  WONJONG_SCHOOL_NAME,
} from "@/lib/gaebongClassroom";
import type { SchoolClassroom } from "../data/classroomData";
import StudentClassAccountFinder from "./StudentClassAccountFinder";

type Props = { classroom: SchoolClassroom };
type AccessState = "checking" | "authorized" | "hidden";
type ApiResponse = {
  accounts?: ClassroomAccount[];
  account?: ClassroomAccount;
  error?: string;
};

const COLLAPSED_ACCOUNT_COUNT = 3;

const getRosterUrl = (classroom: SchoolClassroom, school: string) => {
  const params = new URLSearchParams({
    school,
    grade: String(classroom.grade),
    classNumber: String(classroom.classNumber),
  });
  return `/api/teacher/class-account-roster?${params.toString()}`;
};

const readResponseBody = async (response: Response) =>
  (await response.json().catch(() => ({}))) as ApiResponse;

const formatChangedAt = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  const [editingPasswordNumber, setEditingPasswordNumber] = useState<number | null>(null);
  const [changedPasswordInput, setChangedPasswordInput] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const school = getSupportedClassroomSchoolName(classroom);
  const schoolLabel = classroom.schoolDisplayName || "서울 개봉초";
  const isWonjongGrade2 = school === WONJONG_SCHOOL_NAME && classroom.grade === 2;
  const passwordChangeEnabled = Boolean(school && school !== WONJONG_SCHOOL_NAME);

  useEffect(() => {
    if (!school) return;
    let activeRequest: AbortController | null = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      activeRequest?.abort();
      setUser(currentUser);
      setAccounts([]);
      setSearchNumber("");
      setHighlightedNumber(null);
      setIsTemporaryRoster(false);
      setIsRosterExpanded(false);
      setVisiblePasswords(new Set());
      setEditingPasswordNumber(null);
      setChangedPasswordInput("");
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
          const response = await fetch(getRosterUrl(classroom, school), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          });
          if (response.status === 401 || response.status === 403) {
            setAccessState("hidden");
            return;
          }
          const body = await readResponseBody(response);
          if (!response.ok) throw new Error(body.error || "저장된 계정표를 불러오지 못했습니다.");
          const loadedAccounts = Array.isArray(body.accounts) ? body.accounts : [];
          setAccounts(loadedAccounts);
          if (loadedAccounts.length > 0) setNotice(`${loadedAccounts.length}명 계정표를 자동으로 불러왔어요.`);
        } catch (error) {
          if (!controller.signal.aborted) setErrorMessage(error instanceof Error ? error.message : "저장된 계정표를 불러오지 못했습니다.");
        }
      })();
    });

    return () => {
      activeRequest?.abort();
      unsubscribe();
    };
  }, [classroom, school]);

  const displayedAccounts = useMemo(() => {
    if (highlightedNumber !== null) return accounts.filter((account) => account.classNumber === highlightedNumber);
    if (isRosterExpanded || accounts.length <= COLLAPSED_ACCOUNT_COUNT) return accounts;
    return accounts.slice(0, COLLAPSED_ACCOUNT_COUNT);
  }, [accounts, highlightedNumber, isRosterExpanded]);

  const handleFile = async (file?: File) => {
    if (!file || !user || !school) return;
    setUploading(true);
    setErrorMessage("");
    setNotice("");
    try {
      const parsed = parseClassroomAccountCsv(await file.text());
      if (parsed.some((account) => account.classNumber < 1 || account.classNumber > 25)) {
        throw new Error("student_number_out_of_range");
      }
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.set("school", school);
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
      if (!response.ok) throw new Error(body.error || "계정표를 저장하지 못했습니다.");
      const savedAccounts = Array.isArray(body.accounts) ? body.accounts : [];
      setAccounts(savedAccounts);
      setIsTemporaryRoster(false);
      setIsRosterExpanded(false);
      setSearchNumber("");
      setHighlightedNumber(null);
      setVisiblePasswords(new Set());
      setEditingPasswordNumber(null);
      setChangedPasswordInput("");
      setNotice(`${savedAccounts.length}명 계정표로 교체했어요.`);
    } catch (error) {
      if (error instanceof Error && error.message === "student_number_out_of_range") {
        setErrorMessage("학급 번호는 1번부터 25번까지만 등록해 주세요.");
      } else {
        try {
          const localAccounts = parseClassroomAccountCsv(await file.text());
          setAccounts(localAccounts.filter((account) => account.classNumber >= 1 && account.classNumber <= 25));
          setIsTemporaryRoster(true);
          setErrorMessage("서버 저장은 실패했지만 이 화면에서는 바로 사용할 수 있어요.");
          setNotice("계정표를 임시로 불러왔어요.");
        } catch {
          setErrorMessage("CSV 학생 계정 정보를 확인해 주세요.");
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const findAccount = () => {
    const number = Number(searchNumber.trim());
    if (!Number.isInteger(number) || number < 1 || number > 25) {
      setErrorMessage("학급 번호는 1번부터 25번까지 입력해 주세요.");
      return;
    }
    if (!accounts.some((account) => account.classNumber === number)) {
      setErrorMessage("계정표에 있는 학급 번호를 입력해 주세요.");
      return;
    }
    setErrorMessage("");
    setNotice(`${number}번 학생을 찾았어요.`);
    setHighlightedNumber(number);
    setEditingPasswordNumber(null);
    setChangedPasswordInput("");
  };

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} 복사 완료`);
    } catch {
      setNotice("복사하지 못했습니다. 값을 길게 눌러 복사해 주세요.");
    }
  };

  const startPasswordEdit = (account: ClassroomAccount) => {
    setEditingPasswordNumber(account.classNumber);
    setChangedPasswordInput(account.changedPassword || "");
    setErrorMessage("");
    setNotice("");
  };

  const saveChangedPassword = async (account: ClassroomAccount) => {
    if (!user || !school || !passwordChangeEnabled || isTemporaryRoster) return;

    const changedPassword = changedPasswordInput.trim();
    if (!changedPassword) {
      setErrorMessage("변경 후 비밀번호를 입력해 주세요.");
      return;
    }

    setSavingPassword(true);
    setErrorMessage("");
    setNotice("");

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/teacher/class-account-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          school,
          grade: classroom.grade,
          classNumber: classroom.classNumber,
          studentNumber: account.classNumber,
          changedPassword,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        setAccessState("hidden");
        return;
      }

      const body = await readResponseBody(response);
      if (!response.ok || !body.account) {
        throw new Error(body.error || "변경 후 비밀번호를 저장하지 못했습니다.");
      }

      const savedAccount = body.account;
      setAccounts((current) =>
        current.map((item) =>
          item.classNumber === savedAccount.classNumber ? savedAccount : item
        )
      );
      setEditingPasswordNumber(null);
      setChangedPasswordInput("");
      setNotice(`${account.classNumber}번 변경 후 비밀번호를 저장했어요.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "변경 후 비밀번호를 저장하지 못했습니다.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (!school || accessState === "checking") return null;
  if (accessState === "hidden") return <StudentClassAccountFinder classroom={classroom} />;

  return (
    <section className="rounded-[28px] border-2 border-rose-100 bg-white/95 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-black text-rose-500">🔐 교사 전용</div>
          <h2 className="mt-1 text-xl font-black text-slate-800">학생 계정 찾기</h2>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">1번부터 25번까지 계정표를 반별로 등록하고 검색할 수 있어요.</p>
        </div>
        <span className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-600">{schoolLabel} {classroom.grade}-{classroom.classNumber}</span>
      </div>

      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />

      {accounts.length === 0 ? (
        <div className="mt-4 rounded-[22px] border border-dashed border-rose-200 bg-rose-50/70 p-4 text-center">
          <div className="text-3xl">📋</div>
          <div className="mt-2 text-sm font-black text-slate-700">저장된 {classroom.grade}-{classroom.classNumber} 계정표가 없습니다</div>
          <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">1~25번 계정 CSV를 최초 한 번 등록하면 다음 교사 로그인부터 자동으로 불러와요.</p>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-3 rounded-2xl bg-rose-500 px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60">{uploading ? "저장 중..." : "계정표 등록"}</button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2 rounded-[22px] bg-rose-50 p-2">
            <input type="text" inputMode="numeric" value={searchNumber} onChange={(event) => { setSearchNumber(event.target.value.replace(/\D/g, "").slice(0, 2)); setErrorMessage(""); }} onKeyDown={(event) => { if (event.key === "Enter") findAccount(); }} placeholder="1~25번" className="min-w-0 flex-1 rounded-2xl border border-rose-100 bg-white px-4 py-3 text-center text-lg font-black text-slate-800 outline-none" />
            <button type="button" onClick={findAccount} className="shrink-0 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-black text-white">찾기</button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-black text-slate-400">{highlightedNumber !== null ? `${highlightedNumber}번 검색 결과만 표시 중` : `${accounts.length}명 자동 불러옴`}</span>
            <div className="flex gap-3">
              {highlightedNumber !== null && <button type="button" onClick={() => { setSearchNumber(""); setHighlightedNumber(null); setEditingPasswordNumber(null); setChangedPasswordInput(""); setNotice(""); }} className="text-[11px] font-black text-rose-600">검색 해제</button>}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-[11px] font-black text-sky-600">계정표 교체</button>
            </div>
          </div>
        </>
      )}

      {errorMessage && <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-black text-rose-600">{errorMessage}</div>}
      {notice && <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-2.5 text-center text-xs font-black text-emerald-700">{notice}</div>}
      {isTemporaryRoster && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-black text-amber-800">임시 모드: 새로고침하면 다시 CSV를 등록해야 해요.</div>}

      {accounts.length > 0 && (
        <div className="mt-4 space-y-2">
          {displayedAccounts.map((account) => {
            const passwordVisible = visiblePasswords.has(account.classNumber);
            const isEditingPassword = editingPasswordNumber === account.classNumber;
            return (
              <div key={account.classNumber} className={`rounded-[20px] border p-3 ${highlightedNumber === account.classNumber ? "border-red-500 bg-red-50" : "border-slate-100 bg-slate-50/80"}`}>
                <div className="text-sm font-black text-slate-800">{account.classNumber}번 · <span className="font-mono">{account.nickname}</span></div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white p-2"><div className="text-[9px] font-black text-slate-400">학급 아이디</div><div className="mt-1 flex gap-1"><code className="min-w-0 flex-1 truncate text-[10px] font-black">{account.accountId}</code><button type="button" onClick={() => void copyText("아이디", account.accountId)} className="text-[9px] font-black text-sky-700">복사</button></div></div>
                  {(passwordChangeEnabled || isWonjongGrade2) ? (
                    <div className="rounded-2xl bg-white p-2">
                      <div className="flex items-center justify-between gap-1">
                        <div className="text-[9px] font-black text-slate-400">비밀번호</div>
                        <button type="button" onClick={() => setVisiblePasswords((current) => { const next = new Set(current); next.has(account.classNumber) ? next.delete(account.classNumber) : next.add(account.classNumber); return next; })} className="text-[9px] font-black text-amber-700">{passwordVisible ? "가림" : "보기"}</button>
                      </div>
                      <div className="mt-1 space-y-1.5">
                        <div className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5">
                          <span className="shrink-0 text-[8px] font-black text-slate-400">변경 전</span>
                          <code className="min-w-0 flex-1 truncate text-[10px] font-black">{account.temporaryPassword ? (passwordVisible ? account.temporaryPassword : "••••••") : "원본 미등록"}</code>
                          {account.temporaryPassword && <button type="button" onClick={() => void copyText("변경 전 비밀번호", account.temporaryPassword)} className="text-[8px] font-black text-sky-700">복사</button>}
                        </div>
                        <div className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${account.changedPassword ? "bg-emerald-50" : "bg-slate-50"}`}>
                          <span className={`shrink-0 text-[8px] font-black ${account.changedPassword ? "text-emerald-600" : "text-slate-400"}`}>변경 후{account.changedPassword ? " · 현재" : ""}</span>
                          <code className={`min-w-0 flex-1 truncate text-[10px] font-black ${account.changedPassword ? "text-emerald-800" : "text-slate-400"}`}>{account.changedPassword ? (passwordVisible ? account.changedPassword : "••••••") : "미등록"}</code>
                          {account.changedPassword && <button type="button" onClick={() => void copyText("변경 후 비밀번호", account.changedPassword || "")} className="text-[8px] font-black text-sky-700">복사</button>}
                        </div>
                      </div>
                      {account.passwordChangedAt && <div className="mt-1 text-[8px] font-bold text-slate-400">저장 {formatChangedAt(account.passwordChangedAt)}</div>}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white p-2"><div className="text-[9px] font-black text-slate-400">비밀번호</div><div className="mt-1 flex gap-1"><code className="min-w-0 flex-1 truncate text-[10px] font-black">{passwordVisible ? account.temporaryPassword : "••••••"}</code><button type="button" onClick={() => setVisiblePasswords((current) => { const next = new Set(current); next.has(account.classNumber) ? next.delete(account.classNumber) : next.add(account.classNumber); return next; })} className="text-[9px] font-black text-amber-700">{passwordVisible ? "가림" : "보기"}</button><button type="button" onClick={() => void copyText("비밀번호", account.temporaryPassword)} className="text-[9px] font-black text-sky-700">복사</button></div></div>
                  )}
                </div>

                {passwordChangeEnabled && !isTemporaryRoster && (
                  <div className="mt-2">
                    {isEditingPassword ? (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-2">
                        <div className="text-[9px] font-black text-emerald-700">변경 후 비밀번호 입력</div>
                        <div className="mt-1.5 flex gap-1.5">
                          <input type="text" autoComplete="off" maxLength={256} value={changedPasswordInput} onChange={(event) => { setChangedPasswordInput(event.target.value); setErrorMessage(""); }} onKeyDown={(event) => { if (event.key === "Enter" && !savingPassword) void saveChangedPassword(account); }} placeholder="헬로메이플에서 바꾼 비밀번호" className="min-w-0 flex-1 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs font-black text-slate-800 outline-none" />
                          <button type="button" onClick={() => void saveChangedPassword(account)} disabled={savingPassword} className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-[10px] font-black text-white disabled:opacity-60">{savingPassword ? "저장 중" : "저장"}</button>
                          <button type="button" onClick={() => { setEditingPasswordNumber(null); setChangedPasswordInput(""); setErrorMessage(""); }} disabled={savingPassword} className="shrink-0 rounded-xl bg-white px-2.5 py-2 text-[10px] font-black text-slate-500">취소</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => startPasswordEdit(account)} className="w-full rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700">{account.changedPassword ? "변경 후 비밀번호 수정" : "변경 후 비밀번호 저장"}</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {highlightedNumber === null && accounts.length > COLLAPSED_ACCOUNT_COUNT && <button type="button" onClick={() => setIsRosterExpanded((current) => !current)} className="w-full rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-600">{isRosterExpanded ? `▲ ${COLLAPSED_ACCOUNT_COUNT}명만 보기` : `▼ 전체 ${accounts.length}명 보기`}</button>}
        </div>
      )}
    </section>
  );
}
