"use client";

import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";

type FeeType = "afterschool" | "contract";
type FeeContract = {
  id: string;
  type: FeeType;
  schoolName: string;
  title?: string;
  rateA?: number;
  rateB?: number;
  ratePerSession?: number;
  sessionCount?: number;
  monthLabels?: string[];
  participation?: Record<string, boolean[]>;
};

type FeeStudent = {
  id: string;
  name: string;
  school: string;
  grade: string;
  teachingClass: "A반" | "B반" | "";
  enrollmentStatus: "active" | "paused" | "ended";
};

const formatWon = (value: number) =>
  `${Math.round(value).toLocaleString("ko-KR")}원`;
const defaultMonths = ["1차월", "2차월", "3차월"];

const normalizeSchoolName = (value: unknown) =>
  String(value || "")
    .replace(/\s/g, "")
    .replace(/초등학교/g, "초")
    .replace(/초등/g, "초")
    .trim();

const isSameSchool = (left: unknown, right: unknown) => {
  const a = normalizeSchoolName(left);
  const b = normalizeSchoolName(right);

  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
};

export default function TeacherFeesPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [contracts, setContracts] = useState<FeeContract[]>([]);
  const [students, setStudents] = useState<FeeStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [expandedContractId, setExpandedContractId] = useState("");

  const [type, setType] = useState<FeeType>("afterschool");
  const [schoolName, setSchoolName] = useState("");
  const [title, setTitle] = useState("");
  const [rateA, setRateA] = useState("");
  const [rateB, setRateB] = useState("");
  const [ratePerSession, setRatePerSession] = useState("");
  const [sessionCount, setSessionCount] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
  }, []);

  const requestJson = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!user) throw new Error("교사 로그인이 필요합니다.");
      const token = await user.getIdToken();
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "요청 처리에 실패했습니다.");
      }
      return data;
    },
    [user]
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const data = await requestJson("/api/teacher/fees");
      setContracts(Array.isArray(data?.contracts) ? data.contracts : []);
      setStudents(Array.isArray(data?.students) ? data.students : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "수강료 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [requestJson, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const schoolOptions = useMemo(
    () =>
      Array.from(
        new Set(students.map((student) => student.school).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "ko-KR")),
    [students]
  );

  const resetForm = () => {
    setType("afterschool");
    setSchoolName("");
    setTitle("");
    setRateA("");
    setRateB("");
    setRatePerSession("");
    setSessionCount("");
  };

  const createContract = async () => {
    if (!schoolName.trim()) {
      setError("학교 이름을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await requestJson("/api/teacher/fees", {
        method: "POST",
        body: JSON.stringify({
          type,
          schoolName,
          title,
          rateA: Number(rateA || 0),
          rateB: Number(rateB || 0),
          ratePerSession: Number(ratePerSession || 0),
          sessionCount: Number(sessionCount || 0),
          monthLabels: defaultMonths,
        }),
      });
      resetForm();
      setIsRegisterOpen(false);
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "수강료 항목을 저장하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteContract = async (contract: FeeContract) => {
    if (!confirm(`${contract.schoolName} 수강료 항목을 삭제할까요?`)) return;

    try {
      await requestJson(
        `/api/teacher/fees?id=${encodeURIComponent(contract.id)}`,
        { method: "DELETE" }
      );
      setContracts((current) =>
        current.filter((item) => item.id !== contract.id)
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "삭제하지 못했습니다."
      );
    }
  };

  const getMatchingStudents = (contract: FeeContract) =>
    students.filter(
      (student) =>
        isSameSchool(student.school, contract.schoolName) &&
        Boolean(student.teachingClass) &&
        student.enrollmentStatus !== "ended"
    );

  const getChecks = (contract: FeeContract, student: FeeStudent) => {
    const stored = contract.participation?.[student.id];
    if (Array.isArray(stored)) {
      return [Boolean(stored[0]), Boolean(stored[1]), Boolean(stored[2])];
    }

    const defaultValue = student.enrollmentStatus === "active";
    return [defaultValue, defaultValue, defaultValue];
  };

  const toggleParticipation = async (
    contract: FeeContract,
    student: FeeStudent,
    monthIndex: number
  ) => {
    const checks = getChecks(contract, student);
    checks[monthIndex] = !checks[monthIndex];

    const nextParticipation = {
      ...(contract.participation || {}),
      [student.id]: checks,
    };
    const nextContract = { ...contract, participation: nextParticipation };

    setContracts((current) =>
      current.map((item) =>
        item.id === contract.id ? nextContract : item
      )
    );

    try {
      await requestJson("/api/teacher/fees", {
        method: "PATCH",
        body: JSON.stringify({
          id: contract.id,
          participation: nextParticipation,
        }),
      });
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "참여월을 저장하지 못했습니다."
      );
      await loadData();
    }
  };

  const getMonthTotal = (contract: FeeContract, monthIndex: number) =>
    getMatchingStudents(contract).reduce((sum, student) => {
      if (!getChecks(contract, student)[monthIndex]) return sum;
      const rate =
        student.teachingClass === "A반"
          ? Number(contract.rateA || 0)
          : Number(contract.rateB || 0);
      return sum + rate;
    }, 0);

  const getContractTotal = (contract: FeeContract) => {
    if (contract.type === "contract") {
      return (
        Number(contract.ratePerSession || 0) *
        Number(contract.sessionCount || 0)
      );
    }

    return [0, 1, 2].reduce(
      (sum, monthIndex) => sum + getMonthTotal(contract, monthIndex),
      0
    );
  };

  const totalFee = contracts.reduce(
    (sum, contract) => sum + getContractTotal(contract),
    0
  );

  const afterschoolContracts = contracts.filter(
    (contract) => contract.type === "afterschool"
  );
  const contractLectures = contracts.filter(
    (contract) => contract.type === "contract"
  );

  const afterschoolMonthTotals = [0, 1, 2].map((monthIndex) =>
    afterschoolContracts.reduce(
      (sum, contract) => sum + getMonthTotal(contract, monthIndex),
      0
    )
  );

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] p-6 text-center font-bold text-slate-500">
        교사 로그인 확인 중...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] p-6 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
          <div className="font-black text-slate-800">
            교사 로그인이 필요합니다.
          </div>
          <Link
            href="/teacher"
            className="mt-4 inline-block rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white"
          >
            교사홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-black text-slate-900">💰 수강료</div>
              <div className="mt-1 text-sm font-bold text-slate-500">
                등록된 수강료와 계산 결과를 먼저 확인합니다.
              </div>
            </div>
            <Link
              href="/teacher"
              className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700"
            >
              ← 교사홈
            </Link>
          </div>
        </div>

        <section className="mt-3 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black text-emerald-700">
                전체 예상 수강료
              </div>
              <div className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {formatWon(totalFee)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setError("");
                setIsRegisterOpen(true);
              }}
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm"
            >
              + 수강료 등록
            </button>
          </div>

          {afterschoolContracts.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {defaultMonths.map((label, index) => (
                <div
                  key={label}
                  className="rounded-2xl bg-emerald-50 px-2 py-3 text-center"
                >
                  <div className="text-[11px] font-black text-emerald-700">
                    {label}
                  </div>
                  <div className="mt-1 text-sm font-black text-emerald-900 sm:text-base">
                    {formatWon(afterschoolMonthTotals[index])}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !isRegisterOpen && (
            <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}
        </section>

        <section className="mt-3 space-y-3">
          {loading && contracts.length === 0 ? (
            <div className="rounded-[28px] bg-white p-6 text-center text-sm font-bold text-slate-500">
              수강료 정보를 불러오는 중...
            </div>
          ) : contracts.length === 0 ? (
            <div className="rounded-[28px] bg-white p-6 text-center text-sm font-bold text-slate-500">
              아직 등록된 수강료가 없습니다.
            </div>
          ) : (
            <>
              {afterschoolContracts.map((contract) => {
                const matchingStudents = getMatchingStudents(contract);
                const months =
                  Array.isArray(contract.monthLabels) &&
                  contract.monthLabels.length === 3
                    ? contract.monthLabels
                    : defaultMonths;
                const monthTotals = [0, 1, 2].map((index) =>
                  getMonthTotal(contract, index)
                );
                const quarterTotal = monthTotals.reduce(
                  (sum, value) => sum + value,
                  0
                );
                const isExpanded = expandedContractId === contract.id;

                return (
                  <div
                    key={contract.id}
                    className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-emerald-600">
                          방과후
                        </div>
                        <div className="mt-1 text-xl font-black text-slate-900">
                          {contract.schoolName}
                        </div>
                        {contract.title && (
                          <div className="text-sm font-bold text-slate-500">
                            {contract.title}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteContract(contract)}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="mt-4 rounded-3xl bg-emerald-50 p-4">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <div className="text-xs font-black text-emerald-700">
                            3개월 예상 수강료
                          </div>
                          <div className="mt-1 text-3xl font-black text-emerald-900">
                            {formatWon(quarterTotal)}
                          </div>
                        </div>
                        <div className="text-right text-[11px] font-bold leading-relaxed text-slate-500">
                          <div>A반 1인 {formatWon(Number(contract.rateA || 0))}</div>
                          <div>B반 1인 {formatWon(Number(contract.rateB || 0))}</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {months.map((month, index) => (
                          <div
                            key={`${contract.id}-${month}`}
                            className="rounded-2xl bg-white px-2 py-3 text-center"
                          >
                            <div className="text-[11px] font-black text-slate-500">
                              {month}
                            </div>
                            <div className="mt-1 text-sm font-black text-slate-900">
                              {formatWon(monthTotals[index])}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedContractId(isExpanded ? "" : contract.id)
                      }
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
                    >
                      👥 학생목록 {matchingStudents.length}명 {isExpanded ? "접기 ↑" : "보기 ↓"}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="grid grid-cols-[1fr_48px_48px_48px] bg-slate-50 px-3 py-2 text-center text-[11px] font-black text-slate-500">
                          <div className="text-left">학생</div>
                          <div>1</div>
                          <div>2</div>
                          <div>3</div>
                        </div>
                        {matchingStudents.length === 0 ? (
                          <div className="px-3 py-5 text-center text-sm font-bold text-slate-400">
                            연결된 학생이 없습니다.
                          </div>
                        ) : (
                          matchingStudents.map((student) => {
                            const checks = getChecks(contract, student);
                            return (
                              <div
                                key={student.id}
                                className="grid grid-cols-[1fr_48px_48px_48px] items-center border-t border-slate-100 px-3 py-3 text-center"
                              >
                                <div className="text-left">
                                  <div className="text-sm font-black text-slate-800">
                                    {student.name}
                                  </div>
                                  <div className="text-[11px] font-bold text-slate-400">
                                    {student.teachingClass}
                                    {student.enrollmentStatus === "paused"
                                      ? " · 쉬는중"
                                      : ""}
                                  </div>
                                </div>
                                {[0, 1, 2].map((monthIndex) => (
                                  <label
                                    key={monthIndex}
                                    className="flex justify-center"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checks[monthIndex]}
                                      onChange={() =>
                                        toggleParticipation(
                                          contract,
                                          student,
                                          monthIndex
                                        )
                                      }
                                      className="h-5 w-5 accent-emerald-600"
                                    />
                                  </label>
                                ))}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {contractLectures.map((contract) => {
                const total = getContractTotal(contract);
                return (
                  <div
                    key={contract.id}
                    className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-blue-600">
                          계약강의
                        </div>
                        <div className="mt-1 text-xl font-black text-slate-900">
                          {contract.schoolName}
                        </div>
                        {contract.title && (
                          <div className="text-sm font-bold text-slate-500">
                            {contract.title}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteContract(contract)}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="mt-4 rounded-3xl bg-blue-50 p-4 text-center">
                      <div className="text-xs font-black text-blue-700">
                        {Number(contract.sessionCount || 0)}차시 × {formatWon(Number(contract.ratePerSession || 0))}
                      </div>
                      <div className="mt-1 text-3xl font-black text-blue-800">
                        {formatWon(total)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </section>
      </div>

      {isRegisterOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/45 p-3 sm:items-center">
          <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-black text-slate-900">
                  새 수강료 등록
                </div>
                <div className="mt-1 text-xs font-bold text-slate-500">
                  방과후 또는 계약강의를 추가합니다.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterOpen(false);
                  setError("");
                  resetForm();
                }}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("afterschool")}
                className={`rounded-2xl px-4 py-3 text-sm font-black ${
                  type === "afterschool"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                타입1 · 방과후
              </button>
              <button
                type="button"
                onClick={() => setType("contract")}
                className={`rounded-2xl px-4 py-3 text-sm font-black ${
                  type === "contract"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                타입2 · 계약강의
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-black text-slate-600">
                학교 이름
                <input
                  list="teacher-fee-schools"
                  value={schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                  placeholder="예: 하늘빛초"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none"
                />
                <datalist id="teacher-fee-schools">
                  {schoolOptions.map((school) => (
                    <option key={school} value={school} />
                  ))}
                </datalist>
              </label>
              <label className="text-xs font-black text-slate-600">
                메모/강의명
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={
                    type === "afterschool"
                      ? "예: 4분기 역사탐험"
                      : "예: 헬로메이플"
                  }
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none"
                />
              </label>
            </div>

            {type === "afterschool" ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-xs font-black text-slate-600">
                  A반 1인 단가
                  <input
                    inputMode="numeric"
                    value={rateA}
                    onChange={(event) =>
                      setRateA(event.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="18000"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none"
                  />
                </label>
                <label className="text-xs font-black text-slate-600">
                  B반 1인 단가
                  <input
                    inputMode="numeric"
                    value={rateB}
                    onChange={(event) =>
                      setRateB(event.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="22000"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none"
                  />
                </label>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-xs font-black text-slate-600">
                  차시당 단가
                  <input
                    inputMode="numeric"
                    value={ratePerSession}
                    onChange={(event) =>
                      setRatePerSession(
                        event.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                    placeholder="40000"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none"
                  />
                </label>
                <label className="text-xs font-black text-slate-600">
                  수업 차시
                  <input
                    inputMode="numeric"
                    value={sessionCount}
                    onChange={(event) =>
                      setSessionCount(
                        event.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                    placeholder="22"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none"
                  />
                </label>
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={createContract}
              disabled={saving}
              className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {saving ? "저장 중..." : "+ 수강료 등록"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
