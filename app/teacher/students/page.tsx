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
  type EnrollmentStatus,
} from "@/lib/studentEnrollment";
import { AFTER_SCHOOL_ACADEMIC_YEAR } from "@/lib/studentRoster";
import StudentCard from "../components/StudentCard";
import StudentEditModal from "../components/StudentEditModal";
import { normalizeSchoolText } from "@/app/student/data/schoolInfo";

const CLASS_OPTIONS = ["전체", "A반", "B반"] as const;
const BULK_CLASS_OPTIONS = ["A반", "B반"] as const;
type StudentStatusView = EnrollmentStatus;
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
  return getEnrollmentStatus(student);
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
  const [bulkEnrollmentQuarter, setBulkEnrollmentQuarter] = useState(3);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bonusStudent, setBonusStudent] = useState<any>(null);
  const [bonusAmount, setBonusAmount] = useState("1");
  const [editingStudent, setEditingStudent] = useState<any>(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isBulkStageOpen, setIsBulkStageOpen] = useState(false);
  const [bulkProgram, setBulkProgram] = useState<StudentProgram>(DEFAULT_STUDENT_PROGRAM);
  const [bulkSchool, setBulkSchool] = useState("");
  const [bulkClass, setBulkClass] = useState<(typeof BULK_CLASS_OPTIONS)[number]>("A반");
  const [bulkStage, setBulkStage] = useState(DEFAULT_STAGE_ID);
  const [newSchool, setNewSchool] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [newClass, setNewClass] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newName, setNewName] = useState("");
  const [newProgram, setNewProgram] = useState<StudentProgram>(DEFAULT_STUDENT_PROGRAM);
  const [newStage, setNewStage] = useState(DEFAULT_STAGE_ID);
  const [newStatus, setNewStatus] = useState<EnrollmentStatus>("active");
  const [newEnrollmentTerms, setNewEnrollmentTerms] = useState<string[]>([]);
  const [newSunLabMember, setNewSunLabMember] = useState(false);

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
    const timeout = window.setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const status = searchParams.get("status");
      const school = searchParams.get("school");
      setSelectedStatus(
        status === "paused" || status === "ended" ? status : "active"
      );
      if (school) setSelectedSchool(school);
    }, 0);

    return () => window.clearTimeout(timeout);
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

  const changeStatus = async (student: any, status: EnrollmentStatus) => {
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

  const unassignedStudents = students.filter(
    (student) => getEnrollmentTerms(student).length === 0
  );

  const applyQuarterToUnassigned = async () => {
    if (unassignedStudents.length === 0) {
      showToast("분기 미지정 학생이 없습니다");
      return;
    }
    const term = makeEnrollmentTerm(termYear, bulkEnrollmentQuarter);
    if (
      !confirm(
        `분기 미지정 학생 ${unassignedStudents.length}명에게 ${termYear}년 ${bulkEnrollmentQuarter}분기를 적용할까요?`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await Promise.all(
        unassignedStudents.map((student) =>
          updateDoc(getStudentRef(student), { enrollmentTerms: [term] })
        )
      );
      showToast(`${unassignedStudents.length}명 분기 적용 완료`);
      await loadStudents();
    } catch {
      setError("분기 일괄 적용에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const toggleNewQuarter = (quarter: number) => {
    const term = makeEnrollmentTerm(AFTER_SCHOOL_ACADEMIC_YEAR, quarter);
    setNewEnrollmentTerms((current) =>
      current.includes(term)
        ? current.filter((item) => item !== term)
        : [...current, term].sort((a, b) => a.localeCompare(b))
    );
  };

  const resetNewStudentForm = () => {
    setNewSchool("");
    setNewGrade("");
    setNewClass("");
    setNewNumber("");
    setNewName("");
    setNewProgram(DEFAULT_STUDENT_PROGRAM);
    setNewStage(DEFAULT_STAGE_ID);
    setNewStatus("active");
    setNewEnrollmentTerms([]);
    setNewSunLabMember(false);
  };

  const saveStudent = async () => {
    const isSunLabOnly = newProgram === "sun_lab";
    const isSunLabMember = newSunLabMember || isSunLabOnly;

    if (isSunLabOnly) {
      if (!newName.trim()) {
        alert("이름을 입력해주세요.");
        return;
      }
    } else if (!newName || !newGrade || !newClass || !newNumber) {
      alert("이름 / 학년 / 실제 학교 반 / 번호를 입력해주세요.");
      return;
    }

    const password = newNumber ? String(newNumber).padStart(2, "0") : "";

    await addDoc(collection(db, "students"), {
      school: newSchool || (isSunLabOnly ? "SUN LAB" : "미지정"),
      grade: newGrade,
      class: newClass,
      studentNumber: newNumber,
      password,
      name: newName.trim(),
      bronze: 0,
      silver: 0,
      totalBronze: 0,
      totalSilver: 0,
      stage: isSunLabOnly ? DEFAULT_STAGE_ID : newStage,
      program: newProgram,
      isActive: newStatus === "active",
      enrollmentStatus: newStatus,
      enrollmentTerms: newEnrollmentTerms,
      coinHistory: [],
      attendanceHistory: [],
      materialHistory: [],
      sunLabMember: isSunLabMember,
    });

    resetNewStudentForm();
    setIsStudentModalOpen(false);
    showToast(
      isSunLabMember
        ? "수강생 등록 완료 · SUN LAB 회원정보는 회원관리에서 연결해 주세요"
        : `학생 등록 완료 · 비밀번호 ${password}`
    );
    await loadStudents();
  };

  const schoolOptions = useMemo(
    () => {
      const schools = Array.from(
        new Set(students.map((student) => String(student?.school || "미지정")))
      ).sort((a, b) => a.localeCompare(b, "ko-KR"));
      const requestedSchool =
        selectedSchool !== "전체학교" && !schools.includes(selectedSchool)
          ? [selectedSchool]
          : [];

      return ["전체학교", ...requestedSchool, ...schools];
    },
    [selectedSchool, students]
  );

  const bulkSchoolOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .filter(
              (student) =>
                getSimpleStatus(student) === "active" &&
                getStudentProgramValue(student?.program) === bulkProgram
            )
            .map((student) => String(student?.school || "미지정"))
        )
      ).sort((a, b) => a.localeCompare(b, "ko-KR")),
    [bulkProgram, students]
  );

  const bulkTargetStudents = useMemo(
    () =>
      students.filter((student) => {
        if (getSimpleStatus(student) !== "active") return false;
        if (getStudentProgramValue(student?.program) !== bulkProgram) return false;
        if (String(student?.school || "미지정") !== bulkSchool) return false;
        return getTeachingClass(student) === bulkClass;
      }),
    [bulkClass, bulkProgram, bulkSchool, students]
  );

  const selectedBulkStage =
    STAGE_DATA.find((stage) => stage.id === bulkStage) || STAGE_DATA[0];

  const openBulkStageModal = () => {
    const nextProgram =
      selectedProgram !== "all" && selectedProgram !== "sun_lab"
        ? (selectedProgram as StudentProgram)
        : DEFAULT_STUDENT_PROGRAM;
    const nextSchools = Array.from(
      new Set(
        students
          .filter(
            (student) =>
              getSimpleStatus(student) === "active" &&
              getStudentProgramValue(student?.program) === nextProgram
          )
          .map((student) => String(student?.school || "미지정"))
      )
    ).sort((a, b) => a.localeCompare(b, "ko-KR"));

    setBulkProgram(nextProgram);
    setBulkSchool(
      selectedSchool !== "전체학교" && nextSchools.includes(selectedSchool)
        ? selectedSchool
        : nextSchools[0] || ""
    );
    setBulkClass(selectedClass === "B반" ? "B반" : "A반");
    setIsBulkStageOpen(true);
  };

  const changeBulkStage = async () => {
    if (!bulkSchool || !bulkClass || !selectedBulkStage) {
      alert("프로그램, 학교, 반, 변경할 진도를 모두 선택해주세요.");
      return;
    }

    if (bulkTargetStudents.length === 0) {
      alert("변경할 수강중 학생이 없습니다.");
      return;
    }

    const check = confirm(
      `${getStudentProgramLabel(bulkProgram)} ${bulkSchool} ${bulkClass} 학생 ${bulkTargetStudents.length}명의 진도를 ${selectedBulkStage.label}으로 변경할까요?`
    );
    if (!check) return;

    const studentsToUpdate = bulkTargetStudents.filter(
      (student) => String(student?.stage || "") !== selectedBulkStage.id
    );

    for (const student of studentsToUpdate) {
      await updateDoc(getStudentRef(student), { stage: selectedBulkStage.id });
    }

    setIsBulkStageOpen(false);
    showToast(`📚 ${studentsToUpdate.length}명 진도 변경 완료`);
    await loadStudents();
  };

  const classCounts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const baseStudents = students.filter((student) => {
      if (getSimpleStatus(student) !== selectedStatus) return false;
      if (
        selectedSchool !== "전체학교" &&
        normalizeSchoolText(student?.school) !== normalizeSchoolText(selectedSchool)
      ) return false;
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
        if (
          selectedSchool !== "전체학교" &&
          normalizeSchoolText(student?.school) !== normalizeSchoolText(selectedSchool)
        ) return false;
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

  const isNewSunLabMember = newSunLabMember || newProgram === "sun_lab";
  const selectedStatusLabel =
    selectedStatus === "active"
      ? "수강중인 친구"
      : selectedStatus === "paused"
        ? "쉬는중인 친구"
        : "종료한 친구";

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
                {selectedStatusLabel}
              </h1>
              <p className="mt-2 text-sm font-bold text-slate-500">
                {selectedStatus === "active"
                  ? "진도·코인·교재·학생수정까지 이 화면에서 바로 관리합니다."
                  : "상태와 수강 분기 이력을 확인하고 수정할 수 있습니다."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/teacher/student-data-integrity" className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">데이터 연결 점검</Link>
              <Link href="/teacher" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">← 교사용 홈</Link>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-3xl bg-white p-3 shadow-md">
          {([
            ["active", "🟢 수강중"],
            ["paused", "🟡 쉬는중"],
            ["ended", "⚫ 종료"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedStatus(value)}
              className={`rounded-2xl px-2 py-3 text-sm font-black ${
                selectedStatus === value
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
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
                <>
                  <button onClick={openBulkStageModal} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white">📚 전체 진도변경</button>
                  <button onClick={() => setIsStudentModalOpen(true)} className="rounded-xl bg-yellow-500 px-3 py-2 text-xs font-black text-white">➕ 신규 학생</button>
                </>
              )}
              <button onClick={loadStudents} disabled={loading} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-50">{loading ? "불러오는 중" : "↻ 새로고침"}</button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-blue-50 px-3 py-3">
            <span className="text-xs font-black text-blue-800">
              분기 미지정 {unassignedStudents.length}명
            </span>
            <select value={bulkEnrollmentQuarter} onChange={(e) => setBulkEnrollmentQuarter(Number(e.target.value))} className="rounded-xl border border-blue-200 bg-white px-2 py-1.5 text-xs font-black text-blue-800">
              {[1, 2, 3, 4].map((quarter) => <option key={quarter} value={quarter}>{termYear}년 {quarter}분기</option>)}
            </select>
            <button type="button" onClick={() => void applyQuarterToUnassigned()} disabled={loading || unassignedStudents.length === 0} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">
              미지정 학생 일괄 적용
            </button>
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
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${selectedStatus === "ended" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-700"}`}>
                      {selectedStatus === "ended" ? "⚫ 종료" : "🟡 쉬는중"}
                    </span>
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

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button disabled={isSaving} onClick={() => changeStatus(student, "active")} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-white disabled:opacity-50">▶ 수강 재개</button>
                    <button disabled={isSaving} onClick={() => setEditingStudent(student)} className="rounded-xl bg-blue-500 px-3 py-2 text-sm font-black text-white disabled:opacity-50">✏️ 정보 수정</button>
                  </div>
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

        {isBulkStageOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-3">
            <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-2xl font-black text-slate-900">📚 전체 진도변경</div>
                  <div className="mt-1 text-sm font-bold text-slate-500">학교와 수업반 학생의 진도를 한 번에 변경합니다.</div>
                </div>
                <button onClick={() => setIsBulkStageOpen(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold">닫기</button>
              </div>

              <div className="mt-5 grid gap-3">
                <label className="grid gap-1.5 text-sm font-black text-slate-600">
                  프로그램
                  <select
                    value={bulkProgram}
                    onChange={(e) => {
                      const nextProgram = e.target.value as StudentProgram;
                      setBulkProgram(nextProgram);
                      const nextSchools = Array.from(
                        new Set(
                          students
                            .filter(
                              (student) =>
                                getSimpleStatus(student) === "active" &&
                                getStudentProgramValue(student?.program) === nextProgram
                            )
                            .map((student) => String(student?.school || "미지정"))
                        )
                      ).sort((a, b) => a.localeCompare(b, "ko-KR"));
                      setBulkSchool(nextSchools[0] || "");
                    }}
                    className="rounded-xl border px-3 py-2 font-bold"
                  >
                    {STUDENT_PROGRAM_OPTIONS.filter((option) => option.value !== "sun_lab").map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm font-black text-slate-600">
                  학교
                  <select value={bulkSchool} onChange={(e) => setBulkSchool(e.target.value)} className="rounded-xl border px-3 py-2 font-bold">
                    {bulkSchoolOptions.length === 0 && <option value="">학교 없음</option>}
                    {bulkSchoolOptions.map((school) => <option key={school} value={school}>{school}</option>)}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm font-black text-slate-600">
                  수업반
                  <select value={bulkClass} onChange={(e) => setBulkClass(e.target.value as (typeof BULK_CLASS_OPTIONS)[number])} className="rounded-xl border px-3 py-2 font-bold">
                    {BULK_CLASS_OPTIONS.map((className) => <option key={className} value={className}>{className}</option>)}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm font-black text-slate-600">
                  변경할 진도
                  <select value={bulkStage} onChange={(e) => setBulkStage(e.target.value)} className="rounded-xl border px-3 py-2 font-bold">
                    {STAGE_DATA.map((stage) => <option key={stage.id} value={stage.id}>{stage.label} {stage.title}</option>)}
                  </select>
                </label>
              </div>

              <div className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-black text-sky-800">
                변경 대상: 수강중 학생 {bulkTargetStudents.length}명
              </div>

              <button onClick={changeBulkStage} className="mt-4 w-full rounded-xl bg-sky-600 px-4 py-3 font-black text-white">선택한 학생 진도 변경</button>
            </div>
          </div>
        )}

        {isStudentModalOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-3">
            <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-black">➕ 신규 학생 등록</div>
                <button
                  onClick={() => {
                    setIsStudentModalOpen(false);
                    resetNewStudentForm();
                  }}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold"
                >
                  닫기
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-black text-slate-600 md:col-span-2">
                  등록 구분
                  <select
                    value={newProgram}
                    onChange={(e) => {
                      const nextProgram = e.target.value as StudentProgram;
                      setNewProgram(nextProgram);
                      if (nextProgram === "sun_lab") setNewSunLabMember(true);
                    }}
                    className="rounded-xl border px-3 py-2"
                  >
                    {STUDENT_PROGRAM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <input value={newSchool} onChange={(e) => setNewSchool(e.target.value)} placeholder={newProgram === "sun_lab" ? "학교 (선택)" : "학교"} className="rounded-xl border px-3 py-2" />
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="이름" className="rounded-xl border px-3 py-2" />
                <input value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder={newProgram === "sun_lab" ? "학년 (선택)" : "학년"} className="rounded-xl border px-3 py-2" />
                <input value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder={newProgram === "sun_lab" ? "실제 학교 반 (선택)" : "실제 학교 반"} className="rounded-xl border px-3 py-2" />
                <input value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder={newProgram === "sun_lab" ? "번호 (선택)" : "번호"} className="rounded-xl border px-3 py-2" />

                {newProgram !== "sun_lab" && (
                  <select value={newStage} onChange={(e) => setNewStage(e.target.value)} className="rounded-xl border px-3 py-2 md:col-span-2">
                    {STAGE_DATA.map((stage) => <option key={stage.id} value={stage.id}>{stage.label} {stage.title}</option>)}
                  </select>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-black text-slate-700">현재 상태</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([
                    ["active", "🟢 수강중"],
                    ["paused", "🟡 쉬는중"],
                    ["ended", "⚫ 종료"],
                  ] as const).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setNewStatus(value)} className={`rounded-xl px-2 py-2 text-xs font-black ${newStatus === value ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="text-sm font-black text-blue-800">26년 수강 분기</div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[1, 2, 3, 4].map((quarter) => {
                    const term = makeEnrollmentTerm(AFTER_SCHOOL_ACADEMIC_YEAR, quarter);
                    const checked = newEnrollmentTerms.includes(term);
                    return (
                      <label key={quarter} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-black ${checked ? "border-blue-400 bg-blue-100 text-blue-800" : "border-blue-100 bg-white text-slate-600"}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleNewQuarter(quarter)} className="h-4 w-4 accent-blue-600" />
                        {quarter}분기
                      </label>
                    );
                  })}
                </div>
              </div>

              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <input type="checkbox" checked={isNewSunLabMember} disabled={newProgram === "sun_lab"} onChange={(e) => setNewSunLabMember(e.target.checked)} className="mt-0.5 h-5 w-5 accent-emerald-600" />
                <span>
                  <span className="block text-sm font-black text-emerald-800">SUN LAB 회원</span>
                  <span className="mt-1 block text-[11px] font-bold leading-5 text-slate-500">회원으로 체크한 뒤 로그인·헬로메이플 정보는 SUN LAB 회원관리에서 입력합니다.</span>
                </span>
              </label>

              <button onClick={saveStudent} className="mt-4 w-full rounded-xl bg-yellow-500 px-4 py-3 font-black text-white">
                등록
              </button>
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
