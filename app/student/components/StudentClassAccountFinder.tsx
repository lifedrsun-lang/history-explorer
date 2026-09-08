"use client";

import { useState } from "react";

import {
  WONJONG_SCHOOL_NAME,
  type SchoolClassroom,
} from "../data/classroomData";

type Props = {
  classroom: SchoolClassroom;
};

type StudentAccount = {
  classNumber: number;
  accountId: string;
  nickname?: string;
  temporaryPassword?: string;
  changedPassword?: string;
  passwordChangedAt?: string;
};

type AccountResponse = {
  account?: StudentAccount;
  error?: string;
};

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

export default function StudentClassAccountFinder({ classroom }: Props) {
  const [searchNumber, setSearchNumber] = useState("");
  const [account, setAccount] = useState<StudentAccount | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [accountIdCopied, setAccountIdCopied] = useState(false);
  const [changedPasswordInput, setChangedPasswordInput] = useState("");
  const [changedPasswordConfirm, setChangedPasswordConfirm] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const schoolLabel = classroom.schoolDisplayName || "서울 개봉초";
  const isWonjongSchool = classroom.schoolName === WONJONG_SCHOOL_NAME;
  const isWonjongGrade2 = isWonjongSchool && classroom.grade === 2;
  const passwordChangeEnabled = !isWonjongSchool;

  const resetPasswordForm = () => {
    setChangedPasswordInput("");
    setChangedPasswordConfirm("");
  };

  const findAccount = async () => {
    const studentNumber = Number(searchNumber.trim());

    if (
      !Number.isInteger(studentNumber) ||
      studentNumber < 1 ||
      studentNumber > 25
    ) {
      setAccount(null);
      setAccountIdCopied(false);
      resetPasswordForm();
      setNotice("");
      setErrorMessage("학급 번호는 1번부터 25번까지 입력해 주세요.");
      return;
    }

    setIsSearching(true);
    setErrorMessage("");
    setNotice("");
    setAccountIdCopied(false);
    resetPasswordForm();

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
        setErrorMessage(body.error || "해당 번호의 계정을 찾을 수 없어요.");
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
    setAccountIdCopied(false);
    resetPasswordForm();
    setNotice("");
    setErrorMessage("");
  };

  const copyAccountId = async () => {
    if (!account) return;

    try {
      if (!navigator.clipboard) {
        throw new Error("clipboard_unavailable");
      }

      await navigator.clipboard.writeText(account.accountId);
      setAccountIdCopied(true);
      setErrorMessage("");
      window.setTimeout(() => setAccountIdCopied(false), 1500);
    } catch {
      setErrorMessage("아이디를 복사하지 못했어요. 값을 길게 눌러 복사해 주세요.");
    }
  };

  const saveChangedPassword = async () => {
    if (!account || !passwordChangeEnabled || account.changedPassword) return;

    const changedPassword = changedPasswordInput.trim();
    const changedPasswordCheck = changedPasswordConfirm.trim();

    if (!changedPassword) {
      setErrorMessage("변경 후 비밀번호를 입력해 주세요.");
      setNotice("");
      return;
    }

    if (changedPassword !== changedPasswordCheck) {
      setErrorMessage("비밀번호 두 칸이 서로 달라요. 다시 확인해 주세요.");
      setNotice("");
      return;
    }

    setIsSavingPassword(true);
    setErrorMessage("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/classroom/${encodeURIComponent(classroom.directToken)}/account/password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentNumber: account.classNumber,
            accountId: account.accountId,
            changedPassword,
            changedPasswordConfirm: changedPasswordCheck,
          }),
          cache: "no-store",
        }
      );
      const body = (await response.json().catch(() => ({}))) as AccountResponse;

      if (!response.ok || !body.account) {
        setErrorMessage(body.error || "비밀번호를 저장하지 못했어요.");
        return;
      }

      setAccount(body.account);
      resetPasswordForm();
      setNotice("변경 후 비밀번호를 저장했어요. 다음부터 이 비밀번호를 사용하면 돼요. ✓");
    } catch {
      setErrorMessage("비밀번호를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSavingPassword(false);
    }
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
          {schoolLabel} {classroom.grade}-{classroom.classNumber}
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
            setAccountIdCopied(false);
            resetPasswordForm();
            setNotice("");
            setErrorMessage("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !isSearching) void findAccount();
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

      {notice && (
        <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-black text-emerald-700">
          {notice}
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
            {!isWonjongGrade2 && account.nickname && (
              <div className="rounded-2xl bg-white px-4 py-3">
                <dt className="text-[10px] font-black text-slate-400">닉네임</dt>
                <dd className="mt-1 break-all font-mono text-sm font-black text-slate-800">
                  {account.nickname}
                </dd>
              </div>
            )}
            <div className="rounded-2xl bg-white px-4 py-3">
              <dt className="text-[10px] font-black text-slate-400">학급 아이디</dt>
              <dd className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all font-mono text-sm font-black text-slate-800">
                  {account.accountId}
                </code>
                <button
                  type="button"
                  onClick={() => void copyAccountId()}
                  aria-label="학급 아이디 복사"
                  className="shrink-0 rounded-xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 transition active:scale-95"
                >
                  {accountIdCopied ? "복사됨 ✓" : "📋 복사"}
                </button>
              </dd>
            </div>
            {account.temporaryPassword && (
              passwordChangeEnabled ? (
                <div className="rounded-2xl bg-white px-4 py-3">
                  <dt className="text-[10px] font-black text-slate-400">비밀번호</dt>
                  <dd className="mt-2 space-y-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                      <div className="text-[9px] font-black text-slate-400">변경 전</div>
                      <code className="mt-1 block break-all font-mono text-sm font-black tracking-wide text-slate-700">
                        {account.temporaryPassword}
                      </code>
                    </div>
                    <div className={`rounded-xl px-3 py-2.5 ${account.changedPassword ? "bg-emerald-50" : "bg-amber-50"}`}>
                      <div className={`text-[9px] font-black ${account.changedPassword ? "text-emerald-600" : "text-amber-600"}`}>
                        변경 후{account.changedPassword ? " · 현재 사용" : ""}
                      </div>
                      {account.changedPassword ? (
                        <>
                          <code className="mt-1 block break-all font-mono text-base font-black tracking-wide text-emerald-800">
                            {account.changedPassword}
                          </code>
                          {account.passwordChangedAt && (
                            <div className="mt-1 text-[9px] font-bold text-emerald-600/70">
                              저장 {formatChangedAt(account.passwordChangedAt)}
                            </div>
                          )}
                          <div className="mt-2 rounded-lg bg-white/70 px-2.5 py-2 text-[10px] font-bold leading-4 text-emerald-700">
                            저장 완료 ✓ 학생 화면에서는 다시 덮어쓰지 않아요.
                          </div>
                        </>
                      ) : (
                        <div className="mt-1 text-xs font-black text-amber-700">
                          아직 변경된 비밀번호가 없어요. 변경 전 비밀번호를 사용해 주세요.
                        </div>
                      )}
                    </div>

                    {!account.changedPassword && (
                      <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                        <div className="text-xs font-black text-sky-800">
                          🔐 헬로메이플에서 비밀번호를 바꿨나요?
                        </div>
                        <p className="mt-1 text-[10px] font-bold leading-4 text-sky-700">
                          헬로메이플에서 먼저 변경한 뒤, 새 비밀번호를 아래에 똑같이 2번 입력해 주세요.
                        </p>
                        <div className="mt-2 space-y-2">
                          <input
                            type="text"
                            autoComplete="off"
                            maxLength={256}
                            value={changedPasswordInput}
                            onChange={(event) => {
                              setChangedPasswordInput(event.target.value);
                              setErrorMessage("");
                              setNotice("");
                            }}
                            placeholder="새 비밀번호"
                            aria-label="변경 후 비밀번호"
                            className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-sm font-black text-slate-800 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                          />
                          <input
                            type="text"
                            autoComplete="off"
                            maxLength={256}
                            value={changedPasswordConfirm}
                            onChange={(event) => {
                              setChangedPasswordConfirm(event.target.value);
                              setErrorMessage("");
                              setNotice("");
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !isSavingPassword) {
                                void saveChangedPassword();
                              }
                            }}
                            placeholder="새 비밀번호 한 번 더"
                            aria-label="변경 후 비밀번호 확인"
                            className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-sm font-black text-slate-800 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                          />
                          <button
                            type="button"
                            onClick={() => void saveChangedPassword()}
                            disabled={isSavingPassword}
                            className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-black text-white shadow-sm transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
                          >
                            {isSavingPassword ? "저장 중..." : "변경 후 비밀번호 저장"}
                          </button>
                        </div>
                        <p className="mt-2 text-[9px] font-bold leading-4 text-slate-500">
                          오타 방지를 위해 한 번 저장하면 학생 화면에서는 다시 수정하지 않아요. 잘못 저장한 경우에만 선생님께 알려 주세요.
                        </p>
                      </div>
                    )}
                  </dd>
                </div>
              ) : (
                <div className="rounded-2xl bg-white px-4 py-3">
                  <dt className="text-[10px] font-black text-slate-400">비밀번호</dt>
                  <dd className="mt-1 break-all font-mono text-sm font-black tracking-wide text-slate-800">
                    {account.temporaryPassword}
                  </dd>
                </div>
              )
            )}
          </dl>
        </div>
      )}
    </section>
  );
}
