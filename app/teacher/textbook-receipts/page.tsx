"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { auth } from "@/lib/firebase";

type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
type Student = {
  id: string;
  name: string;
  school: string;
  grade: string;
  schoolClass: string;
  enrollmentStatus: string;
  phone: string;
};
type School = {
  contractId: string;
  schoolName: string;
  title: string;
  rule: string;
  quarterParticipation: Partial<Record<Quarter, Record<string, boolean[]>>>;
  quarterStudentSnapshots?: Partial<Record<Quarter, Student[]>>;
  students: Student[];
};
type SavedRecord = {
  contractId?: string;
  quarter?: string;
  receipts?: Record<string, boolean[]>;
  studentSnapshots?: Student[];
};

const quarters: { key: Quarter; label: string }[] = [
  { key: "Q1", label: "1분기" },
  { key: "Q2", label: "2분기" },
  { key: "Q3", label: "3분기" },
  { key: "Q4", label: "4분기" },
];
const terms = ["1텀", "2텀", "3텀"];

const normalizeSchool = (value: string) =>
  value.replace(/\s/g, "").replace(/초등학교/g, "초").replace(/초등/g, "초");

const normalizeChecks = (value: boolean[] | undefined) => [
  Boolean(value?.[0]),
  Boolean(value?.[1]),
  Boolean(value?.[2]),
];

const ruleLabel = (rule: string) => {
  if (rule === "all_after_enrollment") return "중도 취소해도 1~3텀 교재 모두 지급";
  if (rule === "started_terms_only") return "미개시 텀은 교재 미수령·환불";
  return "수강료 체크 기준으로 산정";
};

