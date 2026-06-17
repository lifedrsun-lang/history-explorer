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

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { STAGE_DATA } from "@/app/student/data/stageData";

import TeacherLogin from "./components/TeacherLogin";
import StudentCard from "./components/StudentCard";
import StudentEditModal from "./components/StudentEditModal";

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

  const [selectedStage, setSelectedStage] = useState(1);
  const [selectedSchool, setSelectedSchool] = useState("전체학교");
  const [selectedTab, setSelectedTab] = useState("A반");
  const [searchTerm, setSearchTerm] = useState("");

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

  const getTodayString = () => {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const makeHistoryItem = (item: any) => {
    return {
      id: `coin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: getTodayString(),
      createdAt: new Date(),
      ...item,
    };
  };

  const getNextCoinHistory = (student: any, item: any) => {
    const currentHistory = Array.isArray(student?.coinHistory)
      ? student.coinHistory
      : [];

    return [...currentHistory, makeHistoryItem(item)].slice(-100);
  };

  const getStudentRef = (student: any) => {
    return doc(db, "students", student.id);
  };

  // 학생 불러오기
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

  // 로그인
  const handleLogin = () => {
    if (passwordInput.trim() === "0713") {
      setAuthorized(true);

      localStorage.setItem("teacherAuth", "true");
      localStorage.setItem("teacherLoginTime", Date.now().toString());
    } else {
      alert("비밀번호가 틀렸습니다");
    }
  };

  // 학생 등록
  const saveStudent = async () => {
    if (!grade || !studentClass || !studentNumber || !name) {
      alert("학년 / 반 / 번호 / 이름을 입력해주세요!");
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

      isActive: true,

      coinHistory: [],
    });

    setSchool("");
    setGrade("");
    setStudentClass("");
    setStudentNumber("");
    setName("");
    setSelectedStage(1);

    alert(`학생 등록 완료!\n비밀번호 : ${password}`);

    fetchStudents();
  };

  // 기존 학생 비밀번호 생성
  const updateAllPasswords = async () => {
    const querySnapshot = await getDocs(collection(db, "students"));

    for (const studentDoc of querySnapshot.docs) {
      const data = studentDoc.data();

      const password = String(data.studentNumber || "").padStart(2, "0");

      await updateDoc(doc(db, "students", studentDoc.id), {
        password,
      });
    }

    alert("기존 학생 비밀번호 생성 완료!");

    fetchStudents();
  };

  // 수정 모달 열기
  const openEditModal = (student: any) => {
    setEditingStudent(student);
  };

  // 수정 모달 닫기
  const closeEditModal = () => {
    setEditingStudent(null);
  };

  // 퀴즈 / 과제 동엽전 지급
  const addBronzeBySource = async (student: any, source: "quiz" | "homework") => {
    const sourceLabel = source === "quiz" ? "퀴즈" : "과제";

    const newBronze = Number(student?.bronze || 0) + 1;
    const totalBronze = Number(student?.totalBronze || 0) + 1;

    const coinHistory = getNextCoinHistory(student, {
      type: "earn",
      currency: "bronze",
      amount: 1,
      source,
      text: `동엽전 1개 획득 (${sourceLabel})`,
    });

    await updateDoc(getStudentRef(student), {
      bronze: newBronze,
      totalBronze,
      coinHistory,
    });

    alert(`🎉 ${student.name} ${sourceLabel} 동엽전 지급 완료!`);

    fetchStudents();
  };

  const addQuizBronze = async (student: any) => {
    await addBronzeBySource(student, "quiz");
  };

  const addHomeworkBronze = async (student: any) => {
    await addBronzeBySource(student, "homework");
  };

  // 동엽전 10개 -> 은엽전 1개 교환
  const exchangeBronzeToSilver = async (student: any) => {
    const currentBronze = Number(student?.bronze || 0);
    const currentSilver = Number(student?.silver || 0);

    if (currentBronze < 10) {
      alert("동엽전이 10개 이상 있어야 은엽전으로 교환할 수 있습니다!");
      return;
    }

    const newBronze = currentBronze - 10;
    const newSilver = currentSilver + 1;
    const totalSilver = Number(student?.totalSilver || 0) + 1;

    const coinHistory = getNextCoinHistory(student, {
      type: "exchange",
      fromCurrency: "bronze",
      fromAmount: 10,
      toCurrency: "silver",
      toAmount: 1,
      text: "동엽전 10개를 은엽전 1개로 교환",
    });

    await updateDoc(getStudentRef(student), {
      bronze: newBronze,
      silver: newSilver,
      totalSilver,
      coinHistory,
    });

    alert(`🔄 ${student.name} 은엽전 교환 완료!`);

    fetchStudents();
  };

  // 은엽전 사용
  const useSilver = async (student: any) => {
    const currentSilver = Number(student?.silver || 0);

    if (currentSilver <= 0) {
      alert("은엽전이 부족합니다!");
      return;
    }

    const check = confirm(`${student.name} 학생의 은엽전 1개를 사용 처리할까요?`);

    if (!check) {
      return;
    }

    const coinHistory = getNextCoinHistory(student, {
      type: "use",
      currency: "silver",
      amount: 1,
      text: "은엽전 1개 사용",
    });

    await updateDoc(getStudentRef(student), {
      silver: currentSilver - 1,
      coinHistory,
    });

    alert(`🎁 ${student.name} 은엽전 사용 완료!`);

    fetchStudents();
  };

  // 진도 변경
  const changeStage = async (student: any, direction: number) => {
    let newStage = Number(student.stage || 1) + direction;

    if (newStage < 1) {
      newStage = 1;
    }

    if (newStage > STAGE_DATA.length) {
      newStage = STAGE_DATA.length;
    }

    await updateDoc(getStudentRef(student), {
      stage: newStage,
    });

    fetchStudents();
  };

  // 숨기기
  const toggleStudentVisible = async (student: any) => {
    await updateDoc(getStudentRef(student), {
      isActive: !student.isActive,
    });

    fetchStudents();
  };

  // 삭제
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

  const activeStudents = students
    .filter((student) => {
      if (student.isActive === false) {
        return false;
      }

      if (!isSameSchool(student)) {
        return false;
      }

      const keyword = searchTerm.toLowerCase().trim();

      if (keyword && !student.name?.toLowerCase().includes(keyword)) {
        return false;
      }

      const gradeNum = getGradeNumber(student.grade);

      if (selectedTab === "A반") {
        return gradeNum >= 1 && gradeNum <= 2;
      }

      return gradeNum >= 3;
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

  const hiddenStudents = students.filter((student) => student.isActive === false);

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
      return true;
    }

    return normalize(student.school || "미지정") === normalize(selectedSchool);
  });

  const aClassCount = countTargetStudents.filter((student) => {
    const gradeNum = getGradeNumber(student.grade);
    return gradeNum >= 1 && gradeNum <= 2;
  }).length;

  const bClassCount = countTargetStudents.filter((student) => {
    const gradeNum = getGradeNumber(student.grade);
    return gradeNum >= 3;
  }).length;

  // 로그인 화면
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
      <div className="max-w-7xl mx-auto">
        {/* 제목 */}
        <div className="bg-white rounded-3xl p-4 mb-4 shadow-md">
          <h1 className="text-3xl font-bold">
            🏫 역사 탐험 관리소
          </h1>

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

        {/* 학생 등록 */}
        <div className="bg-white rounded-3xl p-4 mb-4 shadow-md">
          <div className="text-xl font-bold mb-3">
            ✏️ 학생 등록
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
            <input
              type="text"
              placeholder="학교"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm"
            />

            <input
              type="text"
              placeholder="학년"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm"
            />

            <input
              type="text"
              placeholder="반"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm"
            />

            <input
              type="text"
              placeholder="번호"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm"
            />

            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm"
            />

            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(Number(e.target.value))}
              className="border rounded-xl px-3 py-2 text-sm"
            >
              {STAGE_DATA.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.short}
                </option>
              ))}
            </select>
          </div>

          {studentNumber && (
            <div className="text-sm text-blue-500 font-bold mb-3">
              자동 비밀번호: {String(studentNumber).padStart(2, "0")}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-2">
            <button
              onClick={saveStudent}
              className="bg-yellow-500 text-white rounded-xl px-4 py-2 font-bold"
            >
              🎉 학생 등록
            </button>

            <button
              onClick={updateAllPasswords}
              className="bg-green-500 text-white rounded-xl px-4 py-2 font-bold"
            >
              🔑 기존 학생 비밀번호 생성
            </button>
          </div>
        </div>

        {/* 학생 수 */}
        <div className="bg-white rounded-3xl p-4 mb-4 shadow-md">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-blue-50 rounded-2xl p-3">
              <div className="text-sm text-gray-500 mb-1">
                A반
              </div>

              <div className="text-2xl font-bold text-blue-600">
                {aClassCount}명
              </div>
            </div>

            <div className="bg-pink-50 rounded-2xl p-3">
              <div className="text-sm text-gray-500 mb-1">
                B반
              </div>

              <div className="text-2xl font-bold text-pink-600">
                {bClassCount}명
              </div>
            </div>

            <div className="bg-yellow-50 rounded-2xl p-3">
              <div className="text-sm text-gray-500 mb-1">
                전체
              </div>

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

        {/* 학생 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              addQuizBronze={addQuizBronze}
              addHomeworkBronze={addHomeworkBronze}
              exchangeBronzeToSilver={exchangeBronzeToSilver}
              useSilver={useSilver}
              changeStage={changeStage}
              toggleStudentVisible={toggleStudentVisible}
              deleteStudent={deleteStudent}
              openEditModal={openEditModal}
            />
          ))}
        </div>

        {/* 숨김 학생 */}
        {hiddenStudents.length > 0 && (
          <div className="mt-8">
            <div className="text-xl font-bold mb-3">
              🙈 숨김 친구 목록
            </div>

            <div className="flex flex-wrap gap-2">
              {hiddenStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => toggleStudentVisible(student)}
                  className="bg-gray-300 px-4 py-2 rounded-xl font-bold"
                >
                  {student.name} 복구
                </button>
              ))}
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