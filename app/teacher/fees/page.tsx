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

const formatWon = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const normalize = (value: unknown) => String(value || "").trim();
const defaultMonths = ["1차월", "2차월", "3차월"];

export default function TeacherFeesPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [contracts, setContracts] = useState<FeeContract[]>([]);
  const [students, setStudents] = useState<FeeStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
      if (!response.ok) throw new Error(data?.error || "요청 처리에 실패했습니다.");
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
      setError(loadError instanceof Error ? loadError.message : "수강료 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [requestJson, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const schoolOptions = useMemo(
    () => Array.from(new Set(students.map((student) => student.school).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko-KR")),
    [students]
  );

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
      setSchoolName("");
      setTitle("");
      setRateA("");
      setRateB("");
      setRatePerSession("");
      setSessionCount("");
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "수강료 항목을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const deleteContract = async (contract: FeeContract) => {
    if (!confirm(`${contract.schoolName} 수강료 항목을 삭제할까요?`)) return;
    try {
      await requestJson(`/api/teacher/fees?id=${encodeURIComponent(contract.id)}`, { method: "DELETE" });
      setContracts((current) => current.filter((item) => item.id !== contract.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "삭제하지 못했습니다.");
    }
  };

  const getMatchingStudents = (contract: FeeContract) =>
    students.filter(
      (student) => normalize(student.school) === normalize(contract.schoolName) && Boolean(student.teachingClass)
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
      current.map((item) => (item.id === contract.id ? nextContract : item))
    );
    try {
      await requestJson("/api/teacher/fees", {
        method: "PATCH",
        body: JSON.stringify({ id: contract.id, participation: nextParticipation }),
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "참여월을 저장하지 못했습니다.");
      await loadData();
    }
  };

  const getMonthTotal = (contract: FeeContract, monthIndex: number) => {
    return getMatchingStudents(contract).reduce((sum, student) => {
      const checked = getChecks(contract, student)[monthIndex];
      if (!checked) return sum;
      const rate = student.teachingClass === "A반" ? Number(contract.rateA || 0) : Number(contract.rateB || 0);
      return sum + rate;
    }, 0);
  };

  if (authChecking) {
    return <div className="min-h-screen bg-[#f5f7fb] p-6 text-center font-bold text-slate-500">교사 로그인 확인 중...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] p-6 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
          <div className="font-black text-slate-800">교사 로그인이 필요합니다.</div>
          <Link href="/teacher" className="mt-4 inline-block rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white">교사홈으로</Link>
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
              <div className="mt-1 text-sm font-bold text-slate-500">방과후 학생별 참여월과 계약강의 차시를 기준으로 계산합니다.</div>
            </div>
            <Link href="/teacher" className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">← 교사홈</Link>
          </div>
        </div>

        <section className="mt-3 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="text-lg font-black text-slate-900">새 수강료 등록</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setType("afterschool")} className={`rounded-2xl px-4 py-3 text-sm font-black ${type === "afterschool" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>타입1 · 방과후</button>
            <button type="button" onClick={() => setType("contract")} className={`rounded-2xl px-4 py-3 text-sm font-black ${type === "contract" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>타입2 · 계약강의</button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-black text-slate-600">학교 이름
              <input list="teacher-fee-schools" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} placeholder="예: 하늘빛초" className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none" />
              <datalist id="teacher-fee-schools">{schoolOptions.map((school) => <option key={school} value={school} />)}</datalist>
            </label>
            <label className="text-xs font-black text-slate-600">메모/강의명
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={type === "afterschool" ? "예: 4분기 역사탐험" : "예: 헬로메이플"} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none" />
            </label>
          </div>

          {type === "afterschool" ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs font-black text-slate-600">A반 1인 단가
                <input inputMode="numeric" value={rateA} onChange={(event) => setRateA(event.target.value.replace(/[^0-9]/g, ""))} placeholder="18000" className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none" />
              </label>
              <label className="text-xs font-black text-slate-600">B반 1인 단가
                <input inputMode="numeric" value={rateB} onChange={(event) => setRateB(event.target.value.replace(/[^0-9]/g, ""))} placeholder="22000" className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none" />
              </label>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs font-black text-slate-600">차시당 단가
                <input inputMode="numeric" value={ratePerSession} onChange={(event) => setRatePerSession(event.target.value.replace(/[^0-9]/g, ""))} placeholder="40000" className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none" />
              </label>
              <label className="text-xs font-black text-slate-600">수업 차시
                <input inputMode="numeric" value={sessionCount} onChange={(event) => setSessionCount(event.target.value.replace(/[^0-9]/g, ""))} placeholder="22" className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none" />
              </label>
            </div>
          )}

          <button type="button" onClick={createContract} disabled={saving} className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "저장 중..." : "+ 수강료 등록"}</button>
          {error && <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        </section>

        <section className="mt-3 space-y-3">
          {loading && contracts.length === 0 ? (
            <div className="rounded-[28px] bg-white p-6 text-center text-sm font-bold text-slate-500">수강료 정보를 불러오는 중...</div>
          ) : contracts.length === 0 ? (
            <div className="rounded-[28px] bg-white p-6 text-center text-sm font-bold text-slate-500">아직 등록된 수강료가 없습니다.</div>
          ) : (
            contracts.map((contract) => {
              if (contract.type === "contract") {
                const total = Number(contract.ratePerSession || 0) * Number(contract.sessionCount || 0);
                return (
                  <div key={contract.id} className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="text-xs font-black text-blue-600">계약강의</div><div className="mt-1 text-xl font-black text-slate-900">{contract.schoolName}</div>{contract.title && <div className="text-sm font-bold text-slate-500">{contract.title}</div>}</div>
                      <button type="button" onClick={() => deleteContract(contract)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">삭제</button>
                    </div>
                    <div className="mt-4 rounded-3xl bg-blue-50 p-4 text-center">
                      <div className="text-xs font-black text-blue-700">{Number(contract.sessionCount || 0)}차시 × {formatWon(Number(contract.ratePerSession || 0))}</div>
                      <div className="mt-1 text-3xl font-black text-blue-800">{formatWon(total)}</div>
                    </div>
                  </div>
                );
              }

              const matchingStudents = getMatchingStudents(contract);
              const months = Array.isArray(contract.monthLabels) && contract.monthLabels.length === 3 ? contract.monthLabels : defaultMonths;
              const monthTotals = [0, 1, 2].map((index) => getMonthTotal(contract, index));
              const quarterTotal = monthTotals.reduce((sum, value) => sum + value, 0);

              return (
                <div key={contract.id} className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="text-xs font-black text-emerald-600">방과후</div><div className="mt-1 text-xl font-black text-slate-900">{contract.schoolName}</div>{contract.title && <div className="text-sm font-bold text-slate-500">{contract.title}</div>}</div>
                    <button type="button" onClick={() => deleteContract(contract)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">삭제</button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {months.map((month, index) => <div key={month} className="rounded-2xl bg-emerald-50 p-3 text-center"><div className="text-xs font-black text-emerald-700">{month}</div><div className="mt-1 text-sm font-black text-slate-900">{formatWon(monthTotals[index])}</div></div>)}
                  </div>
                  <div className="mt-2 rounded-2xl bg-slate-900 px-4 py-3 text-center text-white"><span className="text-xs font-bold opacity-70">분기 예상 수강료 </span><span className="text-xl font-black">{formatWon(quarterTotal)}</span></div>
                  <div className="mt-2 text-xs font-bold text-slate-500">A반 {formatWon(Number(contract.rateA || 0))} · B반 {formatWon(Number(contract.rateB || 0))}</div>

                  <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <summary className="cursor-pointer text-sm font-black text-slate-800">학생목록 · {matchingStudents.length}명</summary>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[440px] text-left text-xs">
                        <thead><tr className="text-slate-500"><th className="pb-2">학생</th>{months.map((month) => <th key={month} className="pb-2 text-center">{month}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-200">
                          {matchingStudents.map((student) => {
                            const checks = getChecks(contract, student);
                            return <tr key={student.id}><td className="py-2 font-black text-slate-800">{student.name} <span className="font-bold text-slate-400">{student.teachingClass}{student.enrollmentStatus !== "active" ? " · 휴식/종료" : ""}</span></td>{checks.map((checked, index) => <td key={index} className="py-2 text-center"><input type="checkbox" checked={checked} onChange={() => toggleParticipation(contract, student, index)} className="h-5 w-5 accent-emerald-600" /></td>)}</tr>;
                          })}
                        </tbody>
                      </table>
                      {matchingStudents.length === 0 && <div className="py-5 text-center text-sm font-bold text-slate-400">이 학교 학생이 아직 없습니다.</div>}
                    </div>
                  </details>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
