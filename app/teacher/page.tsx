"use client";

import { db } from "@/lib/firebase";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  DEFAULT_STAGE_ID,
  STAGE_DATA,
  getBookNumberFromStage,
  getStageIdForBook,
} from "@/app/student/data/stageData";
import {
  DEFAULT_STUDENT_PROGRAM,
  PROGRAM_FILTER_OPTIONS,
  STUDENT_PROGRAM_OPTIONS,
  StudentProgram,
  ProgramFilter,
  getStudentProgramValue,
  getStudentProgramLabel,
} from "@/lib/programs";

import TeacherLogin from "./components/TeacherLogin";
import StudentCard from "./components/StudentCard";
import StudentEditModal from "./components/StudentEditModal";

type CoinSource = "quiz" | "homework" | "bonus" | "making";

const TEACHING_CLASS_OPTIONS = ["A반", "B반"];
const LAST_STUDENT_REGISTRATION_KEY = "teacherLastStudentRegistration";

export default function TeacherPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const [students, setStudents] = useState<any[]>([]);

  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [name, setName] = useState("");
  const [studentTeachingClass, setStudentTeachingClass] =
    useState("A반");
  const [studentProgram, setStudentProgram] =
    useState<StudentProgram>(DEFAULT_STUDENT_PROGRAM);

  const [selectedStage, setSelectedStage] =
    useState(DEFAULT_STAGE_ID);
  const [bulkProgram, setBulkProgram] =
    useState<StudentProgram>(DEFAULT_STUDENT_PROGRAM);
  const [bulkSchool, setBulkSchool] = useState("");
  const [bulkClass, setBulkClass] = useState("");
  const [bulkStage, setBulkStage] =
    useState(DEFAULT_STAGE_ID);
  const [selectedSchool, setSelectedSchool] = useState("전체학교");
  const [selectedProgram, setSelectedProgram] =
    useState<ProgramFilter>("all");
  const [selectedTab, setSelectedTab] = useState("A반");
  const [searchTerm, setSearchTerm] = useState("");
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isBulkStageOpen, setIsBulkStageOpen] = useState(false);
  const [isHiddenManagerOpen, setIsHiddenManagerOpen] =
    useState(false);
  const [hiddenProgram, setHiddenProgram] =
    useState<ProgramFilter>("all");
  const [hiddenSchool, setHiddenSchool] = useState("전체학교");
  const [hiddenTeachingClass, setHiddenTeachingClass] =
    useState("전체반");
  const [hiddenSearchTerm, setHiddenSearchTerm] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [bonusStudent, setBonusStudent] = useState<any>(null);
  const [bonusAmount, setBonusAmount] = useState("1");

  const [editingStudent, setEditingStudent] = useState<any>(null);

  const normalize = (value: any) => {
    return String(value || "").trim();
  };

  const getGradeNumber = (value: any) => {
    const text = String(value || "").trim();
    const match = text.match(/\d+/);

    if (!match) {
      return 0;
    }

    return Number(match[0]);
  };

  const getTeachingClass = (student: any) => {
    const gradeNum = getGradeNumber(student?.grade);

    if (gradeNum >= 1 && gradeNum <= 2) {
      return "A반";
    }

    if (gradeNum >= 3 && gradeNum <= 6) {
      return "B반";
    }

    return "";
  };

  const isSameTeachingClass = (
    student: any,
    teachingClass: string
  ) => {
    return getTeachingClass(student) === teachingClass;
  };

  const rememberStudentRegistration = () => {
    localStorage.setItem(
      LAST_STUDENT_REGISTRATION_KEY,
      JSON.stringify({
        school,
        grade,
        studentClass,
        studentTeachingClass,
        studentProgram,
        selectedStage,
      })
    );
  };

  const showToast = (message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToastMessage(message);

    toastTimerRef.current = setTimeout(() => {
      setToastMessage("");
      toastTimerRef.current = null;
    }, 1800);
  };

  const getTodayString = () => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getSourceLabel = (source: CoinSource) => {
    if (source === "quiz") {
      return "퀴즈";
    }

    if (source === "homework") {
      return "과제";
    }

    if (source === "making") {
      return "만들기 완성";
    }

    return "선생님 보너스";
  };

  const makeHistoryItem = (item: any) => {
    return {
      id: `coin-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      date: getTodayString(),
      createdAt: new Date(),
      ...item,
    };
  };

  const getNextCoinHistory = (student: any, items: any[]) => {
    const currentHistory = Array.isArray(student?.coinHistory)
      ? student.coinHistory
      : [];

    const newItems = items.map((item) => makeHistoryItem(item));

    return [...currentHistory, ...newItems].slice(-100);
  };

  const getStudentRef = (student: any) => {
    return doc(db, "students", student.id);
  };

  const fetchStudents = async () => {
    const querySnapshot = await getDocs(collection(db, "students"));

    const studentList: any[] = [];

    querySnapshot.forEach((docItem) => {
      studentList.push({
        id: docItem.id,
        ...docItem.data(),
      });
    });

    setStudents(studentList);
  };

  useEffect(() => {
    fetchStudents();

    const savedRegistration = localStorage.getItem(
      LAST_STUDENT_REGISTRATION_KEY
    );

    if (savedRegistration) {
      try {
        const parsed = JSON.parse(savedRegistration);

        if (typeof parsed?.school === "string") {
          setSchool(parsed.school);
        }

        if (typeof parsed?.grade === "string") {
          setGrade(parsed.grade);
        }

        if (typeof parsed?.studentClass === "string") {
          setStudentClass(parsed.studentClass);
        }

        if (
          TEACHING_CLASS_OPTIONS.includes(
            parsed?.studentTeachingClass
          )
        ) {
          setStudentTeachingClass(parsed.studentTeachingClass);
        }

        if (
          STUDENT_PROGRAM_OPTIONS.some(
            (option) => option.value === parsed?.studentProgram
          )
        ) {
          setStudentProgram(parsed.studentProgram);
        }

        if (
          STAGE_DATA.some(
            (stage) => stage.id === parsed?.selectedStage
          )
        ) {
          setSelectedStage(parsed.selectedStage);
        }
      } catch {
        localStorage.removeItem(LAST_STUDENT_REGISTRATION_KEY);
      }
    }

    const savedAuth = localStorage.getItem("teacherAuth");
    const loginTime = localStorage.getItem("teacherLoginTime");

    if (savedAuth === "true" && loginTime) {
      const now = Date.now();
      const diff = now - Number(loginTime);

      if (diff < 1000 * 60 * 2) {
        setAuthorized(true);
      } else {
        localStorage.removeItem("teacherAuth");
        localStorage.removeItem("teacherLoginTime");
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleLogin = () => {
    if (passwordInput.trim() === "0713") {
      setAuthorized(true);

      localStorage.setItem("teacherAuth", "true");
      localStorage.setItem("teacherLoginTime", Date.now().toString());
    } else {
      alert("비밀번호가 틀렸습니다");
    }
  };

  const saveStudent = async (keepOpen = false) => {
    if (!grade || !studentClass || !studentNumber || !name) {
      alert("학년 / 실제 학교 반 / 번호 / 이름을 입력해주세요!");
      return;
    }

    const actualTeachingClass = getTeachingClass({ grade });

    if (actualTeachingClass !== studentTeachingClass) {
      alert(
        "수업반과 학년 기준이 맞지 않습니다.\nA반은 1~2학년, B반은 3~6학년 기준으로 등록해주세요."
      );
      return;
    }

    const password = String(studentNumber).padStart(2, "0");

    await addDoc(collection(db, "students"), {
      school: school || "미지정",
      grade,
      class: studentClass,
      studentNumber,
      password,
      name,

      bronze: 0,
      silver: 0,

      totalBronze: 0,
      totalSilver: 0,

      stage: selectedStage,
      program: studentProgram,
      isActive: true,

      coinHistory: [],
    });

    setStudentNumber("");
    setName("");

    rememberStudentRegistration();

    if (!keepOpen) {
      setIsStudentModalOpen(false);
    }

    alert(`학생 등록 완료!\n비밀번호 : ${password}`);

    fetchStudents();
  };

  const openEditModal = (student: any) => {
    setEditingStudent(student);
  };

  const closeEditModal = () => {
    setEditingStudent(null);
  };

  const addBronzeBySource = async (
    student: any,
    source: CoinSource,
    amount: number
  ) => {
    const sourceLabel = getSourceLabel(source);

    const currentBronze = Number(student?.bronze || 0);
    const currentSilver = Number(student?.silver || 0);

    const afterAddBronze = currentBronze + amount;

    const exchangeCount = Math.floor(afterAddBronze / 10);
    const newBronze = afterAddBronze % 10;
    const newSilver = currentSilver + exchangeCount;

    const totalBronze = Number(student?.totalBronze || 0) + amount;
    const totalSilver = Number(student?.totalSilver || 0) + exchangeCount;

    const historyItems: any[] = [
      {
        type: "earn",
        currency: "bronze",
        amount,
        source,
        text: `동엽전 ${amount}개 획득 (${sourceLabel})`,
      },
    ];

    if (exchangeCount > 0) {
      historyItems.push({
        type: "exchange",
        fromCurrency: "bronze",
        fromAmount: 10 * exchangeCount,
        toCurrency: "silver",
        toAmount: exchangeCount,
        text:
          exchangeCount === 1
            ? "동엽전 10개를 은엽전 1개로 자동 교환"
            : `동엽전 ${10 * exchangeCount}개를 은엽전 ${exchangeCount}개로 자동 교환`,
      });
    }

    const coinHistory = getNextCoinHistory(student, historyItems);

    await updateDoc(getStudentRef(student), {
      bronze: newBronze,
      silver: newSilver,
      totalBronze,
      totalSilver,
      coinHistory,
    });

    const coinToastMessage =
      exchangeCount > 0
        ? `🪙 동엽전 ${amount}개 지급 완료 · 은엽전 ${exchangeCount}개 자동 교환`
        : `🪙 동엽전 ${amount}개 지급 완료`;

    showToast(coinToastMessage);

    fetchStudents();
  };

  const addQuizBronze = async (student: any) => {
    await addBronzeBySource(student, "quiz", 1);
  };

  const addHomeworkBronze = async (student: any) => {
    await addBronzeBySource(student, "homework", 1);
  };

  const addMakingBronze = async (student: any) => {
    await addBronzeBySource(student, "making", 1);
  };

  const addBonusBronze = async (student: any) => {
    setBonusStudent(student);
    setBonusAmount("1");
  };

  const closeBonusModal = () => {
    setBonusStudent(null);
    setBonusAmount("1");
  };

  const submitBonusBronze = async () => {
    if (!bonusStudent) {
      return;
    }

    const amount = Number(bonusAmount);

    if (!Number.isInteger(amount) || amount <= 0) {
      showToast("1개 이상의 숫자로 입력해주세요");
      return;
    }

    if (amount > 50) {
      showToast("한 번에 최대 50개까지만 지급할 수 있습니다");
      return;
    }

    await addBronzeBySource(bonusStudent, "bonus", amount);

    closeBonusModal();
  };

  // 기존 StudentCard 호환용
  const addBronze = async (student: any) => {
    await addQuizBronze(student);
  };

  // 기존 StudentCard 호환용
  const removeBronze = async (student: any) => {
    const currentBronze = Number(student?.bronze || 0);

    if (currentBronze <= 0) {
      showToast("회수할 동엽전이 없습니다");
      return;
    }

    const coinHistory = getNextCoinHistory(student, [
      {
        type: "adjust",
        currency: "bronze",
        amount: 1,
        text: "동엽전 1개 회수",
      },
    ]);

    await updateDoc(getStudentRef(student), {
      bronze: currentBronze - 1,
      totalBronze: Math.max(Number(student?.totalBronze || 0) - 1, 0),
      coinHistory,
    });

    showToast("동엽전 1개 회수 완료");

    fetchStudents();
  };

  const useSilver = async (student: any) => {
    const currentSilver = Number(student?.silver || 0);

    if (currentSilver <= 0) {
      showToast("은엽전이 부족합니다");
      return;
    }

    const coinHistory = getNextCoinHistory(student, [
      {
        type: "use",
        currency: "silver",
        amount: 1,
        text: "은엽전 1개 사용",
      },
    ]);

    await updateDoc(getStudentRef(student), {
      silver: currentSilver - 1,
      coinHistory,
    });

    showToast("은엽전 1개 사용 완료");

    fetchStudents();
  };

  const changeStage = async (student: any, direction: number) => {
    let newBookNumber =
      getBookNumberFromStage(student?.stage) +
      direction;

    if (newBookNumber < 1) {
      newBookNumber = 1;
    }

    if (newBookNumber > STAGE_DATA.length) {
      newBookNumber = STAGE_DATA.length;
    }

    await updateDoc(getStudentRef(student), {
      stage: getStageIdForBook(newBookNumber),
    });

    fetchStudents();
  };

  const toggleStudentVisible = async (student: any) => {
    await updateDoc(getStudentRef(student), {
      isActive: !student.isActive,
    });

    fetchStudents();
  };

  const deleteStudent = async (student: any) => {
    const check = confirm(`${student.name} 학생을 삭제할까요?`);

    if (!check) {
      return;
    }

    await deleteDoc(getStudentRef(student));

    fetchStudents();
  };

  const isSameSchool = (student: any) => {
    const studentSchool = normalize(student.school || "미지정");

    if (selectedSchool === "전체학교") {
      return true;
    }

    return studentSchool === normalize(selectedSchool);
  };

  const isSameProgram = (student: any) => {
    if (selectedProgram === "all") {
      return true;
    }

    return (
      getStudentProgramValue(student?.program) ===
      selectedProgram
    );
  };

  const isStudentInProgram = (
    student: any,
    program: StudentProgram
  ) => {
    return (
      getStudentProgramValue(student?.program) ===
      program
    );
  };

  const isStudentInProgramFilter = (
    student: any,
    program: ProgramFilter
  ) => {
    if (program === "all") {
      return true;
    }

    return (
      getStudentProgramValue(student?.program) ===
      program
    );
  };

  const getProgramOrder = (student: any) => {
    const program = getStudentProgramValue(student?.program);
    const index = STUDENT_PROGRAM_OPTIONS.findIndex(
      (option) => option.value === program
    );

    return index === -1 ? STUDENT_PROGRAM_OPTIONS.length : index;
  };

  const bulkProgramStudents = students.filter(
    (student) =>
      isStudentInProgram(student, bulkProgram)
  );

  const bulkSchoolList = Array.from(
    new Set(
      bulkProgramStudents
        .map((student) =>
          normalize(student.school || "미지정")
        )
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const bulkClassList = TEACHING_CLASS_OPTIONS;

  const bulkTargetStudents = students.filter(
    (student) => {
      if (student.isActive === false) {
        return false;
      }

      if (!isStudentInProgram(student, bulkProgram)) {
        return false;
      }

      if (
        normalize(student.school || "미지정") !==
        normalize(bulkSchool)
      ) {
        return false;
      }

      return isSameTeachingClass(student, bulkClass);
    }
  );

  const selectedBulkStage =
    STAGE_DATA.find(
      (stage) => stage.id === bulkStage
    ) || STAGE_DATA[0];

  const changeBulkStage = async () => {
    if (bulkProgram !== DEFAULT_STUDENT_PROGRAM) {
      alert("현재 진도 일괄 변경은 별꼼역사만 지원합니다.");
      return;
    }

    if (!bulkSchool || !bulkClass || !selectedBulkStage) {
      alert("프로그램, 학교, 반, 변경할 권을 모두 선택해주세요.");
      return;
    }

    if (bulkTargetStudents.length === 0) {
      alert("변경할 학생이 없습니다.");
      return;
    }

    const programLabel =
      getStudentProgramLabel(bulkProgram);
    const classLabel = bulkClass;

    const check = confirm(
      `${programLabel} ${bulkSchool} ${classLabel} 학생 ${bulkTargetStudents.length}명의 진도를 ${selectedBulkStage.label}으로 변경할까요?`
    );

    if (!check) {
      return;
    }

    const studentsToUpdate =
      bulkTargetStudents.filter(
        (student) =>
          String(student?.stage || "") !==
          selectedBulkStage.id
      );

    for (const student of studentsToUpdate) {
      await updateDoc(getStudentRef(student), {
        stage: selectedBulkStage.id,
      });
    }

    alert(
      `${studentsToUpdate.length}명의 진도를 ${selectedBulkStage.label}으로 변경했습니다.`
    );

    fetchStudents();
  };

  const activeStudents = students
    .filter((student) => {
      if (student.isActive === false) {
        return false;
      }

      if (!isSameSchool(student)) {
        return false;
      }

      if (!isSameProgram(student)) {
        return false;
      }

      const keyword = searchTerm.toLowerCase().trim();

      if (keyword && !student.name?.toLowerCase().includes(keyword)) {
        return false;
      }

      return isSameTeachingClass(student, selectedTab);
    })
    .sort((a, b) => {
      const gradeA = getGradeNumber(a.grade);
      const gradeB = getGradeNumber(b.grade);

      if (gradeA !== gradeB) {
        return gradeA - gradeB;
      }

      const classA = Number(a.class) || 0;
      const classB = Number(b.class) || 0;

      if (classA !== classB) {
        return classA - classB;
      }

      const numberA = Number(a.studentNumber) || 0;
      const numberB = Number(b.studentNumber) || 0;

      return numberA - numberB;
    });

  const allHiddenStudents = students.filter((student) => {
    return student.isActive === false;
  });

  const hiddenSchoolList = [
    "전체학교",
    ...Array.from(
      new Set(
        allHiddenStudents
          .filter((student) =>
            isStudentInProgramFilter(student, hiddenProgram)
          )
          .map((student) => student.school || "미지정")
      )
    ).sort((a, b) => a.localeCompare(b)),
  ];

  const hiddenStudents = allHiddenStudents
    .filter((student) => {
      if (!isStudentInProgramFilter(student, hiddenProgram)) {
        return false;
      }

      if (
        hiddenSchool !== "전체학교" &&
        normalize(student.school || "미지정") !== normalize(hiddenSchool)
      ) {
        return false;
      }

      if (
        hiddenTeachingClass !== "전체반" &&
        !isSameTeachingClass(student, hiddenTeachingClass)
      ) {
        return false;
      }

      const keyword = hiddenSearchTerm.toLowerCase().trim();

      if (keyword && !student.name?.toLowerCase().includes(keyword)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const programA = getProgramOrder(a);
      const programB = getProgramOrder(b);

      if (programA !== programB) {
        return programA - programB;
      }

      const schoolA = normalize(a.school || "미지정");
      const schoolB = normalize(b.school || "미지정");

      if (schoolA !== schoolB) {
        return schoolA.localeCompare(schoolB);
      }

      const teachingClassA = getTeachingClass(a);
      const teachingClassB = getTeachingClass(b);

      if (teachingClassA !== teachingClassB) {
        return teachingClassA.localeCompare(teachingClassB);
      }

      const gradeA = getGradeNumber(a.grade);
      const gradeB = getGradeNumber(b.grade);

      if (gradeA !== gradeB) {
        return gradeA - gradeB;
      }

      const numberA = Number(a.studentNumber) || 0;
      const numberB = Number(b.studentNumber) || 0;

      if (numberA !== numberB) {
        return numberA - numberB;
      }

      return normalize(a.name || "").localeCompare(normalize(b.name || ""));
    });

  const schoolList = [
    "전체학교",
    ...Array.from(
      new Set(
        students.map((student) => {
          return student.school || "미지정";
        })
      )
    ),
  ];

  const countTargetStudents = students.filter((student) => {
    if (student.isActive === false) {
      return false;
    }

    if (selectedSchool === "전체학교") {
      return isSameProgram(student);
    }

    return (
      normalize(student.school || "미지정") === normalize(selectedSchool) &&
      isSameProgram(student)
    );
  });

  const aClassCount = countTargetStudents.filter((student) => {
    return isSameTeachingClass(student, "A반");
  }).length;

  const bClassCount = countTargetStudents.filter((student) => {
    return isSameTeachingClass(student, "B반");
  }).length;

  if (!authorized) {
    return (
      <TeacherLogin
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f5f7fb] p-3">
      {toastMessage && (
        <div
          aria-live="polite"
          className="fixed left-1/2 top-4 z-[70] w-[calc(100%-24px)] max-w-sm -translate-x-1/2 rounded-2xl border border-yellow-100 bg-white/95 px-4 py-3 text-center text-sm font-black text-slate-800 shadow-xl"
        >
          {toastMessage}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* 제목 */}
        <div className="bg-white rounded-3xl p-4 mb-4 shadow-md">
          <h1 className="text-3xl font-bold">🏫 역사 탐험 관리소</h1>

          <p className="text-gray-500 mt-1 text-sm">
            학생 탐험 현황 관리
          </p>

          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                const previousMap = localStorage.getItem("previousMap");

                if (previousMap) {
                  router.push(previousMap);
                } else {
                  router.push("/");
                }
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold"
            >
              🏝 맵으로 돌아가기
            </button>
          </div>
        </div>

        {/* 학생 수 */}
        <div className="bg-white rounded-3xl p-4 mb-4 shadow-md">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-blue-50 rounded-2xl p-3">
              <div className="text-sm text-gray-500 mb-1">A반</div>
              <div className="text-2xl font-bold text-blue-600">
                {aClassCount}명
              </div>
            </div>

            <div className="bg-pink-50 rounded-2xl p-3">
              <div className="text-sm text-gray-500 mb-1">B반</div>
              <div className="text-2xl font-bold text-pink-600">
                {bClassCount}명
              </div>
            </div>

            <div className="bg-yellow-50 rounded-2xl p-3">
              <div className="text-sm text-gray-500 mb-1">전체</div>
              <div className="text-2xl font-bold text-yellow-600">
                {countTargetStudents.length}명
              </div>
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-3xl p-4 mb-4 shadow-md">
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="border rounded-xl px-4 py-2"
            >
              {schoolList.map((schoolName, index) => (
                <option key={`${schoolName}-${index}`} value={schoolName}>
                  {schoolName}
                </option>
              ))}
            </select>

            <select
              value={selectedProgram}
              onChange={(e) =>
                setSelectedProgram(
                  e.target.value as ProgramFilter
                )
              }
              className="border rounded-xl px-4 py-2"
            >
              {PROGRAM_FILTER_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="학생 이름 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded-xl px-4 py-2"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTab("A반")}
                className={`px-4 py-2 rounded-xl font-bold ${
                  selectedTab === "A반"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200"
                }`}
              >
                🌙 A반
              </button>

              <button
                onClick={() => setSelectedTab("B반")}
                className={`px-4 py-2 rounded-xl font-bold ${
                  selectedTab === "B반"
                    ? "bg-pink-500 text-white"
                    : "bg-gray-200"
                }`}
              >
                ⭐ B반
              </button>
            </div>
          </div>
        </div>

        {/* 관리 도구 */}
        <div className="bg-white rounded-3xl p-3 mb-4 shadow-md">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsStudentModalOpen(true)}
              className="bg-yellow-500 text-white rounded-xl px-4 py-2 text-sm font-bold"
            >
              ➕ 신규 학생 등록
            </button>

            <button
              onClick={() =>
                setIsBulkStageOpen((current) => !current)
              }
              className="bg-indigo-500 text-white rounded-xl px-4 py-2 text-sm font-bold"
            >
              📚 반 전체 진도 변경
            </button>
          </div>

          {isBulkStageOpen && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                <select
                  value={bulkProgram}
                  onChange={(e) => {
                    setBulkProgram(e.target.value as StudentProgram);
                    setBulkSchool("");
                    setBulkClass("");
                  }}
                  className="border rounded-xl px-3 py-2 text-sm"
                >
                  {STUDENT_PROGRAM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={bulkSchool}
                  onChange={(e) => {
                    setBulkSchool(e.target.value);
                    setBulkClass("");
                  }}
                  className="border rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">학교 선택</option>
                  {bulkSchoolList.map((schoolName) => (
                    <option key={schoolName} value={schoolName}>
                      {schoolName}
                    </option>
                  ))}
                </select>

                <select
                  value={bulkClass}
                  onChange={(e) => setBulkClass(e.target.value)}
                  className="border rounded-xl px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  disabled={!bulkSchool}
                >
                  <option value="">A반/B반 선택</option>
                  {bulkClassList.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>

                <select
                  value={bulkStage}
                  onChange={(e) => setBulkStage(e.target.value)}
                  className="border rounded-xl px-3 py-2 text-sm"
                >
                  {STAGE_DATA.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.label} {stage.title}
                    </option>
                  ))}
                </select>
              </div>

              {bulkProgram !== DEFAULT_STUDENT_PROGRAM && (
                <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                  현재 진도 일괄 변경은 별꼼역사만 지원합니다.
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <button
                  onClick={changeBulkStage}
                  className="bg-indigo-500 text-white rounded-xl px-4 py-2 font-bold"
                >
                  선택한 반 진도 변경
                </button>

                <div className="text-xs text-gray-500 leading-relaxed">
                  숨김 학생은 제외되며, 조건에 맞는 활성 학생{" "}
                  {bulkTargetStudents.length}명이 대상입니다.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 학생 목록 */}
        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 xl:gap-4 items-start">
          {activeStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              addBronze={addBronze}
              removeBronze={removeBronze}
              addQuizBronze={addQuizBronze}
              addHomeworkBronze={addHomeworkBronze}
              addMakingBronze={addMakingBronze}
              addBonusBronze={addBonusBronze}
              useSilver={useSilver}
              changeStage={changeStage}
              toggleStudentVisible={toggleStudentVisible}
              deleteStudent={deleteStudent}
              openEditModal={openEditModal}
            />
          ))}
        </div>

        {/* 숨김 친구 관리 */}
        {allHiddenStudents.length > 0 && (
          <div className="mt-8 bg-white rounded-3xl p-4 shadow-md">
            <button
              onClick={() =>
                setIsHiddenManagerOpen((current) => !current)
              }
              className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-left font-black text-slate-800"
            >
              🙈 숨김 친구 관리 ({allHiddenStudents.length}명)
            </button>

            {isHiddenManagerOpen && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
                  <select
                    value={hiddenProgram}
                    onChange={(e) => {
                      setHiddenProgram(e.target.value as ProgramFilter);
                      setHiddenSchool("전체학교");
                    }}
                    className="border rounded-xl px-3 py-2 text-sm"
                  >
                    {PROGRAM_FILTER_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={hiddenSchool}
                    onChange={(e) => setHiddenSchool(e.target.value)}
                    className="border rounded-xl px-3 py-2 text-sm"
                  >
                    {hiddenSchoolList.map((schoolName) => (
                      <option key={schoolName} value={schoolName}>
                        {schoolName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={hiddenTeachingClass}
                    onChange={(e) =>
                      setHiddenTeachingClass(e.target.value)
                    }
                    className="border rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="전체반">전체반</option>
                    {TEACHING_CLASS_OPTIONS.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="숨김 친구 이름 검색"
                    value={hiddenSearchTerm}
                    onChange={(e) => setHiddenSearchTerm(e.target.value)}
                    className="border rounded-xl px-3 py-2 text-sm"
                  />
                </div>

                {hiddenStudents.length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 px-4 py-4 text-sm font-bold text-gray-500">
                    조건에 맞는 숨김 친구가 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {hiddenStudents.map((student) => {
                      const schoolName = student.school || "미지정";
                      const programLabel = getStudentProgramLabel(
                        getStudentProgramValue(student?.program)
                      );
                      const teachingClass =
                        getTeachingClass(student) || "미분류";
                      const studentName = student.name || "이름 없음";

                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                        >
                          <div className="min-w-0 text-sm font-bold text-slate-700">
                            <div className="truncate">
                              {schoolName} / {programLabel} /{" "}
                              {teachingClass}
                            </div>
                            <div className="truncate text-xs font-medium text-slate-500">
                              {student.grade}학년 {student.class}반{" "}
                              {student.studentNumber}번 / {studentName}
                            </div>
                          </div>

                          <button
                            onClick={() => toggleStudentVisible(student)}
                            className="shrink-0 rounded-xl bg-blue-500 px-3 py-2 text-sm font-bold text-white"
                          >
                            복구
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 보너스 동엽전 지급 모달 */}
        {bonusStudent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitBonusBronze();
              }}
              className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
            >
              <div className="text-2xl font-black text-slate-800">
                보너스 동엽전 지급
              </div>

              <div className="mt-2 text-sm font-bold text-slate-500">
                지급할 동엽전 개수를 입력해 주세요.
              </div>

              <label className="mt-5 block text-sm font-bold text-slate-700">
                동엽전 개수
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={bonusAmount}
                  onChange={(event) =>
                    setBonusAmount(event.target.value)
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-base font-bold"
                  autoFocus
                />
              </label>

              <div className="mt-3 rounded-2xl bg-yellow-50 px-3 py-2 text-xs font-bold text-yellow-700">
                입력한 개수만큼 동엽전이 지급됩니다.
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeBonusModal}
                  className="rounded-xl bg-gray-100 px-4 py-2 font-bold text-gray-700"
                >
                  취소
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-yellow-500 px-4 py-2 font-bold text-white"
                >
                  지급
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 신규 학생 등록 모달 */}
        {isStudentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-3">
            <div className="w-full max-w-3xl max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-2xl font-black">
                    ➕ 신규 학생 등록
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    같은 학교와 반은 유지하고 여러 명을 이어서 등록할 수 있습니다.
                  </div>
                </div>

                <button
                  onClick={() => setIsStudentModalOpen(false)}
                  className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700"
                >
                  닫기
                </button>
              </div>

              <div className="rounded-2xl border border-yellow-100 bg-yellow-50/70 p-4 mb-4">
                <div className="font-black text-yellow-800 mb-3">
                  공통 정보
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm font-bold text-gray-700">
                    프로그램
                    <select
                      value={studentProgram}
                      onChange={(e) =>
                        setStudentProgram(
                          e.target.value as StudentProgram
                        )
                      }
                      className="mt-1 w-full border rounded-xl px-3 py-2 text-sm bg-white"
                    >
                      {STUDENT_PROGRAM_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="text-sm font-bold text-gray-700">
                    학교
                    <input
                      type="text"
                      list="teacher-school-options"
                      placeholder="학교"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="mt-1 w-full border rounded-xl px-3 py-2 text-sm bg-white"
                    />
                  </label>

                  <label className="text-sm font-bold text-gray-700">
                    수업반
                    <select
                      value={studentTeachingClass}
                      onChange={(e) => {
                        const nextClass = e.target.value;

                        setStudentTeachingClass(nextClass);

                        if (!grade) {
                          setGrade(nextClass === "A반" ? "1" : "3");
                        }
                      }}
                      className="mt-1 w-full border rounded-xl px-3 py-2 text-sm bg-white"
                    >
                      {TEACHING_CLASS_OPTIONS.map((className) => (
                        <option key={className} value={className}>
                          {className}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-bold text-gray-700">
                    시작 진도
                    <select
                      value={selectedStage}
                      onChange={(e) =>
                        setSelectedStage(e.target.value)
                      }
                      className="mt-1 w-full border rounded-xl px-3 py-2 text-sm bg-white"
                    >
                      {STAGE_DATA.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.label} {stage.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                <div className="font-black text-sky-800 mb-3">
                  학생 정보
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <label className="text-sm font-bold text-gray-700 md:col-span-2">
                    이름
                    <input
                      type="text"
                      placeholder="이름"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full border rounded-xl px-3 py-2 text-sm bg-white"
                    />
                  </label>

                  <label className="text-sm font-bold text-gray-700">
                    학년
                    <input
                      type="text"
                      placeholder="학년"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="mt-1 w-full border rounded-xl px-3 py-2 text-sm bg-white"
                    />
                  </label>

                  <label className="text-sm font-bold text-gray-700">
                    실제 학교 반
                    <input
                      type="text"
                      placeholder="반"
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      className="mt-1 w-full border rounded-xl px-3 py-2 text-sm bg-white"
                    />
                  </label>

                  <label className="text-sm font-bold text-gray-700">
                    번호
                    <input
                      type="text"
                      placeholder="번호"
                      value={studentNumber}
                      onChange={(e) => setStudentNumber(e.target.value)}
                      className="mt-1 w-full border rounded-xl px-3 py-2 text-sm bg-white"
                    />
                  </label>
                </div>

                {studentNumber && (
                  <div className="mt-3 text-sm font-bold text-blue-600">
                    자동 비밀번호:{" "}
                    {String(studentNumber).padStart(2, "0")}
                  </div>
                )}
              </div>

              <datalist id="teacher-school-options">
                {schoolList
                  .filter((schoolName) => schoolName !== "전체학교")
                  .map((schoolName) => (
                    <option key={schoolName} value={schoolName} />
                  ))}
              </datalist>

              <div className="mt-4 flex flex-col md:flex-row justify-end gap-2">
                <button
                  onClick={() => saveStudent(true)}
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-white"
                >
                  계속 등록
                </button>

                <button
                  onClick={() => saveStudent(false)}
                  className="rounded-xl bg-yellow-500 px-4 py-2 font-bold text-white"
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 수정 모달 */}
        {editingStudent && (
          <StudentEditModal
            student={editingStudent}
            onClose={closeEditModal}
            refreshStudents={fetchStudents}
          />
        )}
      </div>
    </div>
  );
}
