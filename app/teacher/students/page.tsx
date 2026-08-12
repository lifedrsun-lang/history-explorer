"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import {
  DEFAULT_STAGE_ID,
  STAGE_DATA,
  getBookNumberFromStage,
  getStageIdForBook,
  getStageInfo,
} from "@/app/student/data/stageData";
import {
  DEFAULT_STUDENT_PROGRAM,
  PROGRAM_FILTER_OPTIONS,
  STUDENT_PROGRAM_OPTIONS,
  ProgramFilter,
  StudentProgram,
  getStudentProgramLabel,
  getStudentProgramValue,
} from "@/lib/programs";
import {
  formatEnrollmentTerm,
  getEnrollmentStatus,
  getEnrollmentTerms,
  makeEnrollmentTerm,
} from "@/lib/studentEnrollment";
import StudentCard from "../components/StudentCard";
import StudentEditModal from "../components/StudentEditModal";

const CLASS_OPTIONS = ["전체", "A반", "B반"] as const;
type StudentStatusView = "active" | "paused";
type CoinSource = "quiz" | "homework" | "bonus" | "making";
type AttendanceStatus = "출석" | "결석(병가)" | "결석(체험학습)" | "지각";

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

const getSimpleStatus = (student: any): StudentStatusView => {
  return getEnrollmentStatus(student) === "active" ? "active" : "paused";
};

