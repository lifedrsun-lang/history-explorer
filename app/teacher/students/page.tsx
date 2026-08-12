"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import {
  PROGRAM_FILTER_OPTIONS,
  ProgramFilter,
  getStudentProgramLabel,
  getStudentProgramValue,
} from "@/lib/programs";
import {
  ENROLLMENT_STATUS_OPTIONS,
  EnrollmentStatus,
  EnrollmentStatusFilter,
  formatEnrollmentTerm,
  getEnrollmentStatus,
  getEnrollmentStatusLabel,
  getEnrollmentTerms,
  makeEnrollmentTerm,
} from "@/lib/studentEnrollment";

const CLASS_OPTIONS = ["전체반", "A반", "B반"];

const getGradeNumber = (value: unknown) => {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const getTeachingClass = (student: any) => {
  const grade = getGradeNumber(student?.grade);

  if (grade >= 1 && grade <= 2) return "A반";
  if (grade >= 3 && grade <= 6) return "B반";
  return "미분류";
};

const statusClassName = (status: EnrollmentStatus) => {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  if (status === "paused") return "bg-amber-100 text-amber-700";
  return "bg-slate-200 text-slate-700";
};

export default function TeacherStudentsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<EnrollmentStatusFilter>("active");
  const [selectedSchool, setSelectedSchool] = useState("전체학교");
  const [selectedProgram, setSelectedProgram] =
    useState<ProgramFilter>("all");
  const [selectedClass, setSelectedClass] = useState("전체반");
  const [searchTerm, setSearchTerm] = useState("");
  const [termYear, setTermYear] = useState(new Date().getFullYear());

  const loadStudents = async () => {
    setLoading(true);
    setError("");

    try {
      const snapshot = await getDocs(collection(db, "students"));
      setStudents(
        snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      );
    } catch {
      setError("학생 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      const signedIn = Boolean(user);
      setAuthorized(signedIn);
      setAuthChecking(false);

      if (signedIn) {
        loadStudents();
      } else {
        setStudents([]);
      }
    });
  }, []);

  const schoolOptions = useMemo(
    () => [
      "전체학교",
      ...Array.from(
        new Set(students.map((student) => String(student?.school || "미지정")))
      ).sort((a, b) => a.localeCompare(b, "ko-KR")),
    ],
    [students]
  );

  const counts = useMemo(() => {
    return students.reduce(
      (result, student) => {
        result[getEnrollmentStatus(student)] += 1;
        return result;
      },
      { active: 0, paused: 0, ended: 0 } as Record<EnrollmentStatus, number>
    );
  }, [students]);

  const visibleStudents = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return students
      .filter((student) => {
        const status = getEnrollmentStatus(student);

        if (selectedStatus !== "all" && status !== selectedStatus) return false;
        if (
          selectedSchool !== "전체학교" &&
          String(student?.school || "미지정") !== selectedSchool
        ) {
          return false;
        }
        if (
          selectedProgram !== "all" &&
          getStudentProgramValue(student?.program) !== selectedProgram
        ) {
          return false;
        }
        if (
          selectedClass !== "전체반" &&
          getTeachingClass(student) !== selectedClass
        ) {
          return false;
        }
        if (keyword && !String(student?.name || "").toLowerCase().includes(keyword)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const schoolA = String(a?.school || "미지정");
        const schoolB = String(b?.school || "미지정");
        if (schoolA !== schoolB) return schoolA.localeCompare(schoolB, "ko-KR");

        const classA = getTeachingClass(a);
        const classB = getTeachingClass(b);
        if (classA !== classB) return classA.localeCompare(classB, "ko-KR");

        const gradeA = getGradeNumber(a?.grade);
        const gradeB = getGradeNumber(b?.grade);
        if (gradeA !== gradeB) return gradeA - gradeB;

        return String(a?.name || "").localeCompare(String(b?.name || ""), "ko-KR");
      });
  }, [students, searchTerm, selectedClass, selectedProgram, selectedSchool, selectedStatus]);

  const changeStatus = async (student: any, status: EnrollmentStatus) => {
    setSavingId(student.id);
    setError("");

    try {
      await updateDoc(doc(db, "students", student.id), {
        enrollmentStatus: status,
        // 기존 화면/강사료와의 호환을 위해 수강중만 isActive=true로 유지한다.
        isActive: status === "active",
      });
      await loadStudents();
    } catch {
      setError("수강 상태를 저장하지 못했습니다.");
    } finally {
      setSavingId("");
    }
  };

  const toggleTerm = async (student: any, quarter: number) => {
    const term = makeEnrollmentTerm(termYear, quarter);
    const current = getEnrollmentTerms(student);
    const next = current.includes(term)
      ? current.filter((item) => item !== term)
      : [...current, term].sort((a, b) => a.localeCompare(b));

    setSavingId(student.id);
    setError("");

    try {
      await updateDoc(doc(db, "students", student.id), {
        enrollmentTerms: next,
      });
      await loadStudents();
    } catch {
      setError("수강 분기 이력을 저장하지 못했습니다.");
    } finally {
      setSavingId("");
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-[100dvh] bg-[#f5f7fb] p-6 text-center font-bold text-slate-500">
        교사 로그인을 확인하고 있습니다.
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-[100dvh] bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 text-center shadow-lg">
          <div className="text-xl font-black text-slate-800">교사 로그인이 필요합니다.</div>
          <Link href="/teacher" className="mt-4 inline-block rounded-xl bg-blue-500 px-4 py-2 font-bold text-white">
            교사 로그인으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white p-5 shadow-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-black text-sky-600">👧 수강생 관리</div>
              <h1 className="mt-1 text-3xl font-black text-slate-900">수강 상태와 분기 이력</h1>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-500">
                기존 숨김 학생은 우선 ‘쉬는중’으로 표시됩니다. 과거 분기 이력은 임의 추정하지 않고 확인되는 분기만 체크해 주세요.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/teacher" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                ← 교사용 홈
              </Link>
              <Link href="/teacher?manage=1" className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-black text-white">
                출석·진도·코인 상세관리
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <button onClick={() => setSelectedStatus("active")} className="rounded-3xl bg-emerald-50 p-4 shadow-sm">
            <div className="text-xs font-black text-emerald-700">🟢 수강중</div>
            <div className="mt-1 text-3xl font-black text-emerald-700">{counts.active}</div>
          </button>
          <button onClick={() => setSelectedStatus("paused")} className="rounded-3xl bg-amber-50 p-4 shadow-sm">
            <div className="text-xs font-black text-amber-700">🟡 쉬는중</div>
            <div className="mt-1 text-3xl font-black text-amber-700">{counts.paused}</div>
          </button>
          <button onClick={() => setSelectedStatus("ended")} className="rounded-3xl bg-slate-200 p-4 shadow-sm">
            <div className="text-xs font-black text-slate-700">⚫ 종료</div>
            <div className="mt-1 text-3xl font-black text-slate-700">{counts.ended}</div>
          </button>
        </div>

        <div className="mt-4 rounded-3xl bg-white p-4 shadow-md">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as EnrollmentStatusFilter)} className="rounded-xl border px-3 py-2 text-sm font-bold">
              {ENROLLMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-bold">
              {schoolOptions.map((school) => <option key={school} value={school}>{school}</option>)}
            </select>
            <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value as ProgramFilter)} className="rounded-xl border px-3 py-2 text-sm font-bold">
              {PROGRAM_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-bold">
              {CLASS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="이름 검색 · 쉬는중도 검색됨" className="rounded-xl border px-3 py-2 text-sm font-bold md:col-span-2" />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="text-xs font-bold text-slate-500">검색 결과 {visibleStudents.length}명</div>
            <div className="flex items-center gap-2 text-xs font-black text-slate-600">
              수강이력 편집 연도
              <input type="number" min="2020" max="2035" value={termYear} onChange={(e) => setTermYear(Number(e.target.value) || new Date().getFullYear())} className="w-24 rounded-xl border px-2 py-1.5 text-center" />
              <button onClick={loadStudents} disabled={loading} className="rounded-xl bg-slate-100 px-3 py-1.5 disabled:opacity-50">
                {loading ? "불러오는 중" : "↻ 새로고침"}
              </button>
            </div>
          </div>

          {error && <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visibleStudents.map((student) => {
            const status = getEnrollmentStatus(student);
            const terms = getEnrollmentTerms(student);
            const isSaving = savingId === student.id;

            return (
              <div key={student.id} className="rounded-3xl bg-white p-4 shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-2xl font-black text-slate-900">{student.name || "이름 없음"}</div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusClassName(status)}`}>
                        {getEnrollmentStatusLabel(status)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-500">
                      {student.school || "미지정"} · {getStudentProgramLabel(student.program)} · {getTeachingClass(student)}
                    </div>
                    <div className="mt-0.5 text-xs font-bold text-slate-400">
                      {student.grade}학년 {student.class}반 {student.studentNumber}번
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs font-black text-slate-500">수강이력</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {terms.length === 0 ? (
                      <span className="text-xs font-bold text-slate-400">아직 입력된 분기 이력이 없습니다.</span>
                    ) : (
                      terms.map((term) => (
                        <span key={term} className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-700">
                          {formatEnrollmentTerm(term)}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <div className="mb-2 text-[11px] font-black text-slate-500">{termYear}년 분기 체크</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((quarter) => {
                        const term = makeEnrollmentTerm(termYear, quarter);
                        const selected = terms.includes(term);
                        return (
                          <button
                            key={quarter}
                            type="button"
                            disabled={isSaving}
                            onClick={() => toggleTerm(student, quarter)}
                            className={`rounded-xl px-2 py-2 text-xs font-black disabled:opacity-50 ${
                              selected ? "bg-blue-500 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
                            }`}
                          >
                            {quarter}분기 {selected ? "✓" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <button disabled={isSaving || status === "active"} onClick={() => changeStatus(student, "active")} className="rounded-xl bg-emerald-500 px-2 py-2 text-xs font-black text-white disabled:opacity-35">수강중</button>
                  <button disabled={isSaving || status === "paused"} onClick={() => changeStatus(student, "paused")} className="rounded-xl bg-amber-500 px-2 py-2 text-xs font-black text-white disabled:opacity-35">쉬는중</button>
                  <button disabled={isSaving || status === "ended"} onClick={() => changeStatus(student, "ended")} className="rounded-xl bg-slate-600 px-2 py-2 text-xs font-black text-white disabled:opacity-35">종료</button>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && visibleStudents.length === 0 && (
          <div className="mt-4 rounded-3xl bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-md">
            선택한 조건에 맞는 학생이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