export default function TextbookReceiptsPage() {
  const searchParams = useSearchParams();
  const requestedSchool = searchParams.get("school") || "";
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [quarter, setQuarter] = useState<Quarter>("Q1");
  const [studentSnapshots, setStudentSnapshots] = useState<Student[]>([]);
  const [receipts, setReceipts] = useState<Record<string, boolean[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(
    () => onAuthStateChanged(auth, (current) => {
      setUser(current);
      setAuthChecking(false);
    }),
    []
  );

  const requestJson = useCallback(async (url: string, init?: RequestInit) => {
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
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const query = requestedSchool ? `?school=${encodeURIComponent(requestedSchool)}` : "";
      const data = await requestJson(`/api/teacher/textbook-receipts${query}`);
      const next = Array.isArray(data.schools) ? data.schools : [];
      const requested = requestedSchool
        ? next.find((item: School) => normalizeSchool(item.schoolName) === normalizeSchool(requestedSchool))
        : undefined;
      setSchools(next);
      setRecords(Array.isArray(data.records) ? data.records : []);
      setSchoolId((current) => {
        if (requestedSchool) return requested?.contractId || "";
        return current && next.some((item: School) => item.contractId === current)
          ? current
          : next[0]?.contractId || "";
      });
      if (requestedSchool && !requested) {
        setError("요청한 학교의 교재 수령 정보를 찾지 못했습니다.");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [requestJson, requestedSchool, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedSchool = schools.find((item) => item.contractId === schoolId);
  const scopedSchool = requestedSchool
    ? schools.find((item) => normalizeSchool(item.schoolName) === normalizeSchool(requestedSchool))
    : selectedSchool;
  const selectedRecord = records.find(
    (item) => item.contractId === scopedSchool?.contractId && item.quarter === quarter
  );

  const sourceStudents = useMemo(() => {
    if (!scopedSchool) return [];
    if (Array.isArray(selectedRecord?.studentSnapshots) && selectedRecord.studentSnapshots.length > 0) {
      return selectedRecord.studentSnapshots;
    }
    const seeded = scopedSchool.quarterStudentSnapshots?.[quarter];
    if (Array.isArray(seeded) && seeded.length > 0) return seeded;

    const feeMap = scopedSchool.quarterParticipation?.[quarter] || {};
    return scopedSchool.students.filter((student) => {
      const fee = feeMap[student.id] || [];
      const savedReceipt = selectedRecord?.receipts?.[student.id] || [];
      return fee.some(Boolean) || savedReceipt.some(Boolean);
    });
  }, [quarter, scopedSchool, selectedRecord]);

  useEffect(() => {
    if (!scopedSchool) {
      setStudentSnapshots([]);
      setReceipts({});
      return;
    }

    const feeMap = scopedSchool.quarterParticipation?.[quarter] || {};
    const savedReceipts = selectedRecord?.receipts || {};
    const nextReceipts: Record<string, boolean[]> = {};
    const nextStudents = sourceStudents.map((student) => ({ ...student, phone: student.phone || "" }));

    nextStudents.forEach((student) => {
      if (Object.prototype.hasOwnProperty.call(savedReceipts, student.id)) {
        nextReceipts[student.id] = normalizeChecks(savedReceipts[student.id]);
        return;
      }

      const feeChecks = normalizeChecks(feeMap[student.id]);
      nextReceipts[student.id] =
        scopedSchool.rule === "all_after_enrollment" && (feeChecks.some(Boolean) || sourceStudents.length > 0)
          ? [true, true, true]
          : feeChecks;
    });

    setStudentSnapshots(nextStudents);
    setReceipts(nextReceipts);
  }, [quarter, scopedSchool, selectedRecord, sourceStudents]);

  const totals = [0, 1, 2].map(
    (term) => studentSnapshots.filter((student) => Boolean(receipts[student.id]?.[term])).length
  );
  const uniqueCount = studentSnapshots.filter((student) => (receipts[student.id] || []).some(Boolean)).length;

  const toggle = (studentId: string, term: number) => setReceipts((current) => {
    const checks = [...(current[studentId] || [false, false, false])];
    checks[term] = !checks[term];
    return { ...current, [studentId]: checks };
  });

  const updatePhone = (studentId: string, phone: string) => setStudentSnapshots((current) =>
    current.map((student) => student.id === studentId ? { ...student, phone } : student)
  );

  const save = async () => {
    if (!scopedSchool) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/teacher/textbook-receipts", {
        method: "POST",
        body: JSON.stringify({
          contractId: scopedSchool.contractId,
          schoolName: scopedSchool.schoolName,
          quarter,
          receipts,
          studentSnapshots,
        }),
      });
      setNotice(
        `${scopedSchool.schoolName} ${quarters.find((item) => item.key === quarter)?.label} 교재 수령 명단 ${studentSnapshots.length}명을 확정 저장했습니다.`
      );
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (authChecking) {
    return <main className="min-h-screen bg-slate-50 p-6 font-bold">로그인 확인 중...</main>;
  }
  if (!user) {
    return <main className="min-h-screen bg-slate-50 p-6 font-bold">교사 로그인이 필요합니다.</main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
          <div className="text-xs font-black text-indigo-600">교재 수령인원 확인</div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">학교별 · 분기별 교재 수령 명단</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            수강료 계산의 텀별 체크를 불러오고, 확정 시 학생 정보와 전화번호를 해당 분기의 기록으로 보존합니다.
          </p>
          <div className={`mt-5 grid gap-3 ${requestedSchool ? "" : "sm:grid-cols-2"}`}>
            {!requestedSchool && (
              <label className="text-xs font-black text-slate-600">
                학교
                <select
                  value={schoolId}
                  onChange={(event) => setSchoolId(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"
                >
                  {schools.map((item) => (
                    <option key={item.contractId} value={item.contractId}>
                      {item.schoolName}{item.title ? ` · ${item.title}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs font-black text-slate-600">
              분기
              <select
                value={quarter}
                onChange={(event) => setQuarter(event.target.value as Quarter)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"
              >
                {quarters.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
          </div>
          {scopedSchool && (
            <div className="mt-4 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-800">
              {scopedSchool.schoolName} 기준 · {ruleLabel(scopedSchool.rule)}
            </div>
          )}
          {error && <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}
          {notice && <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}
        </section>

        <section className="mt-4 overflow-hidden rounded-[28px] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[120px_100px_1fr_170px_80px_80px_80px] bg-slate-900 px-4 py-3 text-center text-xs font-black text-white">
                <div className="text-left">학년·반</div>
                <div>상태</div>
                <div className="text-left">이름</div>
                <div className="text-left">전화번호</div>
                {terms.map((term) => <div key={term}>{term}</div>)}
              </div>
              {loading ? (
                <div className="p-8 text-center text-sm font-bold text-slate-400">불러오는 중...</div>
              ) : studentSnapshots.length === 0 ? (
                <div className="p-8 text-center text-sm font-bold text-slate-400">이 분기에 수강 체크된 학생이 없습니다.</div>
              ) : studentSnapshots.map((student) => (
                <div
                  key={student.id}
                  className="grid grid-cols-[120px_100px_1fr_170px_80px_80px_80px] items-center border-t border-slate-100 px-4 py-3 text-center"
                >
                  <div className="text-left text-sm font-black text-slate-700">
                    {[student.grade, student.schoolClass].filter(Boolean).join(" ") || "-"}
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    {student.enrollmentStatus === "ended" ? "종료" : student.enrollmentStatus === "paused" ? "쉬는중" : "수강중"}
                  </div>
                  <div className="text-left text-sm font-black text-slate-900">{student.name}</div>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={student.phone}
                    onChange={(event) => updatePhone(student.id, event.target.value)}
                    placeholder="전화번호"
                    aria-label={`${student.name} 전화번호`}
                    className="mr-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                  />
                  {[0, 1, 2].map((term) => (
                    <label key={term} className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={Boolean(receipts[student.id]?.[term])}
                        onChange={() => toggle(student.id, term)}
                        className="h-5 w-5 accent-indigo-600"
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl bg-white p-3 text-center">
                <div className="text-[11px] font-black text-slate-400">수령 학생</div>
                <div className="mt-1 text-xl font-black">{uniqueCount}명</div>
              </div>
              {totals.map((count, index) => (
                <div key={terms[index]} className="rounded-2xl bg-white p-3 text-center">
                  <div className="text-[11px] font-black text-slate-400">{terms[index]}</div>
                  <div className="mt-1 text-xl font-black">{count}명</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!scopedSchool || saving}
              className="mt-4 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {saving ? "저장 중..." : "이 분기 수령인원 확정 저장"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