export default function TeacherStudentsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StudentStatusView>("active");
  const [selectedSchool, setSelectedSchool] = useState("전체학교");
  const [selectedProgram, setSelectedProgram] = useState<ProgramFilter>("all");
  const [selectedClass, setSelectedClass] = useState<(typeof CLASS_OPTIONS)[number]>("전체");
  const [searchTerm, setSearchTerm] = useState("");
  const [termYear, setTermYear] = useState(new Date().getFullYear());
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bonusStudent, setBonusStudent] = useState<any>(null);
  const [bonusAmount, setBonusAmount] = useState("1");
  const [editingStudent, setEditingStudent] = useState<any>(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [newSchool, setNewSchool] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [newClass, setNewClass] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newName, setNewName] = useState("");
  const [newProgram, setNewProgram] = useState<StudentProgram>(DEFAULT_STUDENT_PROGRAM);
  const [newStage, setNewStage] = useState(DEFAULT_STAGE_ID);

  const loadStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const snapshot = await getDocs(collection(db, "students"));
      setStudents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch {
      setError("학생 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage("");
      toastTimerRef.current = null;
    }, 1800);
  };

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("status");
    setSelectedStatus(status === "paused" ? "paused" : "active");
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      const signedIn = Boolean(user);
      setAuthorized(signedIn);
      setAuthChecking(false);
      if (signedIn) loadStudents();
      else setStudents([]);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const getStudentRef = (student: any) => doc(db, "students", student.id);

  const getTodayString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const makeHistoryItem = (item: any) => ({
    id: `coin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: getTodayString(),
    createdAt: new Date(),
    ...item,
  });

  const makeClassHistoryItem = (item: any) => ({
    id: `class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: getTodayString(),
    createdAt: new Date(),
    ...item,
  });

  const getNextCoinHistory = (student: any, items: any[]) => {
    const current = Array.isArray(student?.coinHistory) ? student.coinHistory : [];
    return [...current, ...items.map(makeHistoryItem)].slice(-100);
  };

  const getSourceLabel = (source: CoinSource) => {
    if (source === "quiz") return "퀴즈";
    if (source === "homework") return "과제";
    if (source === "making") return "만들기 완성";
    return "선생님 보너스";
  };

  const addBronzeBySource = async (student: any, source: CoinSource, amount: number) => {
    const currentBronze = Number(student?.bronze || 0);
    const currentSilver = Number(student?.silver || 0);
    const afterAddBronze = currentBronze + amount;
    const exchangeCount = Math.floor(afterAddBronze / 10);
    const newBronze = afterAddBronze % 10;
    const newSilver = currentSilver + exchangeCount;

    const historyItems: any[] = [
      {
        type: "earn",
        currency: "bronze",
        amount,
        source,
        text: `동엽전 ${amount}개 획득 (${getSourceLabel(source)})`,
      },
    ];

    if (exchangeCount > 0) {
      historyItems.push({
        type: "exchange",
        fromCurrency: "bronze",
        fromAmount: 10 * exchangeCount,
        toCurrency: "silver",
        toAmount: exchangeCount,
        text: `동엽전 ${10 * exchangeCount}개를 은엽전 ${exchangeCount}개로 자동 교환`,
      });
    }

    await updateDoc(getStudentRef(student), {
      bronze: newBronze,
      silver: newSilver,
      totalBronze: Number(student?.totalBronze || 0) + amount,
      totalSilver: Number(student?.totalSilver || 0) + exchangeCount,
      coinHistory: getNextCoinHistory(student, historyItems),
    });

    showToast(exchangeCount > 0 ? `🪙 동엽전 ${amount}개 지급 · 은엽전 ${exchangeCount}개 자동 교환` : `🪙 동엽전 ${amount}개 지급 완료`);
    await loadStudents();
  };

  const addQuizBronze = (student: any) => addBronzeBySource(student, "quiz", 1);
  const addHomeworkBronze = (student: any) => addBronzeBySource(student, "homework", 1);
  const addMakingBronze = (student: any) => addBronzeBySource(student, "making", 1);
  const addBonusBronze = (student: any) => {
    setBonusStudent(student);
    setBonusAmount("1");
  };

  const submitBonusBronze = async () => {
    if (!bonusStudent) return;
    const amount = Number(bonusAmount);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 50) {
      showToast("1~50 사이 숫자로 입력해주세요");
      return;
    }
    await addBronzeBySource(bonusStudent, "bonus", amount);
    setBonusStudent(null);
  };

  const removeBronze = async (student: any) => {
    const currentBronze = Number(student?.bronze || 0);
    if (currentBronze <= 0) {
      showToast("회수할 동엽전이 없습니다");
      return;
    }
    await updateDoc(getStudentRef(student), {
      bronze: currentBronze - 1,
      totalBronze: Math.max(Number(student?.totalBronze || 0) - 1, 0),
      coinHistory: getNextCoinHistory(student, [
        { type: "adjust", currency: "bronze", amount: 1, text: "동엽전 1개 회수" },
      ]),
    });
    showToast("동엽전 1개 회수 완료");
    await loadStudents();
  };

  const useSilver = async (student: any) => {
    const currentSilver = Number(student?.silver || 0);
    if (currentSilver <= 0) {
      showToast("은엽전이 부족합니다");
      return;
    }
    await updateDoc(getStudentRef(student), {
      silver: currentSilver - 1,
      coinHistory: getNextCoinHistory(student, [
        { type: "use", currency: "silver", amount: 1, text: "은엽전 1개 사용" },
      ]),
    });
    showToast("은엽전 1개 사용 완료");
    await loadStudents();
  };

  const addAttendanceRecord = async (student: any, status: AttendanceStatus) => {
    const current = Array.isArray(student?.attendanceHistory) ? student.attendanceHistory : [];
    await updateDoc(getStudentRef(student), {
      attendanceHistory: [
        ...current,
        makeClassHistoryItem({ type: "attendance", status, text: status }),
      ].slice(-100),
    });
    showToast(`✅ ${status} 기록 완료`);
    await loadStudents();
  };

  const addMaterialRecord = async (student: any) => {
    const current = Array.isArray(student?.materialHistory) ? student.materialHistory : [];
    const stageInfo = getStageInfo(student?.stage);
    const materialName = stageInfo?.current?.short || `별꼼역사 ${getBookNumberFromStage(student?.stage)}권`;
    await updateDoc(getStudentRef(student), {
      materialHistory: [
        ...current,
        makeClassHistoryItem({
          type: "material",
          materialName,
          stageId: student?.stage || "",
          stageTitle: stageInfo?.current?.title || "",
          text: `${materialName} 교재 지급`,
        }),
      ].slice(-100),
    });
    showToast("📦 교재 지급 기록 완료");
    await loadStudents();
  };

  const changeStage = async (student: any, direction: number) => {
    let nextBook = getBookNumberFromStage(student?.stage) + direction;
    nextBook = Math.max(1, Math.min(STAGE_DATA.length, nextBook));
    await updateDoc(getStudentRef(student), { stage: getStageIdForBook(nextBook) });
    await loadStudents();
  };

  const changeStatus = async (student: any, status: StudentStatusView) => {
    setSavingId(student.id);
    setError("");
    try {
      await updateDoc(getStudentRef(student), {
        enrollmentStatus: status,
        isActive: status === "active",
      });
      await loadStudents();
    } catch {
      setError("수강 상태를 저장하지 못했습니다.");
    } finally {
      setSavingId("");
    }
  };

  const moveToPaused = async (student: any) => {
    const check = confirm(`${student.name} 학생을 쉬는중으로 변경할까요?`);
    if (!check) return;
    await changeStatus(student, "paused");
    showToast("🟡 쉬는중으로 변경했습니다");
  };

  const deleteStudent = async (student: any) => {
    const check = confirm(`${student.name} 학생을 삭제할까요?`);
    if (!check) return;
    await deleteDoc(getStudentRef(student));
    await loadStudents();
  };

  const toggleTerm = async (student: any, quarter: number) => {
    const term = makeEnrollmentTerm(termYear, quarter);
    const current = getEnrollmentTerms(student);
    const next = current.includes(term)
      ? current.filter((item) => item !== term)
      : [...current, term].sort((a, b) => a.localeCompare(b));

    setSavingId(student.id);
    try {
      await updateDoc(getStudentRef(student), { enrollmentTerms: next });
      await loadStudents();
    } catch {
      setError("수강 분기 이력을 저장하지 못했습니다.");
    } finally {
      setSavingId("");
    }
  };

  const saveStudent = async () => {
    if (!newName || !newGrade || !newClass || !newNumber) {
      alert("이름 / 학년 / 실제 학교 반 / 번호를 입력해주세요.");
      return;
    }

    const password = String(newNumber).padStart(2, "0");
    await addDoc(collection(db, "students"), {
      school: newSchool || "미지정",
      grade: newGrade,
      class: newClass,
      studentNumber: newNumber,
      password,
      name: newName,
      bronze: 0,
      silver: 0,
      totalBronze: 0,
      totalSilver: 0,
      stage: newStage,
      program: newProgram,
      isActive: true,
      enrollmentStatus: "active",
      enrollmentTerms: [],
      coinHistory: [],
      attendanceHistory: [],
      materialHistory: [],
    });

    setNewName("");
    setNewNumber("");
    setIsStudentModalOpen(false);
    showToast(`학생 등록 완료 · 비밀번호 ${password}`);
    await loadStudents();
  };

  const schoolOptions = useMemo(
    () => [
      "전체학교",
      ...Array.from(new Set(students.map((student) => String(student?.school || "미지정")))).sort((a, b) => a.localeCompare(b, "ko-KR")),
    ],
    [students]
  );

  const classCounts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const baseStudents = students.filter((student) => {
      if (getSimpleStatus(student) !== selectedStatus) return false;
      if (selectedSchool !== "전체학교" && String(student?.school || "미지정") !== selectedSchool) return false;
      if (selectedProgram !== "all" && getStudentProgramValue(student?.program) !== selectedProgram) return false;
      if (keyword && !String(student?.name || "").toLowerCase().includes(keyword)) return false;
      return true;
    });

    return {
      전체: baseStudents.length,
      A반: baseStudents.filter((student) => getTeachingClass(student) === "A반").length,
      B반: baseStudents.filter((student) => getTeachingClass(student) === "B반").length,
    } as Record<(typeof CLASS_OPTIONS)[number], number>;
  }, [students, searchTerm, selectedProgram, selectedSchool, selectedStatus]);

  const visibleStudents = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return students
      .filter((student) => {
        if (getSimpleStatus(student) !== selectedStatus) return false;
        if (selectedSchool !== "전체학교" && String(student?.school || "미지정") !== selectedSchool) return false;
        if (selectedProgram !== "all" && getStudentProgramValue(student?.program) !== selectedProgram) return false;
        if (selectedClass !== "전체" && getTeachingClass(student) !== selectedClass) return false;
        if (keyword && !String(student?.name || "").toLowerCase().includes(keyword)) return false;
        return true;
      })
      .sort((a, b) => {
        const gradeA = getGradeNumber(a?.grade);
        const gradeB = getGradeNumber(b?.grade);
        if (gradeA !== gradeB) return gradeA - gradeB;
        const classA = Number(a?.class) || 0;
        const classB = Number(b?.class) || 0;
        if (classA !== classB) return classA - classB;
        return (Number(a?.studentNumber) || 0) - (Number(b?.studentNumber) || 0);
      });
  }, [students, searchTerm, selectedClass, selectedProgram, selectedSchool, selectedStatus]);

  if (authChecking) {
    return <div className="min-h-[100dvh] bg-[#f5f7fb] p-6 text-center font-bold text-slate-500">교사 로그인을 확인하고 있습니다.</div>;
  }

  if (!authorized) {
    return (
      <div className="min-h-[100dvh] bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 text-center shadow-lg">
          <div className="text-xl font-black text-slate-800">교사 로그인이 필요합니다.</div>
          <Link href="/teacher" className="mt-4 inline-block rounded-xl bg-blue-500 px-4 py-2 font-bold text-white">교사 로그인으로 이동</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-5">
      {toastMessage && (
        <div className="fixed left-1/2 top-4 z-[80] w-[calc(100%-24px)] max-w-sm -translate-x-1/2 rounded-2xl bg-white/95 px-4 py-3 text-center text-sm font-black text-slate-800 shadow-xl">
          {toastMessage}
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white p-5 shadow-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-black text-sky-600">👧 수강생 관리</div>
              <h1 className="mt-1 text-3xl font-black text-slate-900">
                {selectedStatus === "active" ? "수강중인 친구" : "쉬는중인 친구"}
              </h1>
              <p className="mt-2 text-sm font-bold text-slate-500">
                {selectedStatus === "active"
                  ? "진도·코인·교재·학생수정까지 이 화면에서 바로 관리합니다."
                  : "쉬는 친구를 검색하고 수강이력 확인 또는 수강 재개를 할 수 있습니다."}
              </p>
            </div>
            <Link href="/teacher" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">← 교사용 홈</Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {CLASS_OPTIONS.map((className) => {
            const selected = selectedClass === className;
            const label = className === "A반" ? "🌙 A반" : className === "B반" ? "⭐ B반" : "전체";
            const selectedStyle = className === "A반"
              ? "bg-blue-500 text-white ring-4 ring-blue-100"
              : className === "B반"
                ? "bg-pink-500 text-white ring-4 ring-pink-100"
                : "bg-slate-700 text-white ring-4 ring-slate-200";
            const idleStyle = className === "A반"
              ? "bg-blue-50 text-blue-700"
              : className === "B반"
                ? "bg-pink-50 text-pink-700"
                : "bg-white text-slate-700";

            return (
              <button
                key={className}
                type="button"
                onClick={() => setSelectedClass(className)}
                className={`rounded-3xl p-3 shadow-sm sm:p-4 ${selected ? selectedStyle : idleStyle}`}
              >
                <div className="text-xs font-black sm:text-sm">{label}</div>
                <div className="mt-1 text-2xl font-black sm:text-3xl">{classCounts[className]}명</div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-3xl bg-white p-4 shadow-md">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-bold">
              {schoolOptions.map((school) => <option key={school} value={school}>{school}</option>)}
            </select>
            <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value as ProgramFilter)} className="rounded-xl border px-3 py-2 text-sm font-bold">
              {PROGRAM_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="학생 이름 검색" className="rounded-xl border px-3 py-2 text-sm font-bold" />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="text-xs font-bold text-slate-500">검색 결과 {visibleStudents.length}명</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-600">수강이력 연도</span>
              <input type="number" min="2020" max="2035" value={termYear} onChange={(e) => setTermYear(Number(e.target.value) || new Date().getFullYear())} className="w-24 rounded-xl border px-2 py-1.5 text-center text-xs font-bold" />
              {selectedStatus === "active" && (
                <button onClick={() => setIsStudentModalOpen(true)} className="rounded-xl bg-yellow-500 px-3 py-2 text-xs font-black text-white">➕ 신규 학생</button>
              )}
              <button onClick={loadStudents} disabled={loading} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-50">{loading ? "불러오는 중" : "↻ 새로고침"}</button>
            </div>
          </div>
          {error && <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        </div>

        {selectedStatus === "active" ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:gap-4 items-start">
            {visibleStudents.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                removeBronze={removeBronze}
                addQuizBronze={addQuizBronze}
                addHomeworkBronze={addHomeworkBronze}
                addMakingBronze={addMakingBronze}
                addBonusBronze={addBonusBronze}
                useSilver={useSilver}
                addAttendanceRecord={addAttendanceRecord}
                addMaterialRecord={addMaterialRecord}
                changeStage={changeStage}
                toggleStudentVisible={moveToPaused}
                deleteStudent={deleteStudent}
                openEditModal={setEditingStudent}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {visibleStudents.map((student) => {
              const terms = getEnrollmentTerms(student);
              const isSaving = savingId === student.id;
              return (
                <div key={student.id} className="rounded-3xl bg-white p-4 shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-2xl font-black text-slate-900">{student.name || "이름 없음"}</div>
                      <div className="mt-1 text-sm font-bold text-slate-500">{student.school || "미지정"} · {getStudentProgramLabel(student.program)} · {getTeachingClass(student)}</div>
                      <div className="mt-0.5 text-xs font-bold text-slate-400">{student.grade}학년 {student.class}반 {student.studentNumber}번</div>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">🟡 쉬는중</span>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs font-black text-slate-500">수강이력</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {terms.length === 0 ? (
                        <span className="text-xs font-bold text-slate-400">아직 입력된 분기 이력이 없습니다.</span>
                      ) : (
                        terms.map((term) => <span key={term} className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-700">{formatEnrollmentTerm(term)}</span>)
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-slate-200 pt-3">
                      {[1, 2, 3, 4].map((quarter) => {
                        const term = makeEnrollmentTerm(termYear, quarter);
                        const selected = terms.includes(term);
                        return (
                          <button key={quarter} disabled={isSaving} onClick={() => toggleTerm(student, quarter)} className={`rounded-xl px-2 py-2 text-xs font-black ${selected ? "bg-blue-500 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
                            {quarter}분기 {selected ? "✓" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button disabled={isSaving} onClick={() => changeStatus(student, "active")} className="mt-3 w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-white disabled:opacity-50">▶ 수강 재개</button>
                </div>
              );
            })}
          </div>
        )}

        {!loading && visibleStudents.length === 0 && (
          <div className="mt-4 rounded-3xl bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-md">선택한 조건에 맞는 학생이 없습니다.</div>
        )}

        {bonusStudent && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-3">
            <form onSubmit={(e) => { e.preventDefault(); submitBonusBronze(); }} className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
              <div className="text-2xl font-black text-slate-800">보너스 동엽전 지급</div>
              <div className="mt-2 text-sm font-bold text-slate-500">{bonusStudent.name} 학생에게 지급할 개수</div>
              <input type="number" min="1" max="50" value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} className="mt-4 w-full rounded-xl border px-3 py-2 font-bold" autoFocus />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setBonusStudent(null)} className="rounded-xl bg-slate-100 px-4 py-2 font-bold">취소</button>
                <button type="submit" className="rounded-xl bg-yellow-500 px-4 py-2 font-bold text-white">지급</button>
              </div>
            </form>
          </div>
        )}

        {isStudentModalOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-3">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-black">➕ 신규 학생 등록</div>
                <button onClick={() => setIsStudentModalOpen(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold">닫기</button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <select value={newProgram} onChange={(e) => setNewProgram(e.target.value as StudentProgram)} className="rounded-xl border px-3 py-2">
                  {STUDENT_PROGRAM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <input value={newSchool} onChange={(e) => setNewSchool(e.target.value)} placeholder="학교" className="rounded-xl border px-3 py-2" />
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="이름" className="rounded-xl border px-3 py-2" />
                <input value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder="학년" className="rounded-xl border px-3 py-2" />
                <input value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="실제 학교 반" className="rounded-xl border px-3 py-2" />
                <input value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="번호" className="rounded-xl border px-3 py-2" />
                <select value={newStage} onChange={(e) => setNewStage(e.target.value)} className="rounded-xl border px-3 py-2 md:col-span-2">
                  {STAGE_DATA.map((stage) => <option key={stage.id} value={stage.id}>{stage.label} {stage.title}</option>)}
                </select>
              </div>
              <button onClick={saveStudent} className="mt-4 w-full rounded-xl bg-yellow-500 px-4 py-3 font-black text-white">등록</button>
            </div>
          </div>
        )}

        {editingStudent && (
          <StudentEditModal student={editingStudent} onClose={() => setEditingStudent(null)} refreshStudents={loadStudents} />
        )}
      </div>
    </div>
  );
}
